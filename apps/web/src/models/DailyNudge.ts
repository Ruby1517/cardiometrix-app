import { Schema, model, models, Types } from 'mongoose';

const DailyNudgeSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', index: true, required: true },
    as_of_date: { type: String, required: true, index: true },
    key: { type: String, required: true },
    tag: { type: String, enum: ['sleep', 'movement', 'sodium', 'meds', 'hydration', 'weight'], required: true },
    text: { type: String, required: true },
    burden: { type: Number, min: 1, max: 3, default: 2 },
    variant: { type: String },
    status: { type: String, enum: ['pending', 'done', 'snoozed'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

DailyNudgeSchema.index({ userId: 1, as_of_date: -1 }, { unique: true });

export default models.DailyNudge || model('DailyNudge', DailyNudgeSchema);
