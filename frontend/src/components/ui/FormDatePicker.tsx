import { Controller, type FieldValues, type UseControllerProps } from 'react-hook-form';
import { TextField, type TextFieldProps } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { type Dayjs } from 'dayjs';

export type FormDatePickerProps<T extends FieldValues> = UseControllerProps<T> &
  Omit<TextFieldProps, 'name' | 'value' | 'onChange' | 'onBlur' | 'ref'> & {
    /** Emit ISO date string (YYYY-MM-DD). Default true. */
    iso?: boolean;
    minDate?: Dayjs;
    maxDate?: Dayjs;
    disableFuture?: boolean;
  };

export default function FormDatePicker<T extends FieldValues>({
  name,
  control,
  rules,
  defaultValue,
  iso = true,
  minDate,
  maxDate,
  disableFuture,
  disabled,
  label,
  size,
  fullWidth = true,
  required,
  placeholder,
  helperText,
  sx,
}: FormDatePickerProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      defaultValue={defaultValue}
      render={({ field, fieldState }) => (
        <DatePicker
          label={label}
          value={field.value ? dayjs(field.value) : null}
          minDate={minDate}
          maxDate={maxDate}
          disableFuture={disableFuture}
          disabled={disabled}
          onChange={(date) => {
            if (!date) {
              field.onChange(null);
              return;
            }
            field.onChange(iso ? date.format('YYYY-MM-DD') : date);
          }}
          slotProps={{
            textField: {
              fullWidth,
              size,
              required,
              placeholder,
              sx,
              error: Boolean(fieldState.error),
              helperText: fieldState.error?.message ?? helperText,
              name: field.name,
            },
          }}
        />
      )}
    />
  );
}
