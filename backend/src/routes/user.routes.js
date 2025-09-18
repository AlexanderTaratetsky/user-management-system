import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';
import { parseBody, updateProfileSchema } from '../lib/validate.js';
import { getProfile, updateProfile, deleteProfile, listProfiles } from '../services/profile.service.js';
import { updateUserEmail, deleteUserAuth } from '../services/auth.service.js';
import { audit } from '../lib/audit.js';

export const userRouter = Router();

userRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const profile = await getProfile(req.user.id);
    if (!profile) {
      const err = new Error('Profile not found for user');
      err.status = 404;
      err.reason = 'PROFILE_NOT_FOUND';
      throw err;
    }
    res.json(profile);
  } catch (e) {
    next(e);
  }
});

userRouter.put('/me', requireAuth, async (req, res, next) => {
  try {
    const patch = parseBody(updateProfileSchema, req.body);
    if (patch.email) {
      await updateUserEmail(req.user.id, patch.email);
    }
    const updated = await updateProfile(req.user.id, patch);
    if (!updated) {
      const err = new Error('Profile not found for user');
      err.status = 404;
      err.reason = 'PROFILE_NOT_FOUND';
      throw err;
    }
    await audit({ userId: req.user.id, action: 'update_profile', ip: req.ip, userAgent: req.get('user-agent') });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

userRouter.delete('/me', requireAuth, async (req, res, next) => {
  try {
    const deletedProfile = await deleteProfile(req.user.id);
    if (!deletedProfile) {
      return res.status(404).json({ message: 'Profile not found for user', reason: 'PROFILE_NOT_FOUND', status: 404 });
    }
    await deleteUserAuth(req.user.id);
    await audit({ userId: req.user.id, action: 'delete_account', ip: req.ip, userAgent: req.get('user-agent') });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

userRouter.get('/admin/users', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const profiles = await listProfiles();
    res.json(profiles);
  } catch (e) {
    next(e);
  }
});