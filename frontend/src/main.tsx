import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';
import { SnackbarProvider, useSnackbar } from 'notistack';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { ThemeContextProvider } from './theme-context';
import { store } from './app/store';
import { router } from './app/router';
import { useNotificationsSocket } from './features/notifications/useNotificationsSocket';

function SocketBridge() {
  useNotificationsSocket();
  return null;
}

function SnackbarCloseButton({ id }: { id: string | number }) {
  const { closeSnackbar } = useSnackbar();
  return (
    <IconButton
      size="small"
      aria-label="Dismiss notification"
      color="inherit"
      onClick={() => closeSnackbar(id)}
    >
      <CloseIcon fontSize="small" />
    </IconButton>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeContextProvider>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <SnackbarProvider
            maxSnack={4}
            autoHideDuration={4000}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            action={(snackbarId) => <SnackbarCloseButton id={snackbarId} />}
          >
            <SocketBridge />
            <RouterProvider router={router} />
          </SnackbarProvider>
        </LocalizationProvider>
      </ThemeContextProvider>
    </Provider>
  </StrictMode>,
);
