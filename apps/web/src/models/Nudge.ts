import { Schema, model, models, Types } from 'mongoose';

const NudgeSchema = new Schema({
  userId: { type: Types.ObjectId, ref: 'User', index: true },
  date: { type: String, index: true },
  message: String,
  category: { type: String, enum: ['salt','steps','sleep','meds','weight','hydrate','custom'] },
  status: { type: String, enum: ['sent','completed','skipped'], default: 'sent' },
  rationale: String
}, { timestamps: true });

NudgeSchema.index({ userId: 1, date: -1 }, { unique: true });

export default models.Nudge || model('Nudge', NudgeSchema);