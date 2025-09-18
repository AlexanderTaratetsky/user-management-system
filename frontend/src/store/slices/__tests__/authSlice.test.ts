import { afterEach, describe, expect, it } from 'vitest';
import authReducer, { fetchMe, login, logout, register, setStatus } from '../authSlice';

describe('authSlice reducer', () => {
  afterEach(() => { localStorage.clear(); });

const initial = authReducer(undefined, { type: '@@INIT' });

  it('handles login lifecycle', () => {
    const loading = authReducer(initial, { type: login.pending.type });
    expect(loading.status).toBe('loading');
    expect(loading.message).toBe('Authenticating...');

    const success = authReducer(loading, {
      type: login.fulfilled.type,
      payload: { token: 'abc', role: 'ADMIN' }
    });
    expect(success.token).toBe('abc');
    expect(success.user?.role).toBe('ADMIN');
    expect(success.status).toBe('success');
    expect(localStorage.getItem('token')).toBe('abc');

    const failure = authReducer(initial, {
      type: login.rejected.type,
      payload: 'Bad credentials',
      error: { message: 'Bad credentials' }
    });
    expect(failure.status).toBe('error');
    expect(failure.message).toContain('Bad credentials');
  });

  it('stores profile data on fetchMe success and errors on rejection', () => {
    const profile = { name: 'Test', email: 'test@example.com', role: 'USER' as const };
    const loaded = authReducer(initial, { type: fetchMe.fulfilled.type, payload: profile });
    expect(loaded.user).toMatchObject(profile);
    expect(loaded.status).toBe('success');

    const rejected = authReducer(initial, {
      type: fetchMe.rejected.type,
      payload: 'Failed to load profile',
      error: { message: 'Failed to load profile' }
    });
    expect(rejected.status).toBe('error');
    expect(rejected.message).toContain('Failed to load profile');
  });

  it('resets state on logout', () => {
    const preloaded = {
      ...initial,
      token: 'token',
      user: { name: 'Jane' },
      status: 'success' as const,
      message: 'Loaded'
    };
    const loggedOut = authReducer(preloaded, logout());
    expect(loggedOut.token).toBeNull();
    expect(loggedOut.user).toBeNull();
    expect(loggedOut.status).toBe('idle');
  });

  it('allows manual status updates via setStatus', () => {
    const updated = authReducer(initial, setStatus({ status: 'error', message: 'Something went wrong' }));
    expect(updated.status).toBe('error');
    expect(updated.message).toBe('Something went wrong');
  });

  it('handles register success storing token', () => {
    const loading = authReducer(initial, { type: register.pending.type });
    expect(loading.status).toBe('loading');

    const success = authReducer(loading, {
      type: register.fulfilled.type,
      payload: { token: 'newtoken', role: 'USER' as const }
    });
    expect(success.token).toBe('newtoken');
    expect(success.status).toBe('success');
  });
});