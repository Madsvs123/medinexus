import { Controller, type FieldValues, type UseControllerProps } from 'react-hook-form';
import { TextField, type TextFieldProps } from '@mui/material';

export type FormTextFieldProps<T extends FieldValues> = UseControllerProps<T> &
  Omit<TextFieldProps, 'name' | 'value' | 'onChange' | 'onBlur' | 'ref'> & {
    /** Disable the label from floating (use placeholder instead). */
    plain?: boolean;
  };

export default function FormTextField<T extends FieldValues>({
  name,
  control,
  rules,
  defaultValue,
  disabled,
  plain,
  ...textFieldProps
}: FormTextFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      defaultValue={defaultValue}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          {...textFieldProps}
          disabled={disabled}
          value={field.value ?? ''}
          onChange={(e) => field.onChange(plain && e.target.value === '' ? null : e.target.value)}
          error={Boolean(fieldState.error)}
          helperText={fieldState.error?.message ?? textFieldProps.helperText}
          fullWidth
        />
      )}
    />
  );
}
