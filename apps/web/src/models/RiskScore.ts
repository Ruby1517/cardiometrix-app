import { Schema, model, models, Types } from 'mongoose';

const RiskScoreSchema = new Schema({
  userId: { type: Types.ObjectId, ref: 'User', index: true },
  date: { type: String, index: true }, // YYYY-MM-DD
  horizonDays: { type: Number, default: 30 },
  score: { type: Number }, // 0..1
  band: { type: String, enum: ['green','amber','red'] },
  drivers: [{ feature: String, contribution: Number, direction: String }]
}, { timestamps: true });

RiskScoreSchema.index({ userId: 1, date: -1, horizonDays: 1 }, { unique: true });

export default models.RiskScore || model('RiskScore', RiskScoreSchema);