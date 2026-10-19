// Configuration module types (mirror §4.19)

export interface Organization {
  id: number;
  name: string;
  code: string;
  logo: string | null;
  primary_color: string;
  report_footer: string;
  address: string;
  phone: string;
  email: string;
  timezone: string;
  currency: string;
  is_active: boolean;
}

export interface OrganizationSettings {
  id: number;
  appointment_window_days: number;
  slot_minutes: number;
  block_severe_prescriptions: boolean;
  auto_issue_invoice_on_checkout: boolean;
  currency: string;
  date_format: string;
  notification_prefs: Record<string, unknown>;
  clinical_defaults: Record<string, unknown>;
  billing_defaults: Record<string, unknown>;
}

export type ImportJobStatus = 'UPLOADED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface ImportError {
  row?: number;
  error?: string;
}

export interface ImportJob {
  id: number;
  kind: string;
  file: string;
  status: ImportJobStatus;
  summary: Record<string, unknown> | null;
  errors: ImportError[] | string[] | null;
  processed_by: number | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export type ImportKind = 'patients' | 'medications' | 'services' | 'tests';

export const IMPORT_KINDS: ImportKind[] = ['patients', 'medications', 'services', 'tests'];
