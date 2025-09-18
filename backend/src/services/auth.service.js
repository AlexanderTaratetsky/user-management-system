import bcrypt from 'bcrypt';
import { prisma } from '../db/index.js';

export async function createUserAuth({ email, password, role = 'USER' }) {
  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.userAuth.create({ data: { email, passwordHash, role } });
}

export async function findUserByEmail(email) {
  return prisma.userAuth.findUnique({ where: { email } });
}

export async function updateUserEmail(id, email) {
  return prisma.userAuth.update({ where: { id }, data: { email } });
}

export async function deleteUserAuth(id) {
  return prisma.userAuth.delete({ where: { id } });
}
