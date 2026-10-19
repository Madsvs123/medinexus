// Tasks module types (mirror §4.14)

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';

export interface UserRef {
  id: number;
  first_name: string;
  last_name: string;
  email?: string;
  role?: string;
}

export const userName = (u?: UserRef | number | null): string => {
  if (!u) return 'Unassigned';
  if (typeof u === 'number') return `User #${u}`;
  return `${u.first_name} ${u.last_name}`.trim() || u.email || `User #${u.id}`;
};

export interface Task {
  id: number;
  title: string;
  description: string;
  assignee: UserRef | number | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  related_type: string;
  related_id: number | null;
  completed_at: string | null;
  created_at: string;
}

export interface TaskListParams {
  page?: number;
  page_size?: number;
  assignee?: number | string;
  status?: string;
  priority?: string;
}
