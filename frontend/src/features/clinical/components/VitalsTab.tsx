import { useMemo, useState } from 'react';
import { Button, Chip, Grid, IconButton, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import { FormTextField, EmptyState } from '../../../components/ui';
import { useCreateVitalMutation, useDeleteVitalMutation, useGetVitalsQuery } from '../api';
import type { VitalSigns } from '../types';
import { SectionCard, SectionEmpty, SectionFormDialog } from './EncounterSection';

const vitalsSchema = z.object({
  bp_systolic: z.coerce.number().int().min(20).max(300).nullable().optional(),
  bp_diastolic: z.coerce.number().int().min(10).max(200).nullable().optional(),
  heart_rate: z.coerce.number().int().min(10).max(300).nullable().optional(),
  respiratory_rate: z.coerce.number().int().min(4).max(100).nullable().optional(),
  temperature: z.coerce.number().min(30).max(45).nullable().optional(),
  spo2: z.coerce.number().int().min(50).max(100).nullable().optional(),
  weight_kg: z.coerce.number().min(1).max(400).nullable().optional(),
  height_cm: z.coerce.number().min(30).max(250).nullable().optional(),
  notes: z.string().optional(),
});

type VitalsValues = z.infer<typeof vitalsSchema>;

export function VitalsTab({ encounterId, readOnly }: { encounterId: number; readOnly?: boolean }) {
  const { enqueueSnackbar } = useSnackbar();
  const { data, isLoading } = useGetVitalsQuery({ encounter: encounterId, page_size: 50 });
  const [createVital, { isLoading: saving }] = useCreateVitalMutation();
  const [deleteVital] = useDeleteVitalMutation();
  const [open, setOpen] = useState(false);
  const { control, handleSubmit, reset } = useForm<VitalsValues>({
    resolver: zodResolver(vitalsSchema),
    defaultValues: {
      bp_systolic: null,
      bp_diastolic: null,
      heart_rate: null,
      respiratory_rate: null,
      temperature: null,
      spo2: null,
      weight_kg: null,
      height_cm: null,
      notes: '',
    },
  });

  const rows = useMemo(() => data?.results ?? [], [data]);

  const onSave = handleSubmit(async (values: VitalsValues) => {
    try {
      await createVital({ encounter: encounterId, ...values }).unwrap();
      enqueueSnackbar('Vitals recorded', { variant: 'success' });
      setOpen(false);
      reset();
    } catch {
      enqueueSnackbar('Failed to record vitals', { variant: 'error' });
    }
  });

  return (
    <SectionCard
      title="Vital signs"
      action={!readOnly && (
        <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>Record vitals</Button>
      )}
    >
      {isLoading ? (
        <SectionEmpty hint="Loading…" />
      ) : rows.length === 0 ? (
        <EmptyState icon={<MonitorHeartIcon />} title="No vitals recorded" hint="Record the first set of vital signs for this encounter." />
      ) : (
        <List dense>
          {rows.map((v: VitalSigns) => (
            <ListItem
              key={v.id}
              divider
              secondaryAction={
                !readOnly && (
                  <IconButton
                    edge="end"
                    aria-label="Delete vitals"
                    color="error"
                    onClick={async () => {
                      await deleteVital(v.id).unwrap();
                      enqueueSnackbar('Vitals deleted', { variant: 'success' });
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                )
              }
            >
              <ListItemText
                primary={
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Chip size="small" label={`BP ${v.bp_systolic ?? '—'}/${v.bp_diastolic ?? '—'}`} />
                    <Chip size="small" label={`HR ${v.heart_rate ?? '—'}`} />
                    <Chip size="small" label={`RR ${v.respiratory_rate ?? '—'}`} />
                    <Chip size="small" label={`T ${v.temperature ?? '—'}°C`} />
                    <Chip size="small" label={`SpO2 ${v.spo2 ?? '—'}%`} />
                    <Chip size="small" label={`W ${v.weight_kg ?? '—'}kg`} />
                    <Chip size="small" label={`H ${v.height_cm ?? '—'}cm`} />
                  </Stack>
                }
                secondary={
                  <>
                    <Typography variant="caption" color="text.secondary">{dayjs(v.recorded_at).format('DD MMM YYYY HH:mm')}</Typography>
                    {v.notes && <Typography variant="body2" color="text.secondary">{v.notes}</Typography>}
                  </>
                }
              />
            </ListItem>
          ))}
        </List>
      )}
      <SectionFormDialog open={open} title="Record vitals" onClose={() => setOpen(false)} onSave={onSave} saving={saving}>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={6}><FormTextField control={control} name="bp_systolic" label="BP systolic" type="number" /></Grid>
          <Grid item xs={6}><FormTextField control={control} name="bp_diastolic" label="BP diastolic" type="number" /></Grid>
          <Grid item xs={6}><FormTextField control={control} name="heart_rate" label="Heart rate" type="number" /></Grid>
          <Grid item xs={6}><FormTextField control={control} name="respiratory_rate" label="Resp rate" type="number" /></Grid>
          <Grid item xs={6}><FormTextField control={control} name="temperature" label="Temperature (°C)" type="number" /></Grid>
          <Grid item xs={6}><FormTextField control={control} name="spo2" label="SpO2 (%)" type="number" /></Grid>
          <Grid item xs={6}><FormTextField control={control} name="weight_kg" label="Weight (kg)" type="number" /></Grid>
          <Grid item xs={6}><FormTextField control={control} name="height_cm" label="Height (cm)" type="number" /></Grid>
          <Grid item xs={12}><FormTextField control={control} name="notes" label="Notes" multiline minRows={2} /></Grid>
        </Grid>
      </SectionFormDialog>
    </SectionCard>
  );
}
