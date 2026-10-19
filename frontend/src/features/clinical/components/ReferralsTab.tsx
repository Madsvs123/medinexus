import { useMemo, useState } from 'react';
import { Button, IconButton, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import { FormAutocomplete, FormSelect, FormTextField, StatusChip, EmptyState } from '../../../components/ui';
import {
  useAcceptReferralMutation,
  useCreateReferralMutation,
  useDeclineReferralMutation,
  useDeleteReferralMutation,
  useGetEncounterDepartmentsQuery,
  useGetEncounterSpecialtiesQuery,
  useGetReferralsQuery,
} from '../api';
import type { Referral } from '../types';
import { SectionCard, SectionEmpty, SectionFormDialog } from './EncounterSection';

const referralSchema = z.object({
  to_specialty: z.number({ invalid_type_error: 'Select a specialty' }),
  to_department: z.number().nullable().optional(),
  reason: z.string().min(1, 'Reason required'),
  priority: z.string().default('ROUTINE'),
  notes: z.string().optional(),
});

type ReferralValues = z.infer<typeof referralSchema>;

export function ReferralsTab({ encounterId, readOnly }: { encounterId: number; readOnly?: boolean }) {
  const { enqueueSnackbar } = useSnackbar();
  const { data, isLoading } = useGetReferralsQuery({ encounter: encounterId, page_size: 50 });
  const { data: specialtiesData } = useGetEncounterSpecialtiesQuery({ page_size: 100 });
  const { data: departmentsData } = useGetEncounterDepartmentsQuery({ page_size: 100 });
  const [createReferral, { isLoading: saving }] = useCreateReferralMutation();
  const [acceptReferral] = useAcceptReferralMutation();
  const [declineReferral] = useDeclineReferralMutation();
  const [deleteReferral] = useDeleteReferralMutation();
  const [open, setOpen] = useState(false);
  const specialties = useMemo(() => specialtiesData?.results ?? [], [specialtiesData]);
  const departments = useMemo(() => departmentsData?.results ?? [], [departmentsData]);

  const { control, handleSubmit, reset } = useForm<ReferralValues>({
    resolver: zodResolver(referralSchema),
    defaultValues: { to_specialty: undefined as unknown as number, to_department: null, reason: '', priority: 'ROUTINE', notes: '' },
  });

  const rows = useMemo(() => data?.results ?? [], [data]);

  const onSave = handleSubmit(async (values: ReferralValues) => {
    try {
      await createReferral({
        encounter: encounterId,
        to_specialty: values.to_specialty,
        to_department: values.to_department ?? null,
        reason: values.reason,
        priority: values.priority as Referral['priority'],
        notes: values.notes ?? '',
      }).unwrap();
      enqueueSnackbar('Referral created', { variant: 'success' });
      setOpen(false);
      reset();
    } catch {
      enqueueSnackbar('Failed to create referral', { variant: 'error' });
    }
  });

  return (
    <SectionCard
      title="Referrals"
      action={!readOnly && (
        <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>Refer patient</Button>
      )}
    >
      {isLoading ? (
        <SectionEmpty hint="Loading…" />
      ) : rows.length === 0 ? (
        <EmptyState title="No referrals" hint="Refer the patient to a specialty or department." />
      ) : (
        <List dense>
          {rows.map((r) => (
            <ListItem
              key={r.id}
              divider
              alignItems="flex-start"
              secondaryAction={
                !readOnly && (
                  <Stack direction="row" spacing={0.5}>
                    {r.status === 'PENDING' && (
                      <>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          onClick={async () => {
                            await acceptReferral(r.id).unwrap();
                            enqueueSnackbar('Referral accepted', { variant: 'success' });
                          }}
                        >
                          Accept
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={async () => {
                            await declineReferral({ id: r.id }).unwrap();
                            enqueueSnackbar('Referral declined', { variant: 'success' });
                          }}
                        >
                          Decline
                        </Button>
                      </>
                    )}
                    <IconButton
                      edge="end"
                      aria-label="Delete referral"
                      color="error"
                      onClick={async () => {
                        await deleteReferral(r.id).unwrap();
                        enqueueSnackbar('Referral deleted', { variant: 'success' });
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                )
              }
            >
              <ListItemText
                primary={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <strong>{typeof r.to_specialty === 'number' ? `Specialty #${r.to_specialty}` : r.to_specialty.name}</strong>
                    <StatusChip status={r.priority} />
                    <StatusChip status={r.status} />
                  </Stack>
                }
                secondary={
                  <>
                    <Typography variant="body2">{r.reason}</Typography>
                    {typeof r.to_department === 'object' && r.to_department && (
                      <Typography variant="caption" color="text.secondary">Dept: {r.to_department.name}</Typography>
                    )}
                  </>
                }
              />
            </ListItem>
          ))}
        </List>
      )}
      <SectionFormDialog open={open} title="Refer patient" onClose={() => setOpen(false)} onSave={onSave} saving={saving}>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Controller
            control={control}
            name="to_specialty"
            render={({ field, fieldState }) => (
              <FormAutocomplete
                label="To specialty"
                options={specialties}
                getOptionLabel={(s) => s.name}
                value={specialties.find((s) => s.id === field.value) ?? null}
                onChange={(s) => field.onChange(s?.id ?? null)}
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                required
              />
            )}
          />
          <Controller
            control={control}
            name="to_department"
            render={({ field }) => (
              <FormAutocomplete
                label="To department (optional)"
                options={departments}
                getOptionLabel={(d) => d.name}
                value={departments.find((d) => d.id === field.value) ?? null}
                onChange={(d) => field.onChange(d?.id ?? null)}
              />
            )}
          />
          <FormSelect control={control} name="priority" label="Priority" options={['ROUTINE', 'URGENT'].map((p) => ({ value: p, label: p }))} />
          <FormTextField control={control} name="reason" label="Reason" required multiline minRows={2} />
          <FormTextField control={control} name="notes" label="Notes" multiline minRows={2} />
        </Stack>
      </SectionFormDialog>
    </SectionCard>
  );
}
