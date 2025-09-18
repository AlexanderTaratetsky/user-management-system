import { Router } from 'express';
import bcrypt from 'bcrypt';
import { parseBody, registerSchema, loginSchema } from '../lib/validate.js';
import { createUserAuth, findUserByEmail } from '../services/auth.service.js';
import { createProfile } from '../services/profile.service.js';
import { signJwt } from '../lib/jwt.js';
import { audit } from '../lib/audit.js';
import { prisma } from '../db/index.js';
import { env } from '../config/env.js';

export const authRouter = Router();

authRouter.post('/register', async (req, res, next) => {
  try {
    const data = parseBody(registerSchema, req.body);

    if (data.role === 'ADMIN') {
      if (!env.adminInviteSecret) {
        const err = new Error('Administrator registration is disabled');
        err.status = 403;
        err.reason = 'ADMIN_REGISTRATION_DISABLED';
        throw err;
      }
      if (data.adminSecret !== env.adminInviteSecret) {
        const err = new Error('Invalid administrator registration secret');
        err.status = 403;
        err.reason = 'ADMIN_SECRET_INVALID';
        throw err;
      }
    }

    const exists = await findUserByEmail(data.email);
    if (exists) {
      return res.status(409).json({ message: 'Email already registered', reason: 'EMAIL_EXISTS' });
    }

    const { adminSecret, ...userData } = data;
    const user = await createUserAuth({ email: userData.email, password: userData.password, role: userData.role });

    try {
      await createProfile({ id: user.id, name: userData.name, email: userData.email });
    } catch (e) {
      await audit({ userId: user.id, action: 'rollback_profile_fail' });
      await prisma.userAuth.delete({ where: { id: user.id } }).catch(() => {});
      throw e;
    }

    const token = signJwt({ sub: user.id, role: user.role });
    await audit({
      userId: user.id,
      action: user.role === 'ADMIN' ? 'register_admin' : 'register',
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    res.status(201).json({ token, role: user.role });
  } catch (e) {
    next(e);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const data = parseBody(loginSchema, req.body);
    const user = await findUserByEmail(data.email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials', reason: 'INVALID_CREDENTIALS' });
    }
    const ok = await bcrypt.compare(data.password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials', reason: 'INVALID_CREDENTIALS' });
    }
    const token = signJwt({ sub: user.id, role: user.role });
    await audit({ userId: user.id, action: 'login', ip: req.ip, userAgent: req.get('user-agent') });
    res.json({ token, role: user.role });
  } catch (e) {
    next(e);
  }
});