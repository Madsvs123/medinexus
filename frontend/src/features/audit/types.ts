// Audit module types (mirror §4.13)

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'EXPORT' | 'OTHER';

export const AUDIT_ACTIONS: AuditAction[] = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'EXPORT', 'OTHER'];

export interface UserRef {
  id: number;
  first_name: string;
  last_name: string;
  email?: string;
}

export const userName = (u?: UserRef | number | null): string => {
  if (!u) return 'System';
  if (typeof u === 'number') return `User #${u}`;
  return `${u.first_name} ${u.last_name}`.trim() || u.email || `User #${u.id}`;
};

export interface AuditLog {
  id: number;
  actor: UserRef | number | null;
  action: AuditAction | string;
  resource_type: string;
  resource_id: number | null;
  details: Record<string, unknown> | null;
  ip_address: string;
  created_at: string;
}

export interface AuditLogParams {
  page?: number;
  page_size?: number;
  actor?: string;
  action?: string;
  resource_type?: string;
  from?: string;
  to?: string;
}
