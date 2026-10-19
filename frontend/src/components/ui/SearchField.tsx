import { useEffect, useState } from 'react';
import { InputAdornment, TextField, type TextFieldProps } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import IconButton from '@mui/material/IconButton';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchFieldProps extends Omit<TextFieldProps, 'onChange'> {
  onSearch?: (value: string) => void;
  debounceMs?: number;
  /** Controlled mode: provide the current value and its setter. */
  value?: string;
  onChange?: (value: string) => void;
}

export default function SearchField({
  onSearch,
  debounceMs = 350,
  label = 'Search',
  placeholder,
  value: controlledValue,
  onChange: controlledOnChange,
  ...textFieldProps
}: SearchFieldProps) {
  const isControlled = controlledValue !== undefined;
  const [internal, setInternal] = useState('');
  const value = isControlled ? controlledValue : internal;
  const debounced = useDebounce(value, debounceMs);

  const setValue = (next: string) => {
    if (isControlled) {
      controlledOnChange?.(next);
    } else {
      setInternal(next);
    }
  };

  // Push debounced value changes to the parent.
  const [lastEmitted, setLastEmitted] = useState('');
  useEffect(() => {
    if (debounced !== lastEmitted && onSearch) {
      setLastEmitted(debounced);
      onSearch(debounced);
    }
  }, [debounced, lastEmitted, onSearch]);

  const clear = () => {
    setValue('');
    setLastEmitted('');
    onSearch?.('');
  };

  return (
    <TextField
      {...textFieldProps}
      size={textFieldProps.size ?? 'small'}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder={placeholder ?? (typeof label === 'string' ? label : 'Search')}
      aria-label={typeof label === 'string' ? label : 'Search'}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon fontSize="small" />
          </InputAdornment>
        ),
        endAdornment: value ? (
          <InputAdornment position="end">
            <IconButton aria-label="Clear search" size="small" onClick={clear}>
              <ClearIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        ) : undefined,
      }}
      sx={{ minWidth: 240, ...textFieldProps.sx }}
    />
  );
}
