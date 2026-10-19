import type { ReactNode } from 'react';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';

interface StatCardProps {
  title: string;
  value: ReactNode;
  icon?: ReactNode;
  subtitle?: ReactNode;
  /** Named theme color or any CSS color string (e.g. hex). */
  color?: string;
  loading?: boolean;
  sx?: SxProps<Theme>;
}

const NAMED_COLORS: Record<string, string> = {
  primary: 'primary.main',
  secondary: 'secondary.main',
  success: 'success.main',
  warning: 'warning.main',
  error: 'error.main',
  info: 'info.main',
};

export default function StatCard({
  title,
  value,
  icon,
  subtitle,
  color = 'primary',
  loading = false,
  sx,
}: StatCardProps) {
  const iconColor = NAMED_COLORS[color] ?? color;
  return (
    <Card variant="outlined" sx={{ height: '100%', ...sx }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom noWrap>
              {title}
            </Typography>
            {loading ? (
              <Typography variant="h5" color="text.disabled">
                …
              </Typography>
            ) : (
              <Typography variant="h5" fontWeight={700} noWrap>
                {value}
              </Typography>
            )}
            {subtitle && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          {icon && (
            <Box sx={{ color: iconColor, display: 'flex', bgcolor: `${iconColor}1A`, borderRadius: 2, p: 1 }} aria-hidden>
              {icon}
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
