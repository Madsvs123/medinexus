import { Controller, type FieldValues, type UseControllerProps } from 'react-hook-form';
import {
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  type SelectProps,
} from '@mui/material';

export interface SelectOption {
  value: string | number;
  label: string;
}

export type FormSelectProps<T extends FieldValues> = UseControllerProps<T> &
  Omit<SelectProps, 'name' | 'value' | 'onChange' | 'onBlur' | 'ref'> & {
    options: SelectOption[];
    /** Allow clearing the value (adds an empty option). */
    allowEmpty?: boolean;
    emptyLabel?: string;
  };

export default function FormSelect<T extends FieldValues>({
  name,
  control,
  rules,
  defaultValue,
  options,
  allowEmpty = false,
  emptyLabel = '—',
  disabled,
  ...selectProps
}: FormSelectProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      defaultValue={defaultValue}
      render={({ field, fieldState }) => (
        <FormControl fullWidth error={Boolean(fieldState.error)}>
          <InputLabel id={`select-${name}-label`}>{selectProps.label}</InputLabel>
          <Select
            {...field}
            {...selectProps}
            labelId={`select-${name}-label`}
            disabled={disabled}
            value={field.value ?? ''}
            onChange={(e) => field.onChange(e.target.value)}
          >
            {allowEmpty && <MenuItem value="">{emptyLabel}</MenuItem>}
            {options.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
          {fieldState.error && <FormHelperText>{fieldState.error.message}</FormHelperText>}
        </FormControl>
      )}
    />
  );
}
