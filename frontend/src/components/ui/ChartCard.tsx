import type { ReactNode } from 'react';
import { Box, Card, CardContent, CardHeader, CircularProgress, Typography } from '@mui/material';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
  loading?: boolean;
  height?: number | string;
}

export default function ChartCard({
  title,
  subtitle,
  children,
  action,
  loading = false,
  height = 320,
}: ChartCardProps) {
  return (
    <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardHeader
        title={title}
        subheader={subtitle}
        action={action}
        titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }}
      />
      <CardContent sx={{ flex: 1, minHeight: 0 }}>
        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height }}>
            <CircularProgress size={28} aria-label="Loading chart" />
          </Box>
        ) : (
          <Box sx={{ width: '100%', height, minHeight: 0 }}>{children}</Box>
        )}
        {!loading && !children && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            No data to display.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
