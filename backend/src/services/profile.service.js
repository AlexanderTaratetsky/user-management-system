import { UserProfile } from '../models/userProfile.model.js';
import { prisma } from '../db/index.js';

export async function createProfile({ id, name, email, preferences = {} }) {
  return UserProfile.create({ _id: id, name, email, preferences });
}

export async function getProfile(id) {
  const profile = await UserProfile.findById(id).lean();
  if (!profile) return null;
  const auth = await prisma.userAuth.findUnique({ where: { id }, select: { role: true, email: true } });
  return {
    ...profile,
    email: auth?.email ?? profile.email,
    role: auth?.role ?? 'USER'
  };
}

export async function updateProfile(id, patch) {
  const updated = await UserProfile.findByIdAndUpdate(id, patch, { new: true, runValidators: true }).lean();
  if (!updated) return null;
  const auth = await prisma.userAuth.findUnique({ where: { id }, select: { role: true, email: true } });
  return {
    ...updated,
    email: auth?.email ?? updated.email,
    role: auth?.role ?? 'USER'
  };
}

export async function deleteProfile(id) {
  return UserProfile.findByIdAndDelete(id);
}

export async function listProfiles() {
  const [profiles, auths] = await Promise.all([
    UserProfile.find({}, { __v: 0 }).lean(),
    prisma.userAuth.findMany({ select: { id: true, role: true, email: true } })
  ]);
  const authMap = new Map(auths.map(auth => [auth.id, auth]));
  return profiles.map(profile => {
    const auth = authMap.get(String(profile._id));
    return {
      ...profile,
      email: auth?.email ?? profile.email,
      role: auth?.role ?? 'USER'
    };
  });
}