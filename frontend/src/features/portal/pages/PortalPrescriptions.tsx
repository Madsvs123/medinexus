import { Box, Chip, LinearProgress, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import MedicationIcon from '@mui/icons-material/Medication';
import { PageHeader, StatusChip, EmptyState } from '../../../components/ui';
import { formatDate } from '../../../utils/format';
import { useGetPortalPrescriptionsQuery } from '../api';
import { medicationName, type PortalPrescription } from '../types';

export default function PortalPrescriptions() {
  const { data, isLoading, error } = useGetPortalPrescriptionsQuery();

  return (
    <Box>
      <PageHeader title="My prescriptions" subtitle="Active and past medications" />
      {isLoading && <LinearProgress sx={{ mb: 2 }} />}
      {error && <Chip label="Failed to load prescriptions." color="error" sx={{ mb: 2 }} />}
      {!isLoading && (data?.length ?? 0) === 0 ? (
        <EmptyState icon={<MedicationIcon />} title="No prescriptions" hint="Prescriptions from your visits will appear here." />
      ) : (
        <Paper variant="outlined">
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Medication</TableCell>
                  <TableCell>Dosage</TableCell>
                  <TableCell>Frequency</TableCell>
                  <TableCell>Route</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Refills</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Prescribed</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data ?? []).map((p: PortalPrescription) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{medicationName(p.medication)}</Typography>
                      {p.instructions && <Typography variant="caption" color="text.secondary">{p.instructions}</Typography>}
                    </TableCell>
                    <TableCell>{p.dosage}</TableCell>
                    <TableCell>{p.frequency}</TableCell>
                    <TableCell>{p.route}</TableCell>
                    <TableCell>{p.duration_days ? `${p.duration_days} days` : '—'}</TableCell>
                    <TableCell>{p.refills}</TableCell>
                    <TableCell><StatusChip status={p.status} /></TableCell>
                    <TableCell>{formatDate(p.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
}
