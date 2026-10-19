import { useEffect, useState } from 'react';
import { Autocomplete, TextField, CircularProgress } from '@mui/material';
import { Controller } from 'react-hook-form';
import { useLazySearchBillingPatientsQuery } from '../api';
import { patientLabel } from '../types';

export interface PatientOption {
  id: number;
  label: string;
}

export function useDebouncedValue<T>(value: T, delay = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

interface PatientAutocompleteProps {
  name: string;
  control: any;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  size?: 'small' | 'medium';
}

export default function PatientAutocomplete({
  name,
  control,
  label = 'Patient',
  required,
  disabled,
  size = 'small',
}: PatientAutocompleteProps) {
  const [input, setInput] = useState('');
  const debounced = useDebouncedValue(input);
  const [trigger, { data, isFetching }] = useLazySearchBillingPatientsQuery();

  useEffect(() => {
    void trigger({ search: debounced, page_size: 10 });
  }, [debounced, trigger]);

  const options: PatientOption[] = (data?.results ?? []).map((p) => ({ id: p.id, label: patientLabel(p) }));

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Autocomplete
          value={(field.value as PatientOption | null) ?? null}
          onChange={(_e, v) => field.onChange(v)}
          options={options}
          getOptionLabel={(o) => o.label}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          onInputChange={(_e, v) => setInput(v)}
          disabled={disabled}
          size={size}
          fullWidth
          renderInput={(params) => (
            <TextField
              {...params}
              label={label}
              required={required}
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {isFetching ? <CircularProgress size={18} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
        />
      )}
    />
  );
}
