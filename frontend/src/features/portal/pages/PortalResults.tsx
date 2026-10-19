import { useState } from 'react';
import { Box, Chip, LinearProgress, Paper, Tab, Tabs, Typography } from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import { PageHeader, StatusChip, EmptyState } from '../../../components/ui';
import { formatDate } from '../../../utils/format';
import { useGetPortalResultsQuery } from '../api';
import { isLabResult, type PortalResult } from '../types';

export default function PortalResults() {
  const { data, isLoading, error } = useGetPortalResultsQuery();
  const [tab, setTab] = useState<'all' | 'lab' | 'radiology'>('all');

  const results = (data ?? []).filter((r) => {
    if (tab === 'lab') return isLabResult(r);
    if (tab === 'radiology') return !isLabResult(r);
    return true;
  });

  return (
    <Box>
      <PageHeader title="My results" subtitle="Lab results and radiology reports" />
      {isLoading && <LinearProgress sx={{ mb: 2 }} />}
      {error && <Chip label="Failed to load results." color="error" sx={{ mb: 2 }} />}

      <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="all" label="All" />
        <Tab value="lab" label="Lab results" />
        <Tab value="radiology" label="Radiology" />
      </Tabs>

      {!isLoading && results.length === 0 ? (
        <EmptyState icon={<ScienceIcon />} title="No results" hint="Approved lab results and final radiology reports appear here." />
      ) : (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {results.map((r) => (
              <ResultCard key={resultKey(r)} result={r} />
            ))}
          </Box>
        </Paper>
      )}
    </Box>
  );
}

function resultKey(r: PortalResult): string {
  return isLabResult(r) ? `lab-${r.id}` : `rad-${r.id}`;
}

function ResultCard({ result }: { result: PortalResult }) {
  if (isLabResult(result)) {
    const testName = result.test && typeof result.test === 'object' ? result.test.name : 'Lab result';
    return (
      <Box sx={{ borderBottom: 1, borderColor: 'divider', pb: 1.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" fontWeight={600}>{testName}</Typography>
          <StatusChip status={result.flag} />
        </Box>
        <Typography variant="body2">
          <strong>{result.value}</strong> {result.unit}
        </Typography>
        {result.reported_at && (
          <Typography variant="caption" color="text.secondary">Reported {formatDate(result.reported_at)}</Typography>
        )}
      </Box>
    );
  }
  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', pb: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle1" fontWeight={600}>
          {result.modality} — {result.body_part || 'Imaging'}
        </Typography>
        <StatusChip status={result.status ?? 'FINAL'} />
      </Box>
      {result.findings && (
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          <strong>Findings:</strong> {result.findings}
        </Typography>
      )}
      {result.impression && (
        <Typography variant="body2">
          <strong>Impression:</strong> {result.impression}
        </Typography>
      )}
      {result.finalized_at && (
        <Typography variant="caption" color="text.secondary">Finalized {formatDate(result.finalized_at)}</Typography>
      )}
    </Box>
  );
}
