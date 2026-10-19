// Reports & analytics types (mirror §4.17)

export interface AnalyticsRange {
  from?: string;
  to?: string;
}

export interface AppointmentsAnalytics {
  total: number;
  by_status: Record<string, number>;
  by_day: Array<{ date: string; count: number }>;
  avg_wait_minutes: number | null;
}

export interface RevenueAnalytics {
  total: number | string;
  by_day: Array<{ date: string; total: number | string }>;
  by_category: Record<string, number | string>;
  outstanding: number | string;
}

export interface ClinicalAnalytics {
  encounters: number;
  top_diagnoses: Array<{ name: string; count: number }>;
  admissions: number;
  avg_length_of_stay_days: number | null;
}

export interface LaboratoryAnalytics {
  orders: number;
  completed: number;
  abnormal_rate: number;
  critical_count: number;
  avg_turnaround_hours: number | null;
}

export interface PharmacyAnalytics {
  dispensations: number;
  revenue: number | string;
  low_stock_count: number;
  expiring_soon_count: number;
}

export type ReportStatus = 'PENDING' | 'READY' | 'FAILED';
export type ReportKind = 'patients' | 'invoices' | 'payments' | 'lab_results' | 'dispensation';

export const REPORT_KINDS: ReportKind[] = ['patients', 'invoices', 'payments', 'lab_results', 'dispensation'];

export interface GeneratedReport {
  id: number;
  kind: ReportKind;
  title: string;
  params: Record<string, unknown>;
  file: string | null;
  status: ReportStatus;
  generated_by: number | null;
  generated_at: string | null;
}
