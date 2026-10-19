import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Grid,
  IconButton,
  MenuItem,
  Pagination,
  TextField,
  Tooltip,
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditIcon from '@mui/icons-material/Edit';
import { useSnackbar } from 'notistack';
import { PageHeader, DataTable, StatusChip, EmptyState } from '../../../components/ui';
import { formatDate } from '../../../utils/format';
import { useGetFormTemplatesQuery, useDuplicateFormTemplateMutation } from '../api';
import { type FormTemplate } from '../types';

function getErr(e: unknown): string {
  if (e && typeof e === 'object' && 'data' in e) {
    const data = (e as { data?: unknown }).data as Record<string, unknown> | undefined;
    if (data?.detail) return String(data.detail);
    const first = Object.values(data ?? {}).find((v) => v !== undefined && v !== null);
    if (Array.isArray(first)) return String(first[0]);
    if (typeof first === 'string') return first;
  }
  return 'Something went wrong. Please try again.';
}

export default function TemplateList() {
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const { enqueueSnackbar } = useSnackbar();

  const params = useMemo(() => ({ page, page_size: 20, ...(category ? { category } : {}) }), [page, category]);
  const { data, isLoading, error } = useGetFormTemplatesQuery(params);
  const [duplicate] = useDuplicateFormTemplateMutation();

  const handleDuplicate = async (t: FormTemplate) => {
    try {
      const copy = await duplicate(t.id).unwrap();
      enqueueSnackbar(`Duplicated as "${copy.name}"`, { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(getErr(e), { variant: 'error' });
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'name',
        label: 'Template',
        render: (r: FormTemplate) => (
          <Box component={RouterLink} to={`/forms/templates/${r.id}`} sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 600 }}>
            {r.name}
          </Box>
        ),
      },
      { key: 'category', label: 'Category', render: (r: FormTemplate) => <Chip label={r.category} size="small" /> },
      { key: 'fields', label: 'Fields', align: 'right' as const, render: (r: FormTemplate) => r.schema?.length ?? 0 },
      { key: 'active', label: 'Status', render: (r: FormTemplate) => <StatusChip status={r.active ? 'ACTIVE' : 'INACTIVE'} /> },
      { key: 'created', label: 'Created', render: (r: FormTemplate) => formatDate(r.created_at) },
      {
        key: 'actions',
        label: 'Actions',
        align: 'right' as const,
        render: (r: FormTemplate) => (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Tooltip title="Duplicate">
              <IconButton aria-label="Duplicate" size="small" onClick={() => void handleDuplicate(r)}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit">
              <IconButton aria-label="Edit" size="small" component={RouterLink} to={`/forms/templates/${r.id}/edit`}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <Box>
      <PageHeader
        title="Form templates"
        subtitle="Design reusable forms with a JSON schema"
        actions={
          <Button component={RouterLink} to="/forms/templates/new" variant="contained" startIcon={<AddIcon />}>
            New template
          </Button>
        }
      />
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Category"
            size="small"
            fullWidth
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          />
        </Grid>
      </Grid>

      {error && <Chip label={getErr(error)} color="error" sx={{ mb: 2 }} />}

      {!isLoading && (data?.results.length ?? 0) === 0 ? (
        <EmptyState
          icon={<AssignmentIcon />}
          title="No templates yet"
          hint="Create a template with a schema builder."
          action={
            <Button component={RouterLink} to="/forms/templates/new" variant="contained" startIcon={<AddIcon />}>
              New template
            </Button>
          }
        />
      ) : (
        <DataTable columns={columns} rows={data?.results ?? []} loading={isLoading} rowKey={(r) => String(r.id)} />
      )}

      {(data?.count ?? 0) > 20 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination page={page} count={Math.ceil((data?.count ?? 0) / 20)} onChange={(_e, p) => setPage(p)} />
        </Box>
      )}
    </Box>
  );
}
