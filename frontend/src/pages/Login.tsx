import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAppDispatch, useAppSelector } from '../util/hooks';
import { login, fetchMe, setStatus } from '../store/slices/authSlice';
import { useNavigate, Link } from 'react-router-dom';
import { formatError } from '../util/errors';

const schema = z.object({ email: z.string().email(), password: z.string().min(8) });

type FormData = z.infer<typeof schema>;

export default function Login() {
  const {
    register: formRegister,
    handleSubmit,
    formState: { errors }
  } = useForm<FormData>({ resolver: zodResolver(schema) });
  const dispatch = useAppDispatch();
  const { status } = useAppSelector(state => state.auth);
  const nav = useNavigate();

  const onSubmit = async (data: FormData) => {
    try {
      await dispatch(login(data)).unwrap();
      await dispatch(fetchMe()).unwrap();
      dispatch(setStatus({ status: 'success', message: 'Logged in and profile fetched' }));
      nav('/profile');
    } catch (err) {
      const message = formatError(err, 'Login failed');
      dispatch(setStatus({ status: 'error', message }));
    }
  };

  return (
    <section className="card form-card">
      <h2>Login</h2>
      <p className="form-helper">Sign in with your email and password.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="form-grid">
        <label>
          <span>Email</span>
          <input placeholder="Email" {...formRegister('email')} />
          {errors.email && (
            <small className="error-text" title={`${errors.email.type}: ${errors.email.message}`}>
              {errors.email.type}: {errors.email.message}
            </small>
          )}
        </label>
        <label>
          <span>Password</span>
          <input placeholder="Password" type="password" {...formRegister('password')} />
          {errors.password && (
            <small className="error-text" title={`${errors.password.type}: ${errors.password.message}`}>
              {errors.password.type}: {errors.password.message}
            </small>
          )}
        </label>
        <button className="btn primary" type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Working...' : 'Login'}
        </button>
      </form>
      <p className="form-footer">
        Need an account? <Link to="/register">Register</Link>
      </p>
    </section>
  );
}