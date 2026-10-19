import { useState } from 'react';
import {
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';

export interface ActionItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  dividerBefore?: boolean;
}

interface ActionMenuProps {
  actions: ActionItem[];
  ariaLabel?: string;
}

export default function ActionMenu({ actions, ariaLabel = 'Actions' }: ActionMenuProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const handleClose = () => setAnchorEl(null);

  return (
    <>
      <Tooltip title="More actions">
        <IconButton
          aria-label={ariaLabel}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
          onClick={(e) => {
            e.stopPropagation();
            setAnchorEl(e.currentTarget);
          }}
          size="small"
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={(e) => e.stopPropagation()}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {actions.map((action, i) => (
          <MenuItem
            key={`${action.label}-${i}`}
            disabled={action.disabled}
            onClick={() => {
              handleClose();
              action.onClick();
            }}
            sx={action.destructive ? { color: 'error.main' } : undefined}
            divider={action.dividerBefore}
          >
            {action.icon && <ListItemIcon sx={{ color: 'inherit' }}>{action.icon}</ListItemIcon>}
            <ListItemText>{action.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
