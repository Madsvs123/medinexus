// Forms module types (mirror §4.16)

export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'multiselect' | 'checkbox';

export interface FormFieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
  placeholder?: string;
}

export interface FormTemplate {
  id: number;
  name: string;
  category: string;
  schema: FormFieldDef[];
  active: boolean;
  created_at: string;
}

export type SubmissionStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface PatientRef {
  id: number;
  mrn: string;
  first_name: string;
  last_name: string;
  full_name?: string;
}

export const patientLabel = (p?: PatientRef | number | null): string => {
  if (!p) return '—';
  if (typeof p === 'number') return `Patient #${p}`;
  return p.full_name ?? (`${p.first_name} ${p.last_name}`.trim() || p.mrn);
};

export interface UserRef {
  id: number;
  first_name: string;
  last_name: string;
  email?: string;
}

export const userName = (u?: UserRef | number | null): string => {
  if (!u) return '—';
  if (typeof u === 'number') return `User #${u}`;
  return `${u.first_name} ${u.last_name}`.trim() || u.email || `User #${u.id}`;
};

export interface FormSubmission {
  id: number;
  template: number | FormTemplate;
  patient: PatientRef | number | null;
  encounter: number | null;
  data: Record<string, unknown>;
  status: SubmissionStatus;
  submitted_by: UserRef | number | null;
  submitted_at: string | null;
  reviewed_by: UserRef | number | null;
  created_at: string;
}

export const templateName = (t?: FormSubmission['template'] | null): string => {
  if (!t) return '—';
  if (typeof t === 'number') return `Template #${t}`;
  return t.name;
};
