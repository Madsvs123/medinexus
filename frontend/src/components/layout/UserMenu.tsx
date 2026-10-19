import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import { enqueueSnackbar } from 'notistack';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { clearTokens } from '@/features/auth/authSlice';
import { clearStoredTokens } from '@/app/api/baseApi';
import { initialsOf } from '@/utils/format';

export default function UserMenu() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const name = user ? `${user.first_name} ${user.last_name}` : 'Guest';

  const handleLogout = () => {
    clearStoredTokens();
    dispatch(clearTokens());
    enqueueSnackbar('Signed out.', { variant: 'info' });
    navigate('/login', { replace: true });
  };

  return (
    <>
      <Tooltip title="Account">
        <IconButton
          onClick={(e) => setAnchorEl(e.currentTarget)}
          aria-label="Account menu"
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
          size="small"
          sx={{ ml: 0.5 }}
        >
          <Avatar sx={{ width: 34, height: 34, bgcolor: 'secondary.main', fontSize: 14 }}>
            {initialsOf(user?.first_name, user?.last_name)}
          </Avatar>
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem disabled sx={{ opacity: 1 }}>
          <ListItemText
            primary={
              <Typography variant="body2" fontWeight={600} noWrap>
                {name}
              </Typography>
            }
            secondary={
              <Typography variant="caption" color="text.secondary" noWrap>
                {user?.email}
              </Typography>
            }
          />
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            navigate('/profile');
          }}
        >
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Profile</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText sx={{ color: 'error.main' }}>Sign out</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
