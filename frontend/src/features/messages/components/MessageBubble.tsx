import { Box, Paper, Typography } from '@mui/material';
import { formatDateTime } from '../../../utils/format';
import type { ChatMessage } from '../types';
import { userName } from '../types';

function absoluteUrl(url: string): string {
  if (/^https?:\/\//.test(url)) return url;
  return `${window.location.origin}${url}`;
}

export default function MessageBubble({ message, mine }: { message: ChatMessage; mine: boolean }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', mb: 1 }}>
      <Paper
        variant="outlined"
        sx={{
          maxWidth: '70%',
          px: 1.5,
          py: 1,
          bgcolor: mine ? 'primary.main' : 'background.paper',
          color: mine ? 'primary.contrastText' : 'text.primary',
          borderColor: mine ? 'primary.main' : undefined,
        }}
      >
        {!mine && (
          <Typography variant="caption" color={mine ? 'inherit' : 'text.secondary'} fontWeight={600}>
            {userName(message.sender)}
          </Typography>
        )}
        {message.body && <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{message.body}</Typography>}
        {message.attachment && (
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            <a
              href={absoluteUrl(message.attachment)}
              target="_blank"
              rel="noreferrer"
              style={{ color: mine ? '#fff' : undefined }}
            >
              📎 Attachment
            </a>
          </Typography>
        )}
        <Typography variant="caption" sx={{ opacity: 0.75, display: 'block', textAlign: 'right' }}>
          {formatDateTime(message.sent_at)}
        </Typography>
      </Paper>
    </Box>
  );
}
