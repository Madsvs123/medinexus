import { useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  Pagination,
  Switch,
  TextField,
} from '@mui/material';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { useSnackbar } from 'notistack';
import { PageHeader, DataTable, StatusChip, EmptyState } from '../../../components/ui';
import {
  useGetInsurancePlansQuery,
  useCreateInsurancePlanMutation,
  useUpdateInsurancePlanMutation,
} from '../api';
import { type InsurancePlan } from '../types';

const planSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  carrier: z.string().min(1, 'Carrier is required'),
  coverage_percentage: z.coerce.number().min(0).max(100, 'Coverage must be 0-100'),
  notes: z.string().optional(),
  active: z.boolean(),
});

type PlanFormValues = z.infer<typeof planSchema>;

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

export default function InsurancePlansAdmin() {
  const [page, setPage] = useState(1);
  const { enqueueSnackbar } = useSnackbar();
  const { data, isLoading, error } = useGetInsurancePlansQuery({ page, page_size: 20 });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InsurancePlan | null>(null);

  const [updatePlan] = useUpdateInsurancePlanMutation();

  const handleToggleActive = async (plan: InsurancePlan) => {
    try {
      await updatePlan({ id: plan.id, body: { active: !plan.active } }).unwrap();
      enqueueSnackbar(plan.active ? 'Plan deactivated' : 'Plan activated', { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(getErr(e), { variant: 'error' });
    }
  };

  const columns = useMemo(
    () => [
      { key: 'name', label: 'Name', render: (r: InsurancePlan) => r.name },
      { key: 'carrier', label: 'Carrier', render: (r: InsurancePlan) => r.carrier },
      {
        key: 'coverage',
        label: 'Coverage',
        align: 'right' as const,
        render: (r: InsurancePlan) => `${Number(r.coverage_percentage)}%`,
      },
      { key: 'notes', label: 'Notes', render: (r: InsurancePlan) => r.notes || '—' },
      { key: 'status', label: 'Status', render: (r: InsurancePlan) => <StatusChip status={r.active ? 'ACTIVE' : 'INACTIVE'} /> },
      {
        key: 'actions',
        label: 'Actions',
        align: 'right' as const,
        render: (r: InsurancePlan) => (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => {
                setEditing(r);
                setDialogOpen(true);
              }}
            >
              Edit
            </Button>
            <Switch size="small" checked={r.active} onChange={() => void handleToggleActive(r)} inputProps={{ 'aria-label': `toggle ${r.name}` }} />
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
        title="Insurance plans"
        subtitle="Manage payer plans and coverage"
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            New plan
          </Button>
        }
      />
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12}>
          <Chip icon={<HealthAndSafetyIcon />} label={`${data?.count ?? 0} plans`} />
        </Grid>
      </Grid>

      {error && <Chip label={getErr(error)} color="error" sx={{ mb: 2 }} />}

      {!isLoading && (data?.results.length ?? 0) === 0 ? (
        <EmptyState
          icon={<HealthAndSafetyIcon />}
          title="No insurance plans"
          hint="Create your first insurance plan."
          action={
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              New plan
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

      {dialogOpen && (
        <PlanDialog
          open
          plan={editing}
          onClose={() => setDialogOpen(false)}
          onSaved={() => {
            setDialogOpen(false);
            enqueueSnackbar(editing ? 'Plan updated' : 'Plan created', { variant: 'success' });
          }}
        />
      )}
    </Box>
  );
}

function PlanDialog({ open, plan, onClose, onSaved }: { open: boolean; plan: InsurancePlan | null; onClose: () => void; onSaved: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const [createPlan] = useCreateInsurancePlanMutation();
  const [updatePlan] = useUpdateInsurancePlanMutation();
  const { control, handleSubmit, formState } = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: plan
      ? {
          name: plan.name,
          carrier: plan.carrier,
          coverage_percentage: Number(plan.coverage_percentage),
          notes: plan.notes ?? '',
          active: plan.active,
        }
      : { name: '', carrier: '', coverage_percentage: 80, notes: '', active: true },
  });

  const onSubmit = async (values: PlanFormValues) => {
    try {
      if (plan) {
        await updatePlan({ id: plan.id, body: values }).unwrap();
      } else {
        await createPlan(values).unwrap();
      }
      onSaved();
    } catch (e) {
      enqueueSnackbar(getErr(e), { variant: 'error' });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{plan ? `Edit ${plan.name}` : 'New insurance plan'}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Controller
              name="name"
              control={control}
              render={({ field, fieldState }) => (
                <TextField label="Name *" fullWidth size="small" {...field} error={!!fieldState.error} helperText={fieldState.error?.message} />
              )}
            />
            <Controller
              name="carrier"
              control={control}
              render={({ field, fieldState }) => (
                <TextField label="Carrier *" fullWidth size="small" {...field} error={!!fieldState.error} helperText={fieldState.error?.message} />
              )}
            />
            <Controller
              name="coverage_percentage"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  label="Coverage %"
                  type="number"
                  fullWidth
                  size="small"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  inputProps={{ min: 0, max: 100 }}
                />
              )}
            />
            <Controller
              name="notes"
              control={control}
              render={({ field }) => <TextField label="Notes" fullWidth size="small" multiline minRows={2} {...field} />}
            />
            <Controller
              name="active"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Checkbox checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                  label="Active"
                />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={formState.isSubmitting}>
            {plan ? 'Save changes' : 'Create plan'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
