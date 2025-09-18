import { prisma } from '../db/index.js';

export async function audit({ userId = null, action, ip, userAgent }) {
  try {
    await prisma.auditLog.create({ data: { userId, action, ip, userAgent } });
  } catch (_) {
    // best-effort only
  }
}
