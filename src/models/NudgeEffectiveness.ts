import { Schema, model, models, Types } from 'mongoose';

const NudgeEffectivenessSchema = new Schema({
  userId: { type: Types.ObjectId, ref: 'User', index: true },
  category: { type: String, enum: ['salt','steps','sleep','meds','weight','hydrate','custom'] },
  completed: { type: Number, default: 0 }, // times completed
  skipped: { type: Number, default: 0 }, // times skipped
  riskImproved: { type: Number, default: 0 }, // times risk improved after completion
  riskWorsened: { type: Number, default: 0 }, // times risk worsened after completion
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

NudgeEffectivenessSchema.index({ userId: 1, category: 1 }, { unique: true });

export default models.NudgeEffectiveness || model('NudgeEffectiveness', NudgeEffectivenessSchema);





