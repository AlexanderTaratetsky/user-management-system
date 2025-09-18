import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db/index.js';
import { UserProfile } from '../src/models/userProfile.model.js';
import { env } from '../src/config/env.js';

jest.setTimeout(20000);

const ADMIN_SECRET = process.env.ADMIN_INVITE_SECRET || 'let-admins-in';

let app;

function formatBody(body) {
  if (body === undefined || body === null) return null;
  try {
    return JSON.parse(JSON.stringify(body));
  } catch (error) {
    return String(body);
  }
}

async function apiCall({ method, path, body, token, description }) {
  const normalizedMethod = method.toLowerCase();
  if (!['get', 'post', 'put', 'delete'].includes(normalizedMethod)) {
    throw new Error(`Unsupported method ${method}`);
  }

  const start = Date.now();
  let req = request(app)[normalizedMethod](path);
  if (token) {
    req = req.set('Authorization', `Bearer ${token}`);
  }
  if (body !== undefined) {
    req = req.send(body);
  }
  const res = await req;
  const duration = Date.now() - start;
  const logLine = `\n[TEST] ${normalizedMethod.toUpperCase()} ${path} :: ${description ?? 'no-description'} -> ${res.status} (${duration}ms)`;
  console.log(logLine);
  const loggedRequest = formatBody(body);
  if (loggedRequest) {
    console.log('  -> request:', loggedRequest);
  }
  if (res.body && Object.keys(res.body).length) {
    console.log('  -> response:', formatBody(res.body));
  } else if (res.text) {
    console.log('  -> responseText:', res.text.slice(0, 500));
  }
  return res;
}

const http = {
  get: (path, opts = {}) => apiCall({ method: 'get', path, ...opts }),
  post: (path, body, opts = {}) => apiCall({ method: 'post', path, body, ...opts }),
  put: (path, body, opts = {}) => apiCall({ method: 'put', path, body, ...opts }),
  delete: (path, opts = {}) => apiCall({ method: 'delete', path, ...opts })
};

beforeAll(async () => {
  process.env.JWT_SECRET = 'testsecret';
  process.env.ENABLE_METRICS = 'true';
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ums_auth?schema=public';
  process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ums_test';
  process.env.ADMIN_INVITE_SECRET = ADMIN_SECRET;

  env.jwtSecret = process.env.JWT_SECRET;
  env.enableMetrics = true;
  env.pgUrl = process.env.DATABASE_URL;
  env.mongoUri = process.env.MONGODB_URI;
  env.adminInviteSecret = process.env.ADMIN_INVITE_SECRET;

  app = await createApp();
});

beforeEach(async () => {
  await prisma.auditLog.deleteMany();
  await prisma.userAuth.deleteMany();
  await UserProfile.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('System endpoints', () => {
  it('exposes health and metrics endpoints', async () => {
    const health = await http.get('/health', { description: 'health check' });
    expect(health.status).toBe(200);
    expect(health.body.status).toBe('ok');

    const metrics = await http.get('/metrics', { description: 'metrics scrape' });
    expect(metrics.status).toBe(200);
    expect(metrics.headers['content-type']).toContain('text/plain');
    expect(metrics.text).toContain('process_cpu_user_seconds_total');
  });
});

describe('Authentication flows', () => {
  it('registers, logs in, and returns profile data', async () => {
    const registerRes = await http.post(
      '/auth/register',
      { name: 'Test User', email: 'user@test.dev', password: 'Password1!' },
      { description: 'register baseline user' }
    );
    expect(registerRes.status).toBe(201);
    expect(registerRes.body).toMatchObject({ role: 'USER' });
    const token = registerRes.body.token;

    const me = await http.get('/me', { token, description: 'fetch profile after registration' });
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ email: 'user@test.dev', role: 'USER', name: 'Test User' });

    const login = await http.post(
      '/auth/login',
      { email: 'user@test.dev', password: 'Password1!' },
      { description: 'login existing user' }
    );
    expect(login.status).toBe(200);
    expect(login.body.token).toBeTruthy();
    expect(login.body.role).toBe('USER');
  });

  it('rejects duplicate registrations with detailed error payload', async () => {
    await http.post(
      '/auth/register',
      { name: 'First', email: 'dup@test.dev', password: 'Password1!' },
      { description: 'create initial user for duplicate test' }
    );

    const dup = await http.post(
      '/auth/register',
      { name: 'Second', email: 'dup@test.dev', password: 'Password1!' },
      { description: 'attempt duplicate registration' }
    );

    expect(dup.status).toBe(409);
    expect(dup.body).toMatchObject({
      message: 'Email already registered',
      reason: 'EMAIL_EXISTS'
    });
  });

  it('blocks admin registration when secret missing or invalid', async () => {
    const missing = await http.post(
      '/auth/register',
      { name: 'No Secret', email: 'bad1@test.dev', password: 'Password1!', role: 'ADMIN' },
      { description: 'admin registration without secret' }
    );
    expect(missing.status).toBe(400);
    expect(missing.body).toMatchObject({ name: 'ValidationError', status: 400 });

    const invalid = await http.post(
      '/auth/register',
      {
        name: 'Wrong Secret',
        email: 'bad2@test.dev',
        password: 'Password1!',
        role: 'ADMIN',
        adminSecret: 'wrong'
      },
      { description: 'admin registration with wrong secret' }
    );
    expect(invalid.status).toBe(403);
    expect(invalid.body.reason).toBe('ADMIN_SECRET_INVALID');
  });
});

describe('Authenticated profile management', () => {
  async function seedUser(overrides = {}) {
    const payload = { name: 'Profile User', email: 'profile@test.dev', password: 'Password1!', ...overrides };
    const res = await http.post('/auth/register', payload, { description: 'seed user' });
    return { token: res.body.token, role: res.body.role, email: payload.email };
  }

  it('updates profile, email, and preferences across stores', async () => {
    const { token } = await seedUser();

    const update = await http.put(
      '/me',
      {
        name: 'Updated User',
        email: 'updated@test.dev',
        preferences: { theme: 'dark', language: 'es' }
      },
      { token, description: 'update profile details' }
    );

    expect(update.status).toBe(200);
    expect(update.body).toMatchObject({ name: 'Updated User', email: 'updated@test.dev', preferences: { theme: 'dark', language: 'es' } });

    const me = await http.get('/me', { token, description: 'fetch profile after update' });
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ name: 'Updated User', email: 'updated@test.dev', preferences: { theme: 'dark', language: 'es' } });

    const login = await http.post(
      '/auth/login',
      { email: 'updated@test.dev', password: 'Password1!' },
      { description: 'login with updated email' }
    );
    expect(login.status).toBe(200);
    expect(login.body.role).toBe('USER');
  });

  it('returns detailed error when validation fails', async () => {
    const { token } = await seedUser();

    const badUpdate = await http.put('/me', { email: 'not-an-email' }, { token, description: 'invalid email update' });

    expect(badUpdate.status).toBe(400);
    expect(badUpdate.body).toMatchObject({
      name: 'ValidationError',
      status: 400
    });
    expect(Array.isArray(badUpdate.body.details)).toBe(true);
  });

  it('deletes account and prevents further access', async () => {
    const { token } = await seedUser();

    const del = await http.delete('/me', { token, description: 'delete current account' });
    expect(del.status).toBe(204);

    const me = await http.get('/me', { token, description: 'fetch profile after deletion' });
    expect(me.status).toBe(404);
    expect(me.body.reason).toBe('PROFILE_NOT_FOUND');

    const login = await http.post(
      '/auth/login',
      { email: 'profile@test.dev', password: 'Password1!' },
      { description: 'login after deletion should fail' }
    );
    expect(login.status).toBe(401);
    expect(login.body.reason).toBe('INVALID_CREDENTIALS');
  });
});

describe('Authorization guards', () => {
  it('rejects missing or invalid tokens with detailed errors', async () => {
    const missing = await http.get('/me', { description: 'access profile without token' });
    expect(missing.status).toBe(401);
    expect(missing.body.reason).toBe('TOKEN_MISSING');

    const invalid = await http.get('/me', {
      token: 'invalidtoken',
      description: 'access profile with invalid token'
    });
    expect(invalid.status).toBe(401);
    expect(invalid.body.reason).toBe('TOKEN_INVALID');
    expect(invalid.body.details).toBeDefined();
  });

  it('requires admin role for admin endpoints', async () => {
    const user = await http.post(
      '/auth/register',
      { name: 'Standard User', email: 'std@test.dev', password: 'Password1!' },
      { description: 'register standard user' }
    );

    const forbidden = await http.get('/admin/users', {
      token: user.body.token,
      description: 'attempt admin list with user token'
    });
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.reason).toBe('ADMIN_REQUIRED');
  });

  it('allows admin access and returns all profiles', async () => {
    await http.post(
      '/auth/register',
      { name: 'User One', email: 'user1@test.dev', password: 'Password1!' },
      { description: 'register first standard user' }
    );

    const admin = await http.post(
      '/auth/register',
      {
        name: 'Admin',
        email: 'admin@test.dev',
        password: 'Password1!',
        role: 'ADMIN',
        adminSecret: ADMIN_SECRET
      },
      { description: 'register admin user' }
    );

    const list = await http.get('/admin/users', {
      token: admin.body.token,
      description: 'admin lists all profiles'
    });

    expect(list.status).toBe(200);
    expect(Array.isArray(list.body)).toBe(true);
    expect(list.body.length).toBeGreaterThanOrEqual(2);
    expect(list.body.find(u => u.email === 'admin@test.dev')?.role).toBe('ADMIN');
  });
});




