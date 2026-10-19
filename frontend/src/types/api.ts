export type Role =
  | 'ADMIN'
  | 'DOCTOR'
  | 'NURSE'
  | 'PHARMACIST'
  | 'LAB_TECH'
  | 'RADIOLOGIST'
  | 'RECEPTIONIST'
  | 'BILLING'
  | 'PATIENT';

export interface ApiError {
  detail?: string;
  [field: string]: string | string[] | undefined;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface OrganizationRef {
  id: number;
  name: string;
  code: string;
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  phone: string | null;
  is_email_verified: boolean;
  is_active: boolean;
  organization: OrganizationRef | null;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface TokenRefreshResponse {
  access: string;
  refresh?: string;
}

export const isApiError = (err: unknown): err is { data?: ApiError; status?: number } =>
  typeof err === 'object' && err !== null && 'data' in err;

export function apiErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (typeof err === 'object' && err !== null && 'data' in err) {
    const data = (err as { data: unknown }).data;
    if (typeof data === 'string') return data;
    if (data && typeof data === 'object') {
      const record = data as Record<string, unknown>;
      if (typeof record.detail === 'string') return record.detail;
      const first = Object.values(record)[0];
      if (Array.isArray(first)) return String(first[0]);
      if (typeof first === 'string') return first;
    }
  }
  if (typeof err === 'object' && err !== null && 'error' in err) {
    return String((err as { error: unknown }).error);
  }
  return fallback;
}
