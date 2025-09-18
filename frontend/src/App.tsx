import { Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, type ReactElement } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import AdminUsers from './pages/AdminUsers';
import StatusBar from './components/StatusBar';
import { useAppDispatch, useAppSelector } from './util/hooks';
import { fetchMe, logout, setStatus } from './store/slices/authSlice';

function Protected({ children, requiredRole }: { children: ReactElement; requiredRole?: 'USER' | 'ADMIN' }) {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const { token, user, status } = useAppSelector(state => state.auth);

  useEffect(() => {
    if (token && !user && status !== 'loading') {
      dispatch(fetchMe());
    }
  }, [dispatch, token, user, status]);

  useEffect(() => {
    if (requiredRole && user && user.role !== requiredRole) {
      dispatch(
        setStatus({
          status: 'error',
          message: `Access requires ${requiredRole} privileges. Current role: ${user.role ?? 'unknown'}.`
        })
      );
    }
  }, [dispatch, requiredRole, user]);

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (requiredRole && user && user.role !== requiredRole) {
    return <Navigate to="/profile" replace />;
  }

  if (requiredRole && !user) {
    return <div className="card"><h2>Loading authorization...</h2></div>;
  }

  return children;
}

const links = [
  { to: '/', label: 'Home' },
  { to: '/profile', label: 'Profile' },
  { to: '/admin/users', label: 'Admin', requireRole: 'ADMIN' as const }
];

export default function App() {
  const dispatch = useAppDispatch();
  const { user, token } = useAppSelector(state => state.auth);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (token && !user) {
      dispatch(fetchMe());
    }
  }, [dispatch, token, user]);

  const handleLogout = () => {
    dispatch(logout());
    dispatch(setStatus({ status: 'success', message: 'Logged out' }));
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="inner">
          <div className="brand">
            <h1>User Management System</h1>
            <p className="subtitle">Full-stack reference portal</p>
          </div>
          <div className="user-info">
            {user?.name ? (
              <>
                <span>Signed in as <strong>{user.name}</strong></span>
                <button type="button" className="btn ghost" onClick={handleLogout}>
                  Logout
                </button>
              </>
            ) : (
              <span>Guest session</span>
            )}
          </div>
        </div>
        <nav className="app-nav">
          {links.map(link => {
            if (link.requireRole && user?.role !== link.requireRole) {
              return null;
            }
            return (
              <Link
                key={link.to}
                to={link.to}
                className={location.pathname === link.to ? 'active' : ''}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="app-main">
        <div className="inner">
          <Routes>
            <Route path="/" element={<div className="card welcome-card"><h2>Welcome</h2><p>Select an option above to get started.</p></div>} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/profile" element={<Protected><Profile /></Protected>} />
            <Route path="/admin/users" element={<Protected requiredRole="ADMIN"><AdminUsers /></Protected>} />
          </Routes>
        </div>
      </main>
      <StatusBar />
    </div>
  );
}

