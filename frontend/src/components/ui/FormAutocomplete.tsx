import { Controller, type FieldValues, type UseControllerProps } from 'react-hook-form';
import {
  Autocomplete,
  Chip,
  FormControl,
  FormHelperText,
  TextField,
  type AutocompleteProps,
} from '@mui/material';
import type { ReactNode } from 'react';

export interface AutocompleteOption {
  value: string | number;
  label: string;
}

/**
 * Options may be plain {value, label} pairs OR arbitrary entity objects
 * (e.g. Patient, Doctor, Department). Use `optionValue`/`optionLabel`
 * to customize extraction; sensible defaults handle id/name/full_name.
 */
export type AnyOption = AutocompleteOption | object;

const isPlainOption = (opt: AnyOption): opt is AutocompleteOption =>
  typeof opt === 'object' && opt !== null && 'value' in opt && 'label' in opt;

const asRecord = (opt: AnyOption): Record<string, unknown> => opt as Record<string, unknown>;

export function defaultOptionValue(opt: AnyOption): string | number {
  if (isPlainOption(opt)) return opt.value;
  const rec = asRecord(opt);
  const v = rec.value ?? rec.id;
  return (v as string | number | undefined) ?? String(opt);
}

export function defaultOptionLabel(opt: AnyOption): string {
  if (isPlainOption(opt)) return opt.label;
  const rec = asRecord(opt);
  const first = typeof rec.first_name === 'string' ? rec.first_name : '';
  const last = typeof rec.last_name === 'string' ? rec.last_name : '';
  const fullName = [first, last].filter(Boolean).join(' ');
  const label = rec.label ?? rec.name ?? rec.full_name ?? fullName ?? rec.title ?? rec.email ?? rec.code;
  return typeof label === 'string' && label.length > 0 ? label : String(defaultOptionValue(opt));
}

type PassthroughAutocompleteProps = AutocompleteProps<any, boolean, boolean, boolean>;

export type FormAutocompleteProps<T extends FieldValues> = Partial<
  Omit<UseControllerProps<T>, 'disabled'>
> &
  Omit<PassthroughAutocompleteProps, 'name' | 'renderInput' | 'options' | 'onChange' | 'getOptionLabel'> & {
    options: AnyOption[];
    multiple?: boolean;
    freeSolo?: boolean;
    label?: string;
    placeholder?: string;
    optionValue?: (opt: AnyOption) => string | number;
    optionLabel?: (opt: AnyOption) => string;
    /** Called with the selected option(s) (uncontrolled mode) — not the DOM event. */
    onChange?: (value: any) => void;
    /** Receives the raw option object, so entity fields are accessible. */
    getOptionLabel?: (option: any) => string;
    error?: boolean;
    helperText?: ReactNode;
    required?: boolean;
  };

/**
 * Dual-mode autocomplete:
 * - With `control` + `name`: react-hook-form controlled field (stores the
 *   selected option's value via `optionValue`).
 * - Without `control`: a thin typed wrapper around MUI Autocomplete — pass
 *   `value`/`onChange` yourself (e.g. from your own <Controller>). Raw
 *   option objects are passed through, so `getOptionLabel` sees the entity.
 */
export default function FormAutocomplete<T extends FieldValues>({
  name,
  control,
  rules,
  defaultValue,
  options,
  multiple = false,
  freeSolo = false,
  label,
  placeholder,
  disabled,
  optionValue = defaultOptionValue,
  optionLabel = defaultOptionLabel,
  error,
  helperText,
  onChange: userOnChange,
  value: userValue,
  getOptionLabel: userGetOptionLabel,
  ...autocompleteProps
}: FormAutocompleteProps<T>) {
  // --- Uncontrolled mode: forward raw options + user callbacks straight through.
  if (!control || !name) {
    const passthroughProps = {
      ...autocompleteProps,
      multiple,
      freeSolo,
      options: options as AnyOption[],
      disabled,
      value: userValue as AnyOption | AnyOption[] | null,
      getOptionLabel:
        userGetOptionLabel ?? ((option: unknown) => defaultOptionLabel(option as AnyOption)),
      onChange: (_: unknown, value: unknown) => userOnChange?.(value as never),
      renderTags: (tagValue: unknown, getTagProps: (props: { index: number }) => Record<string, unknown>) =>
        (tagValue as AnyOption[]).map((option, index) => (
          <Chip
            label={userGetOptionLabel ? userGetOptionLabel(option as never) : defaultOptionLabel(option)}
            size="small"
            {...(getTagProps({ index }) as object)}
          />
        )),
      renderInput: (params: object) => (
        <TextField
          {...(params as object)}
          label={label}
          placeholder={placeholder}
          error={Boolean(error)}
          helperText={helperText}
        />
      ),
    } as unknown as PassthroughAutocompleteProps;
    return (
      <FormControl fullWidth error={Boolean(error)}>
        <Autocomplete {...passthroughProps} />
      </FormControl>
    );
  }

  // --- RHF controlled mode.
  const findOption = (value: string | number): AnyOption | null => {
    const str = String(value);
    return (
      options.find((o) => String(optionValue(o)) === str) ??
      options.find((o) => String(asRecord(o).id ?? '') === str) ??
      null
    );
  };

  const renderedOptions: AutocompleteOption[] = options.map((o) => ({
    value: optionValue(o),
    label: optionLabel(o),
  }));

  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      defaultValue={defaultValue}
      render={({ field, fieldState }) => {
        const current: unknown = field.value;
        const currentValue = multiple
          ? (Array.isArray(current) ? current : []).map((v: string | number) => {
              const found = findOption(v);
              return found
                ? { value: optionValue(found), label: optionLabel(found) }
                : { value: v, label: String(v) };
            })
          : current == null || current === ''
            ? null
            : (() => {
                const found = findOption(current as string | number);
                return found
                  ? { value: optionValue(found), label: optionLabel(found) }
                  : { value: current as string | number, label: String(current) };
              })();

        const rhfProps = {
          ...autocompleteProps,
          multiple,
          freeSolo,
          options: renderedOptions,
          disabled,
          value: currentValue as AnyOption | AnyOption[] | null,
          onChange: (_: unknown, next: unknown) => {
            if (multiple) {
              field.onChange((next as Array<AutocompleteOption | string>).map(toStoredValue));
            } else if (next == null) {
              field.onChange(null);
            } else {
              field.onChange(toStoredValue(next as AutocompleteOption | string));
            }
          },
          onBlur: field.onBlur,
          isOptionEqualToValue: (option: unknown, candidate: unknown) =>
            String((option as AutocompleteOption).value) ===
            String((candidate as AutocompleteOption).value),
          renderTags: (tagValue: unknown, getTagProps: (props: { index: number }) => Record<string, unknown>) =>
            (tagValue as AutocompleteOption[]).map((option, index) => (
              <Chip
                label={option.label}
                size="small"
                {...(getTagProps({ index }) as object)}
              />
            )),
          renderInput: (params: object) => (
            <TextField
              {...(params as object)}
              label={label}
              placeholder={placeholder}
              error={Boolean(fieldState.error)}
              helperText={fieldState.error?.message}
              inputProps={{ ...(params as { inputProps?: object }).inputProps, 'aria-label': label }}
            />
          ),
        } as unknown as PassthroughAutocompleteProps;

        return (
          <FormControl fullWidth error={Boolean(fieldState.error)}>
            <Autocomplete {...rhfProps} />
            {fieldState.error && <FormHelperText>{fieldState.error.message}</FormHelperText>}
          </FormControl>
        );
      }}
    />
  );
}

const toStoredValue = (opt: AutocompleteOption | string): string | number =>
  typeof opt === 'string' ? opt : opt.value;
