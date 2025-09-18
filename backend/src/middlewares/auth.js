import { verifyJwt } from '../lib/jwt.js';

export function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ message: 'Missing token', reason: 'TOKEN_MISSING', status: 401 });
    }
    const payload = verifyJwt(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (error) {
    const details = error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { message: 'Unknown JWT verification exception' };
    return res.status(401).json({
      message: 'Invalid or expired token',
      reason: 'TOKEN_INVALID',
      status: 401,
      details
    });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Forbidden', reason: 'ADMIN_REQUIRED', status: 403 });
  }
  next();
}