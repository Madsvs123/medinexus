"""Laboratory domain services: flag computation and branded PDF reports."""

import logging
from decimal import Decimal, InvalidOperation
from io import BytesIO

from django.core.files.base import ContentFile
from django.utils import timezone

logger = logging.getLogger(__name__)

FLAG_NORMAL = "NORMAL"
FLAG_ABNORMAL = "ABNORMAL"
FLAG_CRITICAL = "CRITICAL"


def compute_flag(test, value):
    """Compute NORMAL / ABNORMAL / CRITICAL for a result value.

    Numeric values are compared against the test's reference range:
    - within [low, high]            → NORMAL
    - outside the range             → ABNORMAL
    - beyond 25% outside the range  → CRITICAL

    Non-numeric values (e.g. "Positive") have no auto flag and stay NORMAL;
    callers may override the flag explicitly.
    """
    if test is None or value is None or str(value).strip() == "":
        return FLAG_NORMAL
    try:
        num = Decimal(str(value))
    except (InvalidOperation, ValueError):
        return FLAG_NORMAL

    low = test.ref_range_low
    high = test.ref_range_high
    if low is None and high is None:
        return FLAG_NORMAL

    if low is not None and num < low:
        return FLAG_CRITICAL if num < low * Decimal("0.75") else FLAG_ABNORMAL
    if high is not None and num > high:
        return FLAG_CRITICAL if num > high * Decimal("1.25") else FLAG_ABNORMAL
    return FLAG_NORMAL


def _patient_name(order):
    patient = order.patient
    return getattr(patient, "full_name", None) or (
        f"{patient.first_name} {patient.last_name}".strip() or f"Patient #{patient.pk}"
    )


def build_order_pdf(order, generated_by=None):
    """Generate a branded PDF report for a lab order and persist a LabReport.

    Branding comes from the order's Organization: name, ``primary_color`` and
    ``report_footer``. Returns the created :class:`LabReport`.
    """
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import (
        Paragraph,
        SimpleDocTemplate,
        Spacer,
        Table,
        TableStyle,
    )

    from .models import LabReport

    organization = order.organization
    primary_hex = organization.primary_color or "#0B6E4F"
    try:
        primary = colors.HexColor(primary_hex)
    except Exception:  # pragma: no cover - malformed color config
        primary = colors.HexColor("#0B6E4F")

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=20 * mm,
        title=f"Laboratory Report - Order #{order.pk}",
        author=organization.name,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "OrgTitle",
        parent=styles["Title"],
        textColor=primary,
        fontSize=20,
        spaceAfter=2,
    )
    subtitle_style = ParagraphStyle(
        "OrgSubtitle",
        parent=styles["Normal"],
        textColor=colors.HexColor("#475569"),
        fontSize=10,
        alignment=TA_CENTER,
        spaceAfter=10,
    )
    h2 = ParagraphStyle(
        "H2", parent=styles["Heading2"], textColor=primary, fontSize=12, spaceBefore=10
    )
    small = ParagraphStyle(
        "Small", parent=styles["Normal"], fontSize=9, leading=12
    )

    story = []
    story.append(Paragraph(organization.name, title_style))
    story.append(Paragraph("Laboratory Report", subtitle_style))
    story.append(
        Table(
            [
                ["Order #", f"#{order.pk}"],
                ["Priority", order.get_priority_display()],
                ["Status", order.get_status_display()],
                ["Ordered at", timezone.localtime(order.ordered_at).strftime("%Y-%m-%d %H:%M")],
                ["Patient", _patient_name(order)],
                ["MRN", getattr(order.patient, "mrn", "") or ""],
                ["Ordered by", str(order.ordered_by or "")],
            ],
            colWidths=[40 * mm, None],
            style=TableStyle(
                [
                    ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                    ("TOPPADDING", (0, 0), (-1, -1), 3),
                ]
            ),
        )
    )
    story.append(Spacer(1, 6 * mm))

    results = list(order.results.select_related("test").order_by("test__name"))
    if results:
        story.append(Paragraph("Results", h2))
        header = ["Test", "Value", "Unit", "Ref. range", "Flag", "Status"]
        rows = [header]
        flag_colors = {
            "NORMAL": "#16A34A",
            "ABNORMAL": "#D97706",
            "CRITICAL": "#DC2626",
        }
        for result in results:
            ref = ""
            if result.test.ref_range_low is not None or result.test.ref_range_high is not None:
                low = result.test.ref_range_low if result.test.ref_range_low is not None else "-∞"
                high = result.test.ref_range_high if result.test.ref_range_high is not None else "∞"
                ref = f"{low} - {high}"
            rows.append(
                [
                    result.test.name,
                    result.value,
                    result.unit or result.test.unit or "",
                    ref,
                    result.flag,
                    result.get_status_display(),
                ]
            )
        table = Table(rows, repeatRows=1)
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), primary),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ]
            )
        )
        # Color the flag cells.
        for idx, result in enumerate(results, start=1):
            color = flag_colors.get(result.flag)
            if color:
                table.setStyle(
                    TableStyle(
                        [("TEXTCOLOR", (4, idx), (4, idx), colors.HexColor(color))]
                    )
                )
        story.append(table)
    else:
        story.append(Paragraph("No results recorded for this order yet.", h2))

    if order.notes:
        story.append(Paragraph("Notes", h2))
        story.append(Paragraph(order.notes, styles["BodyText"]))

    footer_text = (organization.report_footer or "").strip()
    if footer_text:
        story.append(Spacer(1, 10 * mm))
        story.append(Paragraph(footer_text, small))

    doc.build(story)

    report, created = LabReport.objects.get_or_create(
        organization=organization,
        order=order,
        defaults={
            "generated_by": generated_by,
        },
    )
    filename = f"lab_report_order_{order.pk}.pdf"
    report.file.save(filename, ContentFile(buffer.getvalue()), save=True)
    report.generated_by = generated_by or report.generated_by
    report.save(update_fields=["generated_by", "updated_at"])
    return report
