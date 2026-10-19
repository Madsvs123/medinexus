import dayjs, { type Dayjs } from 'dayjs';

export function formatDate(value: string | Date | Dayjs | null | undefined, pattern = 'MMM D, YYYY'): string {
  if (!value) return '—';
  const d = dayjs(value);
  return d.isValid() ? d.format(pattern) : '—';
}

export function formatDateTime(
  value: string | Date | Dayjs | null | undefined,
  pattern = 'MMM D, YYYY h:mm A',
): string {
  if (!value) return '—';
  const d = dayjs(value);
  return d.isValid() ? d.format(pattern) : '—';
}

export function formatTime(value: string | Date | Dayjs | null | undefined, pattern = 'h:mm A'): string {
  if (!value) return '—';
  const d = dayjs(value);
  return d.isValid() ? d.format(pattern) : '—';
}

const currencyFormatters = new Map<string, Intl.NumberFormat>();

export function formatCurrency(
  value: number | string | null | undefined,
  currency = 'USD',
  locales = 'en-US',
): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(num)) return '—';
  let formatter = currencyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locales, { style: 'currency', currency });
    currencyFormatters.set(currency, formatter);
  }
  return formatter.format(num);
}

export function formatNumber(value: number | string | null | undefined, digits = 0): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(num)) return '—';
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(num);
}

export function formatFullName(first?: string | null, last?: string | null): string {
  return [first, last].filter(Boolean).join(' ') || '—';
}

export function initialsOf(first?: string | null, last?: string | null): string {
  const f = first?.trim()?.[0] ?? '';
  const l = last?.trim()?.[0] ?? '';
  return `${f}${l}`.toUpperCase() || '?';
}

export function relativeTime(value: string | Date | Dayjs | null | undefined): string {
  if (!value) return '—';
  const d = dayjs(value);
  if (!d.isValid()) return '—';
  const diff = d.diff(dayjs());
  const abs = Math.abs(diff);
  const mins = Math.floor(abs / 60000);
  if (mins < 1) return 'just now';
  const suffix = diff > 0 ? 'from now' : 'ago';
  if (mins < 60) return `${mins}m ${suffix}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${suffix}`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ${suffix}`;
  return d.format('MMM D, YYYY');
}
