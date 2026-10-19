// Messaging module types (mirror §4.12 serializers)

export interface UserRef {
  id: number;
  first_name: string;
  last_name: string;
  email?: string;
  role?: string;
  avatar?: string | null;
}

export const userName = (u?: UserRef | number | null): string => {
  if (!u) return 'Unknown';
  if (typeof u === 'number') return `User #${u}`;
  return `${u.first_name} ${u.last_name}`.trim() || u.email || `User #${u.id}`;
};

export interface Thread {
  id: number;
  title: string;
  participants: UserRef[];
  created_by: number | UserRef;
  last_message_at: string | null;
  unread_count?: number;
  last_message?: { id: number; body: string; sender_name?: string; sent_at: string } | null;
}

export interface ChatMessage {
  id: number;
  thread: number;
  sender: number | UserRef;
  body: string;
  attachment: string | null;
  sent_at: string;
  read_by: number[];
}

export interface ThreadListParams {
  page?: number;
  page_size?: number;
}

export interface MessagesParams {
  threadId: number;
  before?: string;
  page_size?: number;
}
