import { z } from 'zod';

export const registerSchema = z
  .object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(['USER', 'ADMIN']).default('USER'),
    adminSecret: z.string().optional()
  })
  .superRefine((data, ctx) => {
    if (data.role === 'ADMIN' && (!data.adminSecret || data.adminSecret.trim().length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['adminSecret'],
        message: 'Admin secret is required when registering an administrator account'
      });
    }
  });

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  preferences: z
    .object({ theme: z.enum(['light', 'dark']).optional(), language: z.string().optional() })
    .optional()
});

export function parseBody(schema, body) {
  const res = schema.safeParse(body);
  if (!res.success) {
    const issues = res.error.issues.map(issue => ({
      path: issue.path.join('.') || '(root)',
      message: issue.message,
      code: issue.code
    }));

    const msg = issues.map(i => `${i.path}: ${i.message} [${i.code}]`).join('; ');
    const err = new Error(msg || 'Request validation failed');
    err.status = 400;
    err.name = 'ValidationError';
    err.details = issues;
    throw err;
  }
  return res.data;
}