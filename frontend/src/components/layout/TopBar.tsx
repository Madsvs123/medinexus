import { useState } from 'react';
import {
  Box,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate } from 'react-router-dom';
import NotificationBell from '@/features/notifications/NotificationBell';
import ThemeToggle from './ThemeToggle';
import UserMenu from './UserMenu';

interface TopBarProps {
  onMenuToggle?: () => void;
}

export default function TopBar({ onMenuToggle }: TopBarProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
      setQuery('');
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
      {isMobile && onMenuToggle && (
        <IconButton edge="start" color="inherit" aria-label="Open navigation menu" onClick={onMenuToggle}>
          <MenuIcon />
        </IconButton>
      )}

      <Box component="form" onSubmit={submitSearch} sx={{ flex: 1, maxWidth: 480 }} role="search">
        <TextField
          size="small"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search patients, invoices, medications…"
          aria-label="Global search"
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 6,
              bgcolor: theme.palette.mode === 'dark' ? '#1E293B' : 'action.hover',
            },
          }}
        />
      </Box>

      <Box sx={{ flexGrow: 1 }} />

      <Tooltip title="Notifications">
        <NotificationBell />
      </Tooltip>
      <ThemeToggle />
      <UserMenu />
    </Box>
  );
}
