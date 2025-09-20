import { useEffect, useState } from 'react';
import api from '../lib/api';
import { io } from 'socket.io-client';
import { useAppDispatch, useAppSelector } from '../util/hooks';
import { setStatus } from '../store/slices/authSlice';
import { formatError } from '../util/errors';

interface AdminProfile {
  _id: string;
  name: string;
  email: string;
  preferences?: { theme?: string; language?: string };
  role?: 'USER' | 'ADMIN';
}

export default function AdminUsers() {
  const dispatch = useAppDispatch();
  const { status, user } = useAppSelector(state => state.auth);
  const [users, setUsers] = useState<AdminProfile[]>([]);

  useEffect(() => {
    if (!user) {
      dispatch(setStatus({ status: 'loading', message: 'Awaiting user context before loading admin data...' }));
      return;
    }
    if (user.role !== 'ADMIN') {
      dispatch(setStatus({ status: 'error', message: 'Admin privileges required to view user directory.' }));
      return;
    }

    let sock: ReturnType<typeof io> | undefined;

    const fetchUsers = async () => {
      try {
        dispatch(setStatus({ status: 'loading', message: 'Fetching users...' }));
        const { data } = await api.get<AdminProfile[]>('/admin/users');
        setUsers(data);
        dispatch(setStatus({ status: 'success', message: 'Loaded ' + data.length + ' users' }));
      } catch (err) {
        const message = formatError(err, 'Failed to load users');
        dispatch(setStatus({ status: 'error', message }));
      }
    };

    fetchUsers();

    const socketUrl = import.meta.env.VITE_API_URL || (window.location.protocol + '//' + window.location.hostname + ':4000');
    sock = io(socketUrl);
    sock.on('heartbeat', ts => {
      const time = new Date(ts).toLocaleTimeString();
      dispatch(setStatus({ status: 'success', message: 'Realtime heartbeat ' + time }));
    });

    return () => {
      sock?.close();
    };
  }, [dispatch, user]);

  return (
    <section className="card">
      <div className="card-header">
        <h2>All Users (Admin)</h2>
        <span className="badge">{users.length} total</span>
      </div>
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Theme</th>
              <th>Language</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-state">
                  {status === 'loading' ? 'Loading...' : 'No users available'}
                </td>
              </tr>
            ) : (
              users.map(userRow => (
                <tr key={userRow._id}>
                  <td>{userRow.name}</td>
                  <td>{userRow.email}</td>
                  <td>{userRow.role ?? 'USER'}</td>
                  <td>{userRow.preferences?.theme ?? 'light'}</td>
                  <td>{userRow.preferences?.language ?? 'en'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
