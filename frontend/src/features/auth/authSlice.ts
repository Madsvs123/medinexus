import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@/types/api';
import { TOKEN_STORAGE_KEY } from '@/app/api/baseApi';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
}

function readInitialTokens(): { accessToken: string | null; refreshToken: string | null } {
  try {
    const raw = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return { accessToken: null, refreshToken: null };
    const parsed = JSON.parse(raw) as { access?: string; refresh?: string };
    return { accessToken: parsed.access ?? null, refreshToken: parsed.refresh ?? null };
  } catch {
    return { accessToken: null, refreshToken: null };
  }
}

const initialTokens = readInitialTokens();

const initialState: AuthState = {
  accessToken: initialTokens.accessToken,
  refreshToken: initialTokens.refreshToken,
  user: null,
  isAuthenticated: Boolean(initialTokens.accessToken),
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(
      state,
      action: PayloadAction<{ accessToken: string; refreshToken: string; user: User }>,
    ) {
      const { accessToken, refreshToken, user } = action.payload;
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      state.user = user;
      state.isAuthenticated = true;
    },
    setTokens(
      state,
      action: PayloadAction<{ accessToken: string; refreshToken: string }>,
    ) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;
    },
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
    },
    clearTokens(state) {
      state.accessToken = null;
      state.refreshToken = null;
      state.user = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setCredentials, setTokens, setUser, clearTokens } = authSlice.actions;
export default authSlice.reducer;
