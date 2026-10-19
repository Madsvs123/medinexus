import { useState, type ReactNode } from 'react';
import { Box, Tab, Tabs, type TabProps, type TabsProps } from '@mui/material';

export interface TabDef {
  value: string;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}

interface TabsViewProps {
  tabs: TabDef[];
  value?: string;
  onChange?: (value: string) => void;
  children?: ReactNode;
  ariaLabel?: string;
  variant?: TabsProps['variant'];
}

export default function TabsView({
  tabs,
  value,
  onChange,
  children,
  ariaLabel = 'View tabs',
  variant = 'scrollable',
}: TabsViewProps) {
  const [internal, setInternal] = useState<string>(tabs[0]?.value ?? '');

  const active = value ?? internal;

  const handleChange = (_: React.SyntheticEvent, next: string) => {
    if (onChange) {
      onChange(next);
    } else {
      setInternal(next);
    }
  };

  return (
    <Box>
      <Tabs
        value={active}
        onChange={handleChange}
        variant={variant}
        scrollButtons="auto"
        aria-label={ariaLabel}
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.value}
            value={tab.value}
            label={tab.label as string | React.ReactElement}
            icon={tab.icon as React.ReactElement | undefined}
            iconPosition="start"
            disabled={tab.disabled}
          />
        ))}
      </Tabs>
      {children}
    </Box>
  );
}
