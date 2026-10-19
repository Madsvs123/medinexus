import { useRef, useState } from 'react';
import { Box, IconButton, InputBase, Paper, Tooltip, Typography } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';

interface ChatBoxProps {
  onSend: (body: string, file?: File | null) => void | Promise<void>;
  disabled?: boolean;
  onTyping?: () => void;
  placeholder?: string;
  busy?: boolean;
}

export default function ChatBox({ onSend, disabled, onTyping, placeholder = 'Type a message…', busy }: ChatBoxProps) {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    const body = text.trim();
    if ((!body && !file) || disabled) return;
    await onSend(body, file);
    setText('');
    setFile(null);
  };

  return (
    <Paper variant="outlined" sx={{ p: 1, display: 'flex', alignItems: 'flex-end', gap: 1 }}>
      <input
        ref={inputRef}
        type="file"
        hidden
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <Tooltip title="Attach file">
        <IconButton aria-label="Attach file" size="small" onClick={() => inputRef.current?.click()}>
          <AttachFileIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Box sx={{ flex: 1 }}>
        {file && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <Typography variant="caption" noWrap sx={{ maxWidth: 240 }}>
              📎 {file.name}
            </Typography>
            <IconButton aria-label="Remove attachment" size="small" onClick={() => setFile(null)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
        <InputBase
          fullWidth
          multiline
          maxRows={4}
          placeholder={placeholder}
          value={text}
          disabled={disabled}
          onChange={(e) => {
            setText(e.target.value);
            onTyping?.();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          inputProps={{ 'aria-label': 'Message body' }}
        />
      </Box>
      <Tooltip title={busy ? 'Sending…' : 'Send'}>
        <span>
          <IconButton aria-label="Send message" color="primary" disabled={disabled || busy || (!text.trim() && !file)} onClick={() => void submit()}>
            <SendIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Paper>
  );
}
