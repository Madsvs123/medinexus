import { useEffect, useMemo, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Chip,
  CircularProgress,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import MedicationIcon from '@mui/icons-material/Medication';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ScienceIcon from '@mui/icons-material/Science';
import GroupsIcon from '@mui/icons-material/Groups';
import DescriptionIcon from '@mui/icons-material/Description';
import { PageHeader, EmptyState } from '../../../components/ui';
import { useGlobalSearchQuery } from '../api';
import { SEARCH_TYPES, type SearchResult, type SearchType } from '../types';

const TYPE_ICONS: Record<SearchType, ReactElement> = {
  patients: <PersonIcon fontSize="small" />,
  encounters: <LocalHospitalIcon fontSize="small" />,
  prescriptions: <MedicationIcon fontSize="small" />,
  invoices: <ReceiptLongIcon fontSize="small" />,
  medications: <MedicationIcon fontSize="small" />,
  tests: <ScienceIcon fontSize="small" />,
  users: <GroupsIcon fontSize="small" />,
};

const TYPE_LABELS: Record<SearchType, string> = {
  patients: 'Patients',
  encounters: 'Encounters',
  prescriptions: 'Prescriptions',
  invoices: 'Invoices',
  medications: 'Medications',
  tests: 'Lab tests',
  users: 'Users',
};

function useDebouncedValue<T>(value: T, delay = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/** Map backend `url` (/api/v1/...) to a frontend route per type. */
function toFrontendRoute(type: SearchType, r: SearchResult): string {
  const id = r.id;
  switch (type) {
    case 'patients':
      return `/patients/${id}`;
    case 'encounters':
      return `/encounters/${id}`;
    case 'prescriptions':
      return '/encounters';
    case 'invoices':
      return `/billing/invoices/${id}`;
    case 'medications':
      return `/pharmacy/medications/${id}/edit`;
    case 'tests':
      return '/laboratory/tests';
    case 'users':
      return '/configuration';
    default:
      return r.url || '#';
  }
}

export default function GlobalSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const q = searchParams.get('q') ?? '';
  const typeParam = searchParams.get('type');
  const type = (SEARCH_TYPES.includes(typeParam as SearchType) ? typeParam : '') as SearchType | '';

  const [input, setInput] = useState(q);
  const debounced = useDebouncedValue(input);

  useEffect(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (debounced) next.set('q', debounced);
      else next.delete('q');
      return next;
    });
  }, [debounced, setSearchParams]);

  const { data, isFetching, isError } = useGlobalSearchQuery(
    { q: debounced, type },
    { skip: debounced.trim().length === 0 },
  );

  const groups = useMemo(() => {
    if (!data) return [];
    return SEARCH_TYPES.filter((t) => (data[t]?.length ?? 0) > 0).map((t) => ({ type: t, results: data[t] as SearchResult[] }));
  }, [data]);

  const setType = (t: SearchType | '') => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (t) next.set('type', t);
      else next.delete('type');
      return next;
    });
  };

  return (
    <Box>
      <PageHeader title="Global search" subtitle="Search patients, encounters, invoices and more" />
      <TextField
        autoFocus
        fullWidth
        placeholder="Search by name, MRN, invoice number, medication…"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
          endAdornment: isFetching ? (
            <InputAdornment position="end">
              <CircularProgress size={18} />
            </InputAdornment>
          ) : null,
        }}
      />

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        <Chip label="All" color={type === '' ? 'primary' : 'default'} onClick={() => setType('')} />
        {SEARCH_TYPES.map((t) => (
          <Chip
            key={t}
            label={TYPE_LABELS[t]}
            icon={TYPE_ICONS[t]}
            color={type === t ? 'primary' : 'default'}
            onClick={() => setType(t)}
          />
        ))}
      </Box>

      {debounced.trim() === '' ? (
        <EmptyState icon={<SearchIcon />} title="Start typing to search" hint="Results update as you type." />
      ) : isError ? (
        <EmptyState icon={<SearchIcon />} title="Search failed" hint="Check your connection and try again." />
      ) : !isFetching && groups.length === 0 ? (
        <EmptyState icon={<SearchIcon />} title="No results" hint={`Nothing found for "${debounced}".`} />
      ) : (
        groups.map((group) => (
          <Paper key={group.type} variant="outlined" sx={{ mb: 2 }}>
            <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
              {TYPE_ICONS[group.type]}
              <Typography variant="subtitle1" fontWeight={600}>
                {TYPE_LABELS[group.type]}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {group.results.length}
              </Typography>
            </Box>
            <Box>
              {group.results.map((r) => (
                <Box
                  key={r.id}
                  component={RouterLink}
                  to={toFrontendRoute(group.type, r)}
                  sx={{
                    display: 'block',
                    px: 2,
                    py: 1.25,
                    textDecoration: 'none',
                    color: 'inherit',
                    borderBottom: 1,
                    borderColor: 'divider',
                    '&:hover': { bgcolor: 'action.hover' },
                    '&:last-of-type': { borderBottom: 0 },
                  }}
                  onClick={(e) => {
                    if (toFrontendRoute(group.type, r) === '#') {
                      e.preventDefault();
                      navigate('/search');
                    }
                  }}
                >
                  <Typography variant="body2" fontWeight={600} color="primary">
                    {r.label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {r.subtitle}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        ))
      )}
    </Box>
  );
}
