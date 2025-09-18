import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAppDispatch, useAppSelector } from '../util/hooks';
import { fetchMe, logout, setStatus, type User } from '../store/slices/authSlice';
import { formatError } from '../util/errors';

export default function Profile() {
  const dispatch = useAppDispatch();
  const { status, user } = useAppSelector(state => state.auth);
  const [profile, setProfile] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [theme, setTheme] = useState('light');
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    (async () => {
      try {
        const me = await dispatch(fetchMe()).unwrap();
        setProfile(me);
        setName(me?.name ?? '');
        setEmail(me?.email ?? '');
        setTheme(me?.preferences?.theme ?? 'light');
        setLanguage(me?.preferences?.language ?? 'en');
      } catch (err) {
        const message = formatError(err, 'Unable to load profile');
        dispatch(setStatus({ status: 'error', message }));
      }
    })();
  }, [dispatch]);

  const save = async () => {
    try {
      dispatch(setStatus({ status: 'loading', message: 'Saving profile...' }));
      const { data } = await api.put<User>('/me', { name, email, preferences: { theme, language } });
      setProfile(data);
      setName(data?.name ?? '');
      setEmail(data?.email ?? '');
      setTheme(data?.preferences?.theme ?? 'light');
      setLanguage(data?.preferences?.language ?? 'en');
      dispatch(setStatus({ status: 'success', message: 'Profile updated' }));
    } catch (err) {
      const message = formatError(err, 'Failed to update profile');
      dispatch(setStatus({ status: 'error', message }));
    }
  };

  const del = async () => {
    try {
      dispatch(setStatus({ status: 'loading', message: 'Deleting account...' }));
      await api.delete('/me');
      dispatch(logout());
      dispatch(setStatus({ status: 'success', message: 'Account deleted' }));
      window.location.href = '/';
    } catch (err) {
      const message = formatError(err, 'Failed to delete account');
      dispatch(setStatus({ status: 'error', message }));
    }
  };

  if (!profile) {
    return <div className="card"><h2>Loading profile...</h2></div>;
  }

  return (
    <section className="card form-card">
      <h2>My Profile</h2>
      <p className="form-helper">Update personal information and preferences.</p>
      <p className="form-helper">Current role: <strong>{profile.role ?? user?.role ?? 'USER'}</strong></p>
      <div className="form-grid">
        <label>
          <span>Name</span>
          <input value={name} onChange={e => setName(e.target.value)} />
        </label>
        <label>
          <span>Email</span>
          <input value={email} onChange={e => setEmail(e.target.value)} />
        </label>
        <label>
          <span>Theme</span>
          <select value={theme} onChange={e => setTheme(e.target.value)}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <label>
          <span>Language</span>
          <input value={language} onChange={e => setLanguage(e.target.value)} />
        </label>
      </div>
      <div className="form-actions">
        <button className="btn primary" onClick={save} disabled={status === 'loading'}>
          {status === 'loading' ? 'Working...' : 'Save changes'}
        </button>
        <button className="btn danger" onClick={del} disabled={status === 'loading'}>
          Delete account
        </button>
      </div>
    </section>
  );
}