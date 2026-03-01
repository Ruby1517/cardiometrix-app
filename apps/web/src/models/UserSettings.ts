import { Schema, model, models, Types } from 'mongoose';

const UserSettingsSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    timezone: { type: String, default: 'America/Los_Angeles' },
    notifyTimeLocal: { type: String, default: '09:00' },
    pushTokens: { type: [String], default: [] },
    notifyEnabled: { type: Boolean, default: true, index: true },
    lastNotifiedAt: { type: Date },
    lastNotifiedDate: { type: String },
  },
  { timestamps: true },
);

export default models.UserSettings || model('UserSettings', UserSettingsSchema);
