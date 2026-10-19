import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useSnackbar } from 'notistack';
import { PageHeader, StatusChip, EmptyState } from '../../../components/ui';
import { useGetFormTemplateQuery, useDuplicateFormTemplateMutation } from '../api';
import { type FieldType } from '../types';

function getErr(e: unknown): string {
  if (e && typeof e === 'object' && 'data' in e) {
    const data = (e as { data?: unknown }).data as Record<string, unknown> | undefined;
    if (data?.detail) return String(data.detail);
    const first = Object.values(data ?? {}).find((v) => v !== undefined && v !== null);
    if (Array.isArray(first)) return String(first[0]);
    if (typeof first === 'string') return first;
  }
  return 'Failed to duplicate template.';
}

const TYPE_META: Record<FieldType, { color: 'default' | 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error' }> = {
  text: { color: 'default' },
  textarea: { color: 'default' },
  number: { color: 'info' },
  date: { color: 'info' },
  select: { color: 'secondary' },
  multiselect: { color: 'secondary' },
  checkbox: { color: 'success' },
};

export default function TemplateDetail() {
  const { id } = useParams();
  const templateId = Number(id);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { data: template, isLoading, error } = useGetFormTemplateQuery(templateId);
  const [duplicate] = useDuplicateFormTemplateMutation();

  const handleDuplicate = async () => {
    try {
      const copy = await duplicate(templateId).unwrap();
      enqueueSnackbar(`Duplicated as "${copy.name}"`, { variant: 'success' });
      navigate(`/forms/templates/${copy.id}`);
    } catch (e) {
      enqueueSnackbar(getErr(e), { variant: 'error' });
    }
  };

  if (isLoading) return <LinearProgress />;
  if (error || !template) {
    return (
      <Box>
        <PageHeader title="Template not found" />
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/forms/templates')}>
          Back to templates
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title={template.name}
        subtitle={`Category: ${template.category}`}
        actions={
          <>
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/forms/templates')}>
              Back
            </Button>
            <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={() => void handleDuplicate()}>
              Duplicate
            </Button>
            <Button variant="contained" startIcon={<EditIcon />} onClick={() => navigate(`/forms/templates/${template.id}/edit`)}>
              Edit template
            </Button>
          </>
        }
      />
      <Box sx={{ mb: 2 }}>
        <StatusChip status={template.active ? 'ACTIVE' : 'INACTIVE'} />
      </Box>
      <Paper variant="outlined">
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>Schema preview ({template.schema?.length ?? 0} fields)</Typography>
        </Box>
        {template.schema?.length ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Key</TableCell>
                  <TableCell>Label</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Required</TableCell>
                  <TableCell>Options</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {template.schema.map((f) => (
                  <TableRow key={f.key}>
                    <TableCell><code>{f.key}</code></TableCell>
                    <TableCell>{f.label}</TableCell>
                    <TableCell>
                      <Chip label={f.type} size="small" color={TYPE_META[f.type]?.color ?? 'default'} />
                    </TableCell>
                    <TableCell>{f.required ? 'Yes' : 'No'}</TableCell>
                    <TableCell>{f.options?.join(', ') ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ p: 2 }}>
            <EmptyState title="No fields" hint="This template has no fields defined." />
          </Box>
        )}
      </Paper>
    </Box>
  );
}
