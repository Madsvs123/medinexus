import type { ReactNode } from 'react';
import { Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';

export function SectionCard({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Typography variant="h6">{title}</Typography>
          {action}
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}

export function SectionEmpty({ hint }: { hint: string }) {
  return (
    <Box sx={{ py: 2, display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
      <InboxIcon fontSize="small" />
      <Typography variant="body2">{hint}</Typography>
    </Box>
  );
}

export function SectionFormDialog({
  open,
  title,
  onClose,
  onSave,
  saving,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onSave: () => void;
  saving?: boolean;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>{children}</DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onSave} disabled={saving}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}
