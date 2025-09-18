import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAppDispatch, useAppSelector } from '../util/hooks';
import { register as doRegister, fetchMe, setStatus } from '../store/slices/authSlice';
import { useNavigate, Link } from 'react-router-dom';
import { formatError } from '../util/errors';

const schema = z
  .object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(['USER', 'ADMIN']),
    adminSecret: z.string().optional()
  })
  .superRefine((data, ctx) => {
    if (data.role === 'ADMIN' && (!data.adminSecret || data.adminSecret.trim().length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['adminSecret'],
        message: 'Admin secret is required for administrator registration'
      });
    }
  });

type FormData = z.infer<typeof schema>;

export default function Register() {
  const {
    register: formRegister,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { role: 'USER' } });
  const dispatch = useAppDispatch();
  const { status } = useAppSelector(state => state.auth);
  const nav = useNavigate();
  const selectedRole = watch('role');

  const onSubmit = async (data: FormData) => {
    try {
      await dispatch(
        doRegister({
          name: data.name,
          email: data.email,
          password: data.password,
          role: data.role,
          adminSecret: data.role === 'ADMIN' ? data.adminSecret : undefined
        })
      ).unwrap();
      await dispatch(fetchMe()).unwrap();
      dispatch(setStatus({ status: 'success', message: 'Account created and profile loaded' }));
      nav('/profile');
    } catch (err) {
      const message = formatError(err, 'Registration failed');
      dispatch(setStatus({ status: 'error', message }));
    }
  };

  return (
    <section className="card form-card">
      <h2>Register</h2>
      <p className="form-helper">Create an administrator or standard user account.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="form-grid">
        <label>
          <span>Name</span>
          <input placeholder="Name" {...formRegister('name')} />
          {errors.name && (
            <small className="error-text" title={`${errors.name.type}: ${errors.name.message}`}>
              {errors.name.type}: {errors.name.message}
            </small>
          )}
        </label>
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
        <label>
          <span>Role</span>
          <select {...formRegister('role')}>
            <option value="USER">Standard user</option>
            <option value="ADMIN">Administrator</option>
          </select>
        </label>
        {selectedRole === 'ADMIN' && (
          <label>
            <span>Admin secret</span>
            <input placeholder="Admin secret" type="password" {...formRegister('adminSecret')} />
            {errors.adminSecret && (
              <small className="error-text" title={`${errors.adminSecret.type}: ${errors.adminSecret.message}`}>
                {errors.adminSecret.type}: {errors.adminSecret.message}
              </small>
            )}
          </label>
        )}
        <button className="btn primary" type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Working...' : 'Create account'}
        </button>
      </form>
      <p className="form-footer">
        Have an account? <Link to="/login">Login</Link>
      </p>
    </section>
  );
}
