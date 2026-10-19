import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import PortalLayout from '@/components/layout/PortalLayout';
import { RequireAuth, RequirePatient, RequireStaff } from '@/features/auth/guards';

interface FeatureModule {
  scope?: 'staff' | 'portal' | 'public';
  routes?: RouteObject[];
}

/**
 * Eagerly glob every feature's routes module. Only features that exist on disk
 * are included, so the app compiles even when most features are still missing.
 */
const FEATURE_MODULES = import.meta.glob<FeatureModule>('../features/*/routes.tsx', {
  eager: true,
});

function LoadingFallback() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
      <CircularProgress aria-label="Loading page" />
    </Box>
  );
}

export function withSuspense(element: ReactNode): ReactNode {
  return <Suspense fallback={<LoadingFallback />}>{element}</Suspense>;
}

const NotFound = lazy(() => import('@/app/pages/NotFound'));
const Forbidden = lazy(() => import('@/app/pages/Forbidden'));

function collectRoutes(): {
  staff: RouteObject[];
  portal: RouteObject[];
  public: RouteObject[];
} {
  const staff: RouteObject[] = [];
  const portal: RouteObject[] = [];
  const publicRoutes: RouteObject[] = [];

  for (const modulePath of Object.keys(FEATURE_MODULES)) {
    const mod = FEATURE_MODULES[modulePath];
    if (!mod?.routes) continue;
    const scope = mod.scope ?? 'staff';
    const target = scope === 'portal' ? portal : scope === 'public' ? publicRoutes : staff;
    target.push(...mod.routes);
  }

  return { staff, portal, public: publicRoutes };
}

export function buildRoutes(): RouteObject[] {
  const { staff, portal, public: publicRoutes } = collectRoutes();

  return [
    ...publicRoutes,

    {
      path: '/',
      element: (
        <RequireAuth>
          <RequireStaff>
            <AppLayout />
          </RequireStaff>
        </RequireAuth>
      ),
      children: [
        // Dashboard (feature) provides path "/", redirect otherwise.
        ...(staff.some((r) => r.path === '/')
          ? staff
          : ([
              {
                index: true,
                element: withSuspense(
                  <Stack spacing={1} sx={{ p: 6, alignItems: 'center' }}>
                    <Typography variant="h5">Welcome to MediNexus</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Dashboard is being set up — use the navigation to get started.
                    </Typography>
                  </Stack>,
                ),
              },
            ] as RouteObject[])),
        // Feature routes that are NOT the dashboard root.
        ...staff.filter((r) => r.path !== '/'),
      ],
    },

    {
      path: '/portal',
      element: (
        <RequireAuth>
          <RequirePatient>
            <PortalLayout />
          </RequirePatient>
        </RequireAuth>
      ),
      children: portal.length > 0 ? portal : [],
    },

    { path: '/403', element: withSuspense(<Forbidden />) },
    { path: '*', element: withSuspense(<NotFound />) },
  ];
}

export const router = createBrowserRouter(buildRoutes());
