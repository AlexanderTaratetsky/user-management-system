import mongoose from 'mongoose';
import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

export const prisma = new PrismaClient();

export async function connectDbs() {
  await mongoose.connect(env.mongoUri);
}
