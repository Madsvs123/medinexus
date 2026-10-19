import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar, Box, Button, Paper, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import { PageHeader, StatusChip, LoadingOverlay, ErrorAlert, ConfirmDialog } from '../../../components/ui';
import { useCompleteEncounterMutation, useGetEncounterQuery, useUpdateEncounterMutation } from '../api';
import { patientLabel, userName, departmentName } from '../types';
import { VitalsTab } from '../components/VitalsTab';
import { DiagnosesTab } from '../components/DiagnosesTab';
import { NotesTab } from '../components/NotesTab';
import { TreatmentPlanTab } from '../components/TreatmentPlanTab';
import { PrescriptionsTab } from '../components/PrescriptionsTab';
import { ProceduresTab } from '../components/ProceduresTab';
import { LabOrdersTab } from '../components/LabOrdersTab';
import { RadiologyOrdersTab } from '../components/RadiologyOrdersTab';
import { ReferralsTab } from '../components/ReferralsTab';
import { FollowUpsTab } from '../components/FollowUpsTab';
import { DischargeTab } from '../components/DischargeTab';

interface TabPanelProps {
  value: number;
  index: number;
  children: React.ReactNode;
}

function TabPanel({ value, index, children }: TabPanelProps) {
  return (
    <Box role="tabpanel" hidden={value !== index} id={`encounter-tab-${index}`} aria-labelledby={`encounter-tab-${index}`} sx={{ pt: 2 }}>
      {value === index && children}
    </Box>
  );
}

export default function EncounterWorkspace() {
  const { id } = useParams<{ id: string }>();
  const encounterId = Number(id);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [tab, setTab] = useState(0);
  const [confirmComplete, setConfirmComplete] = useState(false);

  const { data: encounter, isLoading, error } = useGetEncounterQuery(encounterId);
  const [updateEncounter] = useUpdateEncounterMutation();
  const [completeEncounter, { isLoading: completing }] = useCompleteEncounterMutation();

  const [chiefComplaint, setChiefComplaint] = useState('');
  const [hpi, setHpi] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');
  const [savingHeader, setSavingHeader] = useState(false);

  useEffect(() => {
    if (encounter) {
      setChiefComplaint(encounter.chief_complaint ?? '');
      setHpi(encounter.history_presenting_illness ?? '');
      setAssessment(encounter.assessment ?? '');
      setPlan(encounter.plan ?? '');
    }
  }, [encounter]);

  if (isLoading) return <LoadingOverlay open />;
  if (error) return <ErrorAlert error={error} />;
  if (!encounter) return <PageHeader title="Encounter not found" subtitle="" />;

  const isOpen = encounter.status === 'OPEN' || encounter.status === 'IN_PROGRESS';

  const saveHeader = async () => {
    setSavingHeader(true);
    try {
      await updateEncounter({
        id: encounterId,
        body: { chief_complaint: chiefComplaint, history_presenting_illness: hpi, assessment, plan },
      }).unwrap();
      enqueueSnackbar('Encounter updated', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to save encounter', { variant: 'error' });
    } finally {
      setSavingHeader(false);
    }
  };

  const doComplete = async () => {
    try {
      await completeEncounter(encounterId).unwrap();
      enqueueSnackbar('Encounter completed', { variant: 'success' });
      setConfirmComplete(false);
    } catch {
      enqueueSnackbar('Failed to complete encounter', { variant: 'error' });
    }
  };

  return (
    <Box>
      <PageHeader
        title={`Encounter E-${encounter.id} — ${patientLabel(encounter.patient)}`}
        subtitle={
          <>
            {userName(encounter.doctor)} • {departmentName(encounter.department)} • started {dayjs(encounter.started_at).format('DD MMM YYYY HH:mm')}
          </>
        }
        action={
          <Stack direction="row" spacing={1}>
            {isOpen && (
              <Button variant="contained" color="success" startIcon={<CheckCircleIcon />} onClick={() => setConfirmComplete(true)} disabled={completing}>
                Complete
              </Button>
            )}
          </Stack>
        }
      />
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <Avatar sx={{ width: 40, height: 40 }}>{patientLabel(encounter.patient).charAt(0)}</Avatar>
        <StatusChip status={encounter.status} />
        <StatusChip status={encounter.type} />
        <Typography variant="caption" color="text.secondary">MRN: {typeof encounter.patient === 'number' ? '—' : encounter.patient.mrn}</Typography>
      </Stack>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack spacing={2}>
          <TextField label="Chief complaint" value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} disabled={!isOpen} fullWidth />
          <TextField label="History of presenting illness" value={hpi} onChange={(e) => setHpi(e.target.value)} multiline minRows={2} disabled={!isOpen} fullWidth />
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField label="Assessment" value={assessment} onChange={(e) => setAssessment(e.target.value)} multiline minRows={2} disabled={!isOpen} sx={{ flexGrow: 1 }} />
            <TextField label="Plan" value={plan} onChange={(e) => setPlan(e.target.value)} multiline minRows={2} disabled={!isOpen} sx={{ flexGrow: 1 }} />
          </Stack>
          {isOpen && (
            <Box>
              <Button variant="outlined" onClick={saveHeader} disabled={savingHeader}>Save header</Button>
            </Box>
          )}
        </Stack>
      </Paper>
      <Paper sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_e, v: number) => setTab(v)} aria-label="Encounter sections" variant="scrollable" scrollButtons="auto">
          <Tab label="Vitals" />
          <Tab label="Diagnoses" />
          <Tab label="Notes" />
          <Tab label="Treatment Plan" />
          <Tab label="Prescriptions" />
          <Tab label="Procedures" />
          <Tab label="Lab Orders" />
          <Tab label="Radiology" />
          <Tab label="Referrals" />
          <Tab label="Follow-ups" />
          <Tab label="Discharge" />
        </Tabs>
      </Paper>
      <TabPanel value={tab} index={0}><VitalsTab encounterId={encounterId} readOnly={!isOpen} /></TabPanel>
      <TabPanel value={tab} index={1}><DiagnosesTab encounterId={encounterId} readOnly={!isOpen} /></TabPanel>
      <TabPanel value={tab} index={2}><NotesTab encounterId={encounterId} readOnly={!isOpen} /></TabPanel>
      <TabPanel value={tab} index={3}><TreatmentPlanTab encounterId={encounterId} readOnly={!isOpen} /></TabPanel>
      <TabPanel value={tab} index={4}><PrescriptionsTab encounterId={encounterId} readOnly={!isOpen} /></TabPanel>
      <TabPanel value={tab} index={5}><ProceduresTab encounterId={encounterId} readOnly={!isOpen} /></TabPanel>
      <TabPanel value={tab} index={6}><LabOrdersTab encounterId={encounterId} patientId={typeof encounter.patient === 'number' ? encounter.patient : encounter.patient.id} readOnly={!isOpen} /></TabPanel>
      <TabPanel value={tab} index={7}><RadiologyOrdersTab encounterId={encounterId} patientId={typeof encounter.patient === 'number' ? encounter.patient : encounter.patient.id} readOnly={!isOpen} /></TabPanel>
      <TabPanel value={tab} index={8}><ReferralsTab encounterId={encounterId} readOnly={!isOpen} /></TabPanel>
      <TabPanel value={tab} index={9}><FollowUpsTab encounterId={encounterId} readOnly={!isOpen} /></TabPanel>
      <TabPanel value={tab} index={10}><DischargeTab encounterId={encounterId} readOnly={!isOpen} /></TabPanel>
      <ConfirmDialog
        open={confirmComplete}
        title="Complete encounter?"
        message="The encounter will be locked and marked COMPLETED. Make sure notes and orders are final."
        confirmLabel="Complete"
        onConfirm={doComplete}
        onCancel={() => setConfirmComplete(false)}
      />
    </Box>
  );
}
