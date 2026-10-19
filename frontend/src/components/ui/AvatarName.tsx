import { Avatar, Stack, Typography } from '@mui/material';
import { initialsOf } from '@/utils/format';

interface AvatarNameProps {
  first?: string | null;
  last?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  size?: number;
  showEmail?: boolean;
  direction?: 'row' | 'row-reverse';
}

export default function AvatarName({
  first,
  last,
  email,
  avatarUrl,
  size = 32,
  showEmail = false,
  direction = 'row',
}: AvatarNameProps) {
  const name = [first, last].filter(Boolean).join(' ') || '—';
  return (
    <Stack direction={direction} spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
      <Avatar
        src={avatarUrl ?? undefined}
        alt={name}
        sx={{ width: size, height: size, bgcolor: 'primary.main', fontSize: size * 0.4 }}
      >
        {initialsOf(first, last)}
      </Avatar>
      <Stack sx={{ minWidth: 0 }} spacing={0}>
        <Typography variant="body2" noWrap fontWeight={500}>
          {name}
        </Typography>
        {showEmail && email && (
          <Typography variant="caption" color="text.secondary" noWrap>
            {email}
          </Typography>
        )}
      </Stack>
    </Stack>
  );
}
