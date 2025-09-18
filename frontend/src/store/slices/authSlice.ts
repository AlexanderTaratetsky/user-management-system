import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import api from '../../lib/api';
import { formatError } from '../../util/errors';

export interface User {
  id?: string;
  name?: string;
  email?: string;
  preferences?: any;
  role?: 'USER' | 'ADMIN';
}

type Status = 'idle' | 'loading' | 'error' | 'success';

interface State {
  token: string | null;
  user: User | null;
  status: Status;
  message: string;
  lastError?: string;
}

const initialState: State = {
  token: localStorage.getItem('token'),
  user: null,
  status: 'idle',
  message: 'Ready'
};

export const fetchMe = createAsyncThunk<User, void, { rejectValue: string }>('auth/me', async (_, thunkApi) => {
  try {
    const { data } = await api.get<User>('/me');
    return data;
  } catch (err) {
    return thunkApi.rejectWithValue(formatError(err, 'Failed to load profile'));
  }
});

interface AuthPayload {
  token: string;
  role?: 'USER' | 'ADMIN';
}

export const login = createAsyncThunk<AuthPayload, { email: string; password: string }, { rejectValue: string }>(
  'auth/login',
  async (body, thunkApi) => {
    try {
      const { data } = await api.post<AuthPayload>('/auth/login', body);
      return data;
    } catch (err) {
      return thunkApi.rejectWithValue(formatError(err, 'Login failed'));
    }
  }
);

export const register = createAsyncThunk<
  AuthPayload,
  { name: string; email: string; password: string; role: 'USER' | 'ADMIN'; adminSecret?: string },
  { rejectValue: string }
>('auth/register', async (body, thunkApi) => {
  try {
    const payload = { ...body };
    if (payload.role === 'USER') {
      delete payload.adminSecret;
    }
    const { data } = await api.post<AuthPayload>('/auth/register', payload);
    return data;
  } catch (err) {
    return thunkApi.rejectWithValue(formatError(err, 'Registration failed'));
  }
});

const slice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.token = null;
      state.user = null;
      state.status = 'idle';
      state.message = 'Logged out';
      state.lastError = undefined;
      localStorage.removeItem('token');
    },
    setStatus(state, action: PayloadAction<{ status: Status; message?: string }>) {
      state.status = action.payload.status;
      state.message = action.payload.message ?? state.message;
      if (action.payload.status !== 'error') {
        state.lastError = undefined;
      }
    }
  },
  extraReducers: builder => {
    builder
      .addCase(login.pending, state => {
        state.status = 'loading';
        state.message = 'Authenticating...';
        state.lastError = undefined;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.status = 'success';
        state.message = 'Logged in successfully';
        state.user = { ...(state.user ?? {}), role: action.payload.role };
        state.lastError = undefined;
        localStorage.setItem('token', action.payload.token);
      })
      .addCase(login.rejected, (state, action) => {
        const message = action.payload || action.error.message || 'Login failed';
        state.status = 'error';
        state.message = message;
        state.lastError = message;
      })
      .addCase(register.pending, state => {
        state.status = 'loading';
        state.message = 'Creating account...';
        state.lastError = undefined;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.status = 'success';
        state.message = 'Account created successfully';
        state.user = { ...(state.user ?? {}), role: action.payload.role };
        state.lastError = undefined;
        localStorage.setItem('token', action.payload.token);
      })
      .addCase(register.rejected, (state, action) => {
        const message = action.payload || action.error.message || 'Registration failed';
        state.status = 'error';
        state.message = message;
        state.lastError = message;
      })
      .addCase(fetchMe.pending, state => {
        state.status = 'loading';
        state.message = 'Loading profile...';
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = 'success';
        state.message = 'Profile loaded';
      })
      .addCase(fetchMe.rejected, (state, action) => {
        const message = action.payload || action.error.message || 'Failed to load profile';
        state.status = 'error';
        state.message = message;
        state.lastError = message;
      });
  }
});

export const { logout, setStatus } = slice.actions;
export default slice.reducer;