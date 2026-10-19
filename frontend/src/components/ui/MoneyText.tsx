import { Typography } from '@mui/material';
import { formatCurrency } from '@/utils/format';

interface MoneyTextProps {
  value: number | string | null | undefined;
  currency?: string;
  variant?: 'body2' | 'body1' | 'subtitle1' | 'subtitle2' | 'h6';
  bold?: boolean;
  color?: 'inherit' | 'success.main' | 'error.main' | 'text.secondary' | 'warning.main';
}

export default function MoneyText({
  value,
  currency = 'USD',
  variant = 'body2',
  bold = false,
  color = 'inherit',
}: MoneyTextProps) {
  return (
    <Typography
      variant={variant}
      component="span"
      fontWeight={bold ? 700 : undefined}
      color={color}
      sx={{ whiteSpace: 'nowrap' }}
    >
      {formatCurrency(value, currency)}
    </Typography>
  );
}
