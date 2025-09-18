import 'dotenv/config';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

import { prisma, connectDbs } from '../src/db/index.js';
import { UserProfile } from '../src/models/userProfile.model.js';
import { env } from '../src/config/env.js';

const users = [
  {
    name: 'System Administrator',
    email: 'admin@local.test',
    password: process.env.SEED_ADMIN_PASSWORD || 'AdminPass1!',
    role: 'ADMIN',
    preferences: { theme: 'dark', language: 'en' }
  },
  {
    name: 'Jane Doe',
    email: 'jane@local.test',
    password: 'UserPass1!',
    role: 'USER',
    preferences: { theme: 'light', language: 'en' }
  },
  {
    name: 'John Smith',
    email: 'john@local.test',
    password: 'UserPass1!',
    role: 'USER',
    preferences: { theme: 'dark', language: 'fr' }
  }
];

async function ensureDatabases() {
  if (!env.pgUrl) {
    throw new Error('DATABASE_URL is not configured.');
  }
  if (!env.mongoUri) {
    throw new Error('MONGODB_URI is not configured.');
  }

  await connectDbs();
}

async function seedUser(user) {
  const passwordHash = await bcrypt.hash(user.password, 12);

  const auth = await prisma.userAuth.upsert({
    where: { email: user.email },
    update: { passwordHash, role: user.role },
    create: {
      email: user.email,
      passwordHash,
      role: user.role
    }
  });

  await UserProfile.findByIdAndUpdate(
    auth.id,
    {
      _id: auth.id,
      name: user.name,
      email: user.email,
      preferences: user.preferences
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  return auth;
}

async function main() {
  console.log('[seed] Starting seed process...');
  await ensureDatabases();

  const results = [];
  for (const user of users) {
    const auth = await seedUser(user);
    results.push({ email: user.email, role: auth.role, id: auth.id });
    console.log(`[seed] Upserted ${user.role} account for ${user.email}`);
  }

  if (env.adminInviteSecret) {
    console.log(`[seed] Admin invite secret is configured: ${env.adminInviteSecret}`);
  } else {
    console.warn('[seed] ADMIN_INVITE_SECRET is not set. Admin registrations may be blocked.');
  }

  return results;
}

main()
  .then(results => {
    console.log('[seed] Completed. Seeded users:');
    for (const res of results) {
      console.log(`  - ${res.email} (${res.role}) [${res.id}]`);
    }
  })
  .catch(err => {
    console.error('[seed] Failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });
