import mongoose from 'mongoose';

const PreferencesSchema = new mongoose.Schema(
  {
    theme: { type: String, enum: ['light', 'dark'], default: 'light' },
    language: { type: String, default: 'en' }
  },
  { _id: false }
);

const UserProfileSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // same as UserAuth.id (uuid)
    name: { type: String, required: true },
    email: { type: String, required: true, index: true },
    preferences: { type: PreferencesSchema, default: () => ({}) }
  },
  { timestamps: true, versionKey: false }
);

export const UserProfile = mongoose.model('UserProfile', UserProfileSchema);
