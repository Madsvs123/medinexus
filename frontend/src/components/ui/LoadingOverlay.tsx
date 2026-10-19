import { Backdrop, CircularProgress } from '@mui/material';

interface LoadingOverlayProps {
  open: boolean;
  label?: string;
}

export default function LoadingOverlay({ open, label = 'Loading…' }: LoadingOverlayProps) {
  return (
    <Backdrop
      open={open}
      sx={{ zIndex: (theme) => theme.zIndex.drawer + 2, color: '#fff', flexDirection: 'column', gap: 2 }}
      role="progressbar"
      aria-label={label}
    >
      <CircularProgress color="inherit" />
    </Backdrop>
  );
}
