import { Schema, model, models, Types } from 'mongoose';

const ReminderSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', index: true },
    type: { type: String, enum: ['vitals', 'meds'], index: true },
    time: { type: String, default: '09:00' },
    enabled: { type: Boolean, default: true },
    timezone: { type: String },
    lastSentAt: { type: Date },
    lastSentLocalDate: { type: String },
  },
  { timestamps: true }
);

ReminderSchema.index({ userId: 1, type: 1 }, { unique: true });

export default models.Reminder || model('Reminder', ReminderSchema);
