"""Full demo dataset for MediNexus.

Usage::

    python manage.py seed_demo [--org MH] [--password demo1234] [--force]

Idempotent: skips organization creation when it already exists unless
``--force`` is given (force deletes tenant-scoped demo data for the org).
"""

from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

User = get_user_model()

# Cross-app imports are wrapped so the command degrades gracefully while
# sibling apps are still being built by other agents.
try:
    from apps.organizations.models import Branch, Department, Organization, Specialty
except ImportError:  # pragma: no cover
    Branch = Department = Organization = Specialty = None

try:
    from apps.patients.models import ConsentRecord, EmergencyContact, Patient, PatientAllergy, PatientCondition
except ImportError:  # pragma: no cover
    ConsentRecord = EmergencyContact = Patient = PatientAllergy = PatientCondition = None

try:
    from apps.pharmacy.models import DrugInteraction, Medication, MedicationBatch, Supplier
except ImportError:  # pragma: no cover
    DrugInteraction = Medication = MedicationBatch = Supplier = None

try:
    from apps.laboratory.models import LabOrder, LabResult, LabTest, LabSample
except ImportError:  # pragma: no cover
    LabOrder = LabResult = LabTest = LabSample = None

try:
    from apps.billing.models import (
        InsuranceClaim,
        InsurancePlan,
        Invoice,
        InvoiceItem,
        PatientInsurance,
        Payment,
        Service,
    )
except ImportError:  # pragma: no cover
    InsuranceClaim = InsurancePlan = Invoice = InvoiceItem = PatientInsurance = Payment = Service = None

try:
    from apps.inpatient.models import Admission, Bed, InpatientRoom, Ward
except ImportError:  # pragma: no cover
    Admission = Bed = InpatientRoom = Ward = None

try:
    from apps.radiology.models import RadiologyOrder
except ImportError:  # pragma: no cover
    RadiologyOrder = None

try:
    from apps.appointments.models import Appointment, Availability, Room
except ImportError:  # pragma: no cover
    Appointment = Availability = Room = None

try:
    from apps.clinical.models import (
        ClinicalNote,
        Diagnosis,
        Encounter,
        Prescription,
        TreatmentPlan,
        VitalSigns,
    )
except ImportError:  # pragma: no cover
    ClinicalNote = Diagnosis = Encounter = Prescription = TreatmentPlan = VitalSigns = None


class Command(BaseCommand):
    help = "Seed a full demo dataset for MediNexus."

    def add_arguments(self, parser):
        parser.add_argument("--org", default="MH", help="Organization code (default: MH)")
        parser.add_argument("--password", default="demo1234", help="Password for demo users")
        parser.add_argument("--force", action="store_true", help="Recreate demo data even if org exists")

    def handle(self, *args, **options):
        self.password = options["password"]
        self.force = options["force"]

        if Organization is None:
            self.stderr.write("organizations app not available yet — nothing to seed.")
            return

        org = Organization.objects.filter(code=options["org"].upper()).first()
        if org is not None and not self.force:
            self.stdout.write(self.style.WARNING(f"Organization {org.code} already exists — skipping (use --force to reseed)."))
            return

        if org is not None and self.force:
            self._force_delete_org(org)
            self.stdout.write(f"Deleted existing organization {options['org'].upper()}.")

        org = Organization.objects.create(
            name="Mercy Health",
            code=options["org"].upper(),
            primary_color="#0B6E4F",
            report_footer="Mercy Health — Caring for our community.",
            address="12 Nile Street, Cairo",
            phone="+20 2 1234 5678",
            email="info@mercyhealth.dev",
            timezone="Africa/Cairo",
            currency="EGP",
            is_active=True,
        )
        self.stdout.write(f"Created organization {org.code} ({org.name}).")

        self.create_org_structure(org)
        self.create_insurance(org)
        self.create_users(org)
        self.create_patients(org)
        self.create_pharmacy(org)
        self.create_laboratory(org)
        self.create_billing(org)
        self.create_inpatient(org)
        self.create_appointments(org)
        self.create_clinical(org)
        self.create_admission_and_orders(org)
        self.create_invoice_and_claim(org)

        self.stdout.write(self.style.SUCCESS(f"Demo seed complete for {org.code}. "
                                             f"Login: admin@medinexus.dev / {self.password}"))

    # ------------------------------------------------------------------ #

    def create_org_structure(self, org):
        if Branch is None:
            return
        main = Branch.objects.create(organization=org, name="Main Campus", code="MAIN", address="12 Nile Street", phone="+20 2 1234 5678")
        north = Branch.objects.create(organization=org, name="North Clinic", code="NORTH", address="3 North Ring Road", phone="+20 2 8765 4321")
        self.branches = {"main": main, "north": north}

        deps = {
            "cardiology": ("Cardiology", "CARD"),
            "internal": ("Internal Medicine", "INT"),
            "pediatrics": ("Pediatrics", "PED"),
            "emergency": ("Emergency", "ER"),
            "laboratory": ("Laboratory", "LAB"),
            "radiology": ("Radiology", "RAD"),
            "pharmacy": ("Pharmacy", "PHARM"),
        }
        self.departments = {}
        for key, (name, code) in deps.items():
            self.departments[key] = Department.objects.create(
                organization=org, name=name, code=code, branch=main, description=f"{name} department", is_active=True
            )

        specialties = [
            ("Interventional Cardiology", "ICARD"),
            ("Endocrinology", "ENDO"),
            ("Pediatric Care", "PEDC"),
            ("Emergency Medicine", "EMMED"),
            ("Radiology & Imaging", "RIMG"),
            ("General Practice", "GP"),
        ]
        for name, code in specialties:
            Specialty.objects.create(organization=org, name=name, code=code, is_active=True)

    def create_insurance(self, org):
        if InsurancePlan is None:
            return
        for name, carrier, pct in [
            ("Basic Plan", "National Insurance", 70),
            ("Premium Plan", "MercyCare", 90),
            ("Corporate Plan", "Acme Health", 80),
        ]:
            InsurancePlan.objects.create(organization=org, name=name, carrier=carrier, coverage_percentage=pct, active=True)
        self.stdout.write("Created insurance plans (3).")

    def create_users(self, org):
        admin = User.objects.create_superuser(
            email="admin@medinexus.dev", password=self.password, first_name="Admin", last_name="MediNexus"
        )
        org_admin = self._staff(org, "orgadmin@medinexus.dev", User.ADMIN, "Org", "Admin")

        self.staff = {
            "doctor": self._staff(org, "doctor@medinexus.dev", User.DOCTOR, "Hana", "Doctor"),
            "nurse": self._staff(org, "nurse@medinexus.dev", User.NURSE, "Nadia", "Nurse"),
            "pharmacist": self._staff(org, "pharmacist@medinexus.dev", User.PHARMACIST, "Omar", "Pharma"),
            "lab_tech": self._staff(org, "labtech@medinexus.dev", User.LAB_TECH, "Layla", "LabTech"),
            "radiologist": self._staff(org, "radiologist@medinexus.dev", User.RADIOLOGIST, "Rami", "Radio"),
            "receptionist": self._staff(org, "receptionist@medinexus.dev", User.RECEPTIONIST, "Reem", "Reception"),
            "billing": self._staff(org, "billing@medinexus.dev", User.BILLING, "Bilal", "Billing"),
        }

        self.patient_users = []
        for i, name in enumerate(["Ahmed", "Mona", "Sara", "Youssef"], start=1):
            u = self._staff(org, f"patient{i}@medinexus.dev", User.PATIENT, name, "Patient")
            u.is_email_verified = True
            u.save(update_fields=["is_email_verified"])
            self.patient_users.append(u)
        admin.organization = org
        admin.save(update_fields=["organization"])

    def _force_delete_org(self, org):
        """Delete tenant-scoped rows for the org in dependency-safe order.

        Several models use ``on_delete=PROTECT`` (prescriptions, invoices,
        payments, claims, patient enrollments), so a plain ``org.delete()``
        raises ProtectedError. Delete children first, leaves last.
        """
        from apps.billing.models import (
            Deposit,
            InsuranceClaim,
            InvoiceItem,
            Invoice,
            PatientInsurance,
            Payment,
            Refund,
            Service,
        )
        from apps.clinical.models import Prescription
        from apps.forms.models import FormSubmission, FormTemplate
        from apps.inpatient.models import MedicationAdministration
        from apps.laboratory.models import LabReport, LabResult, LabSample, LabOrder
        from apps.pharmacy.models import (
            Dispensation,
            MedicationBatch,
            Medication,
            StockReturn,
            StockTransfer,
        )
        from apps.radiology.models import RadiologyReport, RadiologyOrder

        # Leaf rows first (children of protected parents).
        InvoiceItem.objects.all_orgs().filter(organization=org).delete()
        LabResult.objects.all_orgs().filter(organization=org).delete()
        LabSample.objects.all_orgs().filter(organization=org).delete()
        LabReport.objects.all_orgs().filter(organization=org).delete()
        RadiologyReport.objects.all_orgs().filter(organization=org).delete()
        Dispensation.objects.all_orgs().filter(organization=org).delete()
        MedicationAdministration.objects.all_orgs().filter(organization=org).delete()
        Prescription.objects.all_orgs().filter(organization=org).delete()
        StockReturn.objects.all_orgs().filter(organization=org).delete()
        StockTransfer.objects.all_orgs().filter(organization=org).delete()
        MedicationBatch.objects.all_orgs().filter(organization=org).delete()
        InsuranceClaim.objects.all_orgs().filter(organization=org).delete()
        PatientInsurance.objects.all_orgs().filter(organization=org).delete()
        Payment.objects.all_orgs().filter(organization=org).delete()
        Refund.objects.all_orgs().filter(organization=org).delete()
        Deposit.objects.all_orgs().filter(organization=org).delete()
        Invoice.objects.all_orgs().filter(organization=org).delete()
        FormSubmission.objects.all_orgs().filter(organization=org).delete()
        FormTemplate.objects.all_orgs().filter(organization=org).delete()
        LabOrder.objects.all_orgs().filter(organization=org).delete()
        RadiologyOrder.objects.all_orgs().filter(organization=org).delete()
        Medication.objects.all_orgs().filter(organization=org).delete()
        Service.objects.all_orgs().filter(organization=org).delete()
        # Demo users survive org deletion via SET_NULL — remove them explicitly.
        demo_emails = [
            "admin@medinexus.dev", "orgadmin@medinexus.dev", "doctor@medinexus.dev", "nurse@medinexus.dev",
            "pharmacist@medinexus.dev", "labtech@medinexus.dev", "radiologist@medinexus.dev",
            "receptionist@medinexus.dev", "billing@medinexus.dev",
        ] + [f"patient{i}@medinexus.dev" for i in range(1, 5)]
        User.objects.filter(email__in=demo_emails).delete()
        # Everything else is CASCADE — drop the org itself last.
        org.delete()

    def _staff(self, org, email, role, first, last):
        u = User.objects.create_user(
            email=email,
            password=self.password,
            first_name=first,
            last_name=last,
            role=role,
            organization=org,
            is_email_verified=True,
            phone="+20 100 000 0000",
        )
        return u

    def create_patients(self, org):
        if Patient is None:
            return
        self.patients = []
        data = [
            ("Ahmed", "Hassan", "1985-03-12", "MALE", "A+", "O+", 0),
            ("Mona", "Ibrahim", "1992-07-25", "FEMALE", "B+", "B+", 1),
            ("Sara", "Mahmoud", "2018-11-02", "FEMALE", "O-", "A+", 2),
            ("Youssef", "Farouk", "1978-01-30", "MALE", "AB+", "AB+", 3),
            ("Fatima", "Ali", "1965-09-14", "FEMALE", "A-", "O-", None),
            ("Khaled", "Mostafa", "1999-05-21", "MALE", "O+", "A+", None),
        ]
        for i, (first, last, dob, gender, blood, allergen, user_idx) in enumerate(data, start=1):
            p = Patient.objects.create(
                organization=org,
                user=self.patient_users[user_idx] if user_idx is not None else None,
                first_name=first,
                last_name=last,
                date_of_birth=date.fromisoformat(dob),
                gender=gender,
                blood_type=blood,
                phone=f"+20 10 0000 {i:04d}",
                email=f"{first.lower()}.{last.lower()}@mail.dev",
                address=f"{10 + i} Demo Street",
                city="Cairo",
                nationality="Egyptian",
                marital_status="MARRIED" if i % 2 else "SINGLE",
                occupation=["Engineer", "Teacher", "Student", "Retired", "Housewife", "Accountant"][i - 1],
                status="ACTIVE",
                notes="Demo patient.",
            )
            if allergen:
                PatientAllergy.objects.create(organization=org, patient=p, allergen=allergen, severity="MILD", reaction="Mild rash")
            PatientCondition.objects.create(organization=org, patient=p, name="Hypertension", icd_code="I10", diagnosed_date=date(2020, 1, 15), status="ACTIVE")
            EmergencyContact.objects.create(organization=org, patient=p, name=f"{last} Family", relation="Spouse", phone="+20 11 111 1111")
            ConsentRecord.objects.create(organization=org, patient=p, type="TREATMENT", description="General treatment consent", signed_by=first, status="SIGNED")
            if PatientInsurance is not None:
                plan = InsurancePlan.objects.filter(organization=org).first()
                if plan:
                    PatientInsurance.objects.create(
                        organization=org, patient=p, plan=plan, policy_number=f"POL-{1000 + i}",
                        coverage_percentage=80, is_primary=True,
                    )
            self.patients.append(p)
        self.stdout.write(f"Created {len(self.patients)} patients.")

    def create_pharmacy(self, org):
        if Medication is None:
            return
        meds = [
            ("PARA500", "Paracetamol", "Acetaminophen", "ANALGESIC", "TABLET", "500mg", "tablet", 5.00, 100, 500),
            ("AMOX500", "Amoxicillin", "Amoxicillin", "ANTIBIOTIC", "CAPSULE", "500mg", "capsule", 12.00, 50, 300),
            ("IBU400", "Ibuprofen", "Ibuprofen", "ANALGESIC", "TABLET", "400mg", "tablet", 8.00, 80, 400),
            ("METF500", "Metformin", "Metformin HCl", "DIABETES", "TABLET", "500mg", "tablet", 6.50, 60, 350),
            ("ATEN50", "Atenolol", "Atenolol", "CARDIOVASCULAR", "TABLET", "50mg", "tablet", 9.00, 70, 250),
            ("SALB100", "Salbutamol", "Albuterol", "RESPIRATORY", "INHALER", "100mcg", "dose", 45.00, 30, 120),
            ("OMEP20", "Omeprazole", "Omeprazole", "GASTRO", "CAPSULE", "20mg", "capsule", 15.00, 40, 280),
            ("CIPRO500", "Ciprofloxacin", "Ciprofloxacin", "ANTIBIOTIC", "TABLET", "500mg", "tablet", 18.00, 45, 200),
            ("GLIB5", "Glibenclamide", "Glyburide", "DIABETES", "TABLET", "5mg", "tablet", 7.50, 55, 220),
            ("LOS50", "Losartan", "Losartan", "CARDIOVASCULAR", "TABLET", "50mg", "tablet", 11.00, 65, 240),
            ("DIAZ5", "Diazepam", "Diazepam", "NEURO", "TABLET", "5mg", "tablet", 10.00, 35, 150),
            ("AMLO5", "Amlodipine", "Amlodipine", "CARDIOVASCULAR", "TABLET", "5mg", "tablet", 13.00, 75, 260),
        ]
        self.medications = {}
        for code, name, generic, cat, form, strength, unit, price, stock, reorder in meds:
            self.medications[code] = Medication.objects.create(
                organization=org, code=code, name=name, generic_name=generic, category=cat,
                form=form, strength=strength, unit=unit, price=price, reorder_level=reorder,
                current_stock=stock, is_controlled=code in ("DIAZ5",), active=True,
            )

        suppliers = [
            ("PharmaLink Co.", "Karim Said", "+20 12 000 0001", "sales@pharmalink.dev", "10 Industrial Zone"),
            ("MedSupply Egypt", "Dina Adel", "+20 12 000 0002", "orders@medsupply.dev", "5 Free Zone"),
            ("Global Medics", "Tarek Nabil", "+20 12 000 0003", "contact@globalmedics.dev", "22 Logistics Hub"),
        ]
        for name, contact, phone, email, addr in suppliers:
            Supplier.objects.create(organization=org, name=name, contact_person=contact, phone=phone, email=email, address=addr, is_active=True)

        today = timezone.localdate()
        codes = list(self.medications.keys())
        for i in range(1, 13):
            med = self.medications[codes[(i - 1) % len(codes)]]
            expiry = today + timedelta(days=30 * i)
            if i % 4 == 0:
                expiry = today + timedelta(days=45)  # expiring soon
            MedicationBatch.objects.create(
                organization=org, medication=med, batch_no=f"BATCH-{2026}-{i:03d}",
                quantity=med.current_stock // 2, expiry_date=expiry,
                received_date=today - timedelta(days=30), unit_cost=med.price * 0.7,
            )

        DrugInteraction.objects.create(
            organization=org, medication_a=self.medications["PARA500"], medication_b=self.medications["CIPRO500"],
            severity="MODERATE", description="May increase risk of liver toxicity.",
        )
        DrugInteraction.objects.create(
            organization=org, medication_a=self.medications["METF500"], medication_b=self.medications["GLIB5"],
            severity="SEVERE", description="Additive hypoglycemia risk.",
        )
        DrugInteraction.objects.create(
            organization=org, medication_a=self.medications["ATEN50"], medication_b=self.medications["AMLO5"],
            severity="MILD", description="Additive hypotensive effect.",
        )
        self.stdout.write("Created pharmacy catalog (12 meds, 3 suppliers, batches, 3 interactions).")

    def create_laboratory(self, org):
        if LabTest is None:
            return
        tests = [
            ("CBC", "Complete Blood Count", "HEMATOLOGY", "BLOOD", "10^9/L", 4.0, 11.0, 60.00),
            ("GLU", "Fasting Blood Glucose", "BIOCHEMISTRY", "BLOOD", "mg/dL", 70.0, 110.0, 40.00),
            ("LIPID", "Lipid Panel", "BIOCHEMISTRY", "BLOOD", "mg/dL", 0.0, 200.0, 90.00),
            ("LFT", "Liver Function Test", "BIOCHEMISTRY", "BLOOD", "U/L", 7.0, 56.0, 110.00),
            ("RFT", "Renal Function Test", "BIOCHEMISTRY", "BLOOD", "mg/dL", 0.6, 1.3, 100.00),
            ("URINE", "Urinalysis", "URINALYSIS", "URINE", "", 0.0, 0.0, 35.00),
            ("TSH", "Thyroid Stimulating Hormone", "IMMUNOLOGY", "BLOOD", "mIU/L", 0.4, 4.0, 130.00),
            ("BLOODSUGAR", "HbA1c", "BIOCHEMISTRY", "BLOOD", "%", 4.0, 5.6, 80.00),
            ("CRP", "C-Reactive Protein", "IMMUNOLOGY", "BLOOD", "mg/L", 0.0, 5.0, 70.00),
            ("BLOODCULT", "Blood Culture", "MICROBIOLOGY", "BLOOD", "", 0.0, 0.0, 150.00),
        ]
        self.lab_tests = {}
        for code, name, cat, sample, unit, lo, hi, price in tests:
            self.lab_tests[code] = LabTest.objects.create(
                organization=org, code=code, name=name, category=cat, sample_type=sample,
                unit=unit, ref_range_low=lo, ref_range_high=hi, price=price, active=True,
            )
        self.stdout.write(f"Created {len(tests)} lab tests.")

    def create_billing(self, org):
        if Service is None:
            return
        services = [
            ("CONS-GP", "General Consultation", "CONSULTATION", 150.00),
            ("CONS-CARD", "Cardiology Consultation", "CONSULTATION", 350.00),
            ("CONS-PED", "Pediatric Consultation", "CONSULTATION", 200.00),
            ("PROC-ECG", "ECG", "PROCEDURE", 120.00),
            ("PROC-SUTURE", "Wound Suturing", "PROCEDURE", 400.00),
            ("PROC-INFUS", "IV Infusion", "PROCEDURE", 250.00),
            ("LAB-CBC", "Complete Blood Count", "LABORATORY", 60.00),
            ("LAB-GLU", "Fasting Glucose", "LABORATORY", 40.00),
            ("LAB-LFT", "Liver Function Test", "LABORATORY", 110.00),
            ("RAD-XRAY", "Chest X-Ray", "RADIOLOGY", 180.00),
            ("RAD-US", "Abdominal Ultrasound", "RADIOLOGY", 450.00),
            ("PHARM-DISP", "Medication Dispensing", "PHARMACY", 25.00),
            ("INP-DAY", "Inpatient Day Charge", "INPATIENT", 900.00),
            ("INP-ICU", "ICU Day Charge", "INPATIENT", 2500.00),
            ("MISC-ADMIN", "Administrative Fee", "OTHER", 50.00),
        ]
        for code, name, cat, price in services:
            Service.objects.create(organization=org, code=code, name=name, category=cat, price=price, tax_rate=0, active=True)
        self.stdout.write("Created billing services (15).")

    def create_inpatient(self, org):
        if Ward is None:
            return
        ward_map = [
            ("General Ward", "internal", "Building A, Floor 2"),
            ("ICU", "emergency", "Building A, Floor 1"),
        ]
        self.beds = []
        for wname, dep_key, location in ward_map:
            ward = Ward.objects.create(organization=org, name=wname, department=self.departments[dep_key], location=location, is_active=True)
            for r in range(1, 5):
                room = InpatientRoom.objects.create(
                    organization=org, ward=ward, room_number=f"{r:02d}",
                    room_type="ICU" if wname == "ICU" else ("PRIVATE" if r == 1 else "GENERAL"), is_active=True,
                )
                for b in range(1, 3):
                    bed = Bed.objects.create(
                        organization=org, room=room, bed_number=f"{room.room_number}-{b}",
                        status="AVAILABLE", notes="",
                    )
                    self.beds.append(bed)
        self.stdout.write("Created 2 wards, 4 rooms each, 8 beds total.")

    def create_appointments(self, org):
        if Appointment is None:
            return
        today = timezone.localdate()
        patients = self.patients[:4]
        doctor = self.staff["doctor"]
        dept = self.departments["cardiology"]

        Availability.objects.create(
            organization=org, doctor=doctor, department=dept, weekday=today.weekday(),
            start_time=time(9, 0), end_time=time(17, 0), slot_minutes=30, buffer_minutes=5,
            valid_from=today, valid_until=None, is_active=True,
        )
        if Room is not None:
            room = Room.objects.create(organization=org, name="Consultation 1", department=dept, type="CONSULTATION", status="AVAILABLE")
        else:
            room = None

        self.appointments = []
        for idx, patient in enumerate(patients):
            base = datetime.combine(today + timedelta(days=idx // 2), time(10, 0))
            start = timezone.make_aware(base + timedelta(minutes=30 * (idx % 2)))
            appt = Appointment.objects.create(
                organization=org, patient=patient, doctor=doctor, department=dept,
                room=room, start=start, end=start + timedelta(minutes=30),
                type="CONSULTATION", status="CONFIRMED" if idx < 3 else "SCHEDULED",
                reason="Routine check-up", notes="Demo appointment.",
            )
            self.appointments.append(appt)
        self.stdout.write(f"Created {len(self.appointments)} sample appointments.")

    def create_clinical(self, org):
        if Encounter is None:
            return
        doctor = self.staff["doctor"]
        dept = self.departments["cardiology"]
        today = timezone.localdate()
        self.encounters = []
        for idx, patient in enumerate(self.patients[:2]):
            enc = Encounter.objects.create(
                organization=org, patient=patient, doctor=doctor, department=dept,
                type="OUTPATIENT", status="COMPLETED" if idx == 0 else "OPEN",
                started_at=timezone.make_aware(datetime.combine(today, time(9, 30))),
                ended_at=timezone.make_aware(datetime.combine(today, time(10, 0))) if idx == 0 else None,
                chief_complaint="Chest discomfort and fatigue",
                history_presenting_illness="Onset two weeks ago, worse on exertion.",
                assessment="Likely angina; monitor blood pressure.",
                plan="Prescribed medication; follow up in 2 weeks.",
            )
            VitalSigns.objects.create(
                organization=org, encounter=enc, recorded_at=enc.started_at,
                bp_systolic=150, bp_diastolic=95, heart_rate=88, respiratory_rate=18,
                temperature=37.1, spo2=97, weight_kg=82, height_cm=176,
            )
            Diagnosis.objects.create(organization=org, encounter=enc, name="Hypertension", icd_code="I10", type="PRIMARY", status="ACTIVE")
            ClinicalNote.objects.create(
                organization=org, encounter=enc, author=doctor, note_type="PROGRESS",
                content="Patient improving; continue current regimen.", is_signed=True, signed_at=timezone.now(),
            )
            TreatmentPlan.objects.create(
                organization=org, encounter=enc, title="BP Management", instructions="Take medication daily, reduce salt.",
                goals="BP < 130/85", status="ACTIVE",
            )
            if Prescription is not None and Medication is not None:
                Prescription.objects.create(
                    organization=org, encounter=enc, medication=self.medications["ATEN50"],
                    dosage="50mg", frequency="1x daily", route="ORAL", duration_days=14,
                    instructions="Morning dose", status="ACTIVE", refills=1, warnings=[],
                )
            self.encounters.append(enc)
        self.stdout.write(f"Created {len(self.encounters)} encounters with vitals/diagnoses/notes/prescriptions.")

    def create_admission_and_orders(self, org):
        if Admission is None or LabOrder is None:
            return
        doctor = self.staff["doctor"]
        lab_tech = self.staff["lab_tech"]
        patient = self.patients[1]
        bed = next(b for b in self.beds if b.status == "AVAILABLE")
        bed.status = "OCCUPIED"
        bed.save(update_fields=["status"])

        admission = Admission.objects.create(
            organization=org, patient=patient, bed=bed, admitted_by=doctor,
            admitted_at=timezone.now(), expected_discharge_date=timezone.localdate() + timedelta(days=3),
            admission_type="ELECTIVE", diagnosis_on_admission="Unstable angina", status="ACTIVE",
        )

        order = LabOrder.objects.create(
            organization=org, patient=patient, encounter=self.encounters[0],
            priority="ROUTINE", status="COMPLETED", ordered_by=doctor,
            ordered_at=timezone.now(), notes="Routine panel.",
        )
        for code in ("CBC", "GLU", "LFT"):
            order.tests.add(self.lab_tests[code])
            LabSample.objects.create(
                organization=org, order=order, test=self.lab_tests[code],
                collected_by=lab_tech,
                collected_at=timezone.now(), status="RECEIVED",
            )
            LabResult.objects.create(
                organization=org, order=order, test=self.lab_tests[code],
                value="5.2" if code == "CBC" else ("95" if code == "GLU" else "35"),
                unit=self.lab_tests[code].unit, flag="NORMAL", status="APPROVED",
                reviewed_by=lab_tech, reviewed_at=timezone.now(),
            )
        order.result_reported_at = timezone.now()
        order.save(update_fields=["result_reported_at"])

        if RadiologyOrder is not None:
            RadiologyOrder.objects.create(
                organization=org, patient=patient, encounter=self.encounters[0],
                modality="XRAY", body_part="Chest", clinical_indication="Cough and fever",
                priority="ROUTINE", status="ORDERED", ordered_by=doctor,
                ordered_at=timezone.now(), notes="Demo radiology order.",
            )
        self.stdout.write("Created 1 admission and 1 completed lab order with approved results.")

    def create_invoice_and_claim(self, org):
        if Invoice is None:
            return
        billing_user = self.staff["billing"]
        patient = self.patients[0]
        enc = self.encounters[0]
        service_cons = Service.objects.filter(organization=org, code="CONS-CARD").first()
        service_lab = Service.objects.filter(organization=org, code="LAB-CBC").first()

        invoice = Invoice.objects.create(
            organization=org, patient=patient, encounter=enc,
            invoice_number=f"INV-{timezone.now().year}-{1001}",
            subtotal=0, discount_total=0, tax_total=0, total=0, paid_amount=0,
            status="ISSUED", issued_at=timezone.now(), due_date=timezone.localdate() + timedelta(days=14),
            notes="Demo invoice.",
        )
        if service_cons:
            InvoiceItem.objects.create(
                organization=org, invoice=invoice, service=service_cons, quantity=1,
                unit_price=service_cons.price, discount=0, tax=0,
            )
        if service_lab:
            InvoiceItem.objects.create(
                organization=org, invoice=invoice, service=service_lab, quantity=1,
                unit_price=service_lab.price, discount=0, tax=0,
            )
        items = invoice.invoice_items.all()
        subtotal = sum(i.unit_price * i.quantity - i.discount for i in items)
        invoice.subtotal = subtotal
        invoice.total = subtotal
        invoice.save(update_fields=["subtotal", "total"])

        if InsuranceClaim is not None:
            p_ins = PatientInsurance.objects.filter(organization=org, patient=patient).first()
            if p_ins:
                InsuranceClaim.objects.create(
                    organization=org, invoice=invoice, patient_insurance=p_ins,
                    claim_number=f"CLM-{timezone.now().year}-{1001}",
                    submitted_amount=invoice.total * (p_ins.coverage_percentage / 100),
                    approved_amount=None, status="DRAFT", notes="Demo claim.",
                )
        Payment.objects.create(
            organization=org, invoice=invoice, patient=patient, amount=invoice.total * Decimal("0.2"),
            method="CASH", status="COMPLETED", paid_at=timezone.now(), received_by=billing_user,
        )
        invoice.paid_amount = invoice.total * Decimal("0.2")
        invoice.status = "PARTIAL"
        invoice.save(update_fields=["paid_amount", "status"])
        self.stdout.write("Created 1 invoice (partial payment) and 1 claim.")
