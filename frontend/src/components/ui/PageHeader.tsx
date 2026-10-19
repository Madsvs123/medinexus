import type { ReactNode } from 'react';
import { Breadcrumbs, Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  breadcrumbs?: { label: string; path?: string }[];
  actions?: ReactNode;
  /** Singular alias for `actions` — renders in the same action area. */
  action?: ReactNode;
}

export default function PageHeader({ title, subtitle, breadcrumbs, actions, action }: PageHeaderProps) {
  const actionNodes = actions ?? action;
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mb: 3 }}>
      <Stack spacing={0.5}>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 0.5 }}>
            {breadcrumbs.map((crumb, i) =>
              crumb.path && i < breadcrumbs.length - 1 ? (
                <Link key={crumb.label} component={RouterLink} to={crumb.path} underline="hover" color="inherit" variant="body2">
                  {crumb.label}
                </Link>
              ) : (
                <Typography key={crumb.label} variant="body2" color="text.primary">
                  {crumb.label}
                </Typography>
              ),
            )}
          </Breadcrumbs>
        )}
        <Typography variant="h5" component="h1">
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Stack>
      {actionNodes && (
        <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
          {actionNodes}
        </Stack>
      )}
    </Stack>
  );
}
