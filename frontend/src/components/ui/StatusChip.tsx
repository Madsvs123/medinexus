import { Chip } from '@mui/material';
import type { ChipProps } from '@mui/material';

/**
 * Maps domain status values to MUI chip colors (per engineering conventions §5.4).
 * Any unknown status falls back to 'default'.
 */
export function statusColor(status: string | null | undefined): ChipProps['color'] {
  switch (status?.toUpperCase()) {
    case 'SCHEDULED':
    case 'CONFIRMED':
      return 'info';
    case 'CHECKED_IN':
    case 'IN_PROGRESS':
    case 'PARTIAL':
    case 'PENDING':
    case 'WAITING':
    case 'ABNORMAL':
    case 'LOW':
    case 'MEDIUM':
      return 'warning';
    case 'COMPLETED':
    case 'ACTIVE':
    case 'APPROVED':
    case 'PAID':
    case 'NORMAL':
    case 'AVAILABLE':
    case 'OPEN':
    case 'SIGNED':
    case 'READY':
    case 'GIVEN':
    case 'DONE':
    case 'SUBMITTED':
    case 'RESOLVED':
      return 'success';
    case 'CANCELLED':
    case 'NO_SHOW':
    case 'VOID':
    case 'REJECTED':
    case 'CRITICAL':
    case 'EXPIRED':
    case 'FAILED':
    case 'DECEASED':
    case 'INACTIVE':
    case 'MAINTENANCE':
    case 'HIGH':
    case 'URGENT':
    case 'DECLINED':
      return 'error';
    case 'DRAFT':
    case 'REFUNDED':
    case 'PARTIALLY_DISPENSED':
    case 'ISSUED':
    case 'ROUTINE':
      return 'default';
    default:
      return 'default';
  }
}

interface StatusChipProps {
  status: string | null | undefined;
  size?: ChipProps['size'];
}

export default function StatusChip({ status, size = 'small' }: StatusChipProps) {
  if (!status) return <Chip size={size} label="—" color="default" variant="outlined" />;
  return (
    <Chip
      size={size}
      label={status.replace(/_/g, ' ')}
      color={statusColor(status)}
      variant="filled"
      sx={{ fontWeight: 600 }}
    />
  );
}
