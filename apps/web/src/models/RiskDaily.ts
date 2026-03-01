import { Schema, model, models, Types } from 'mongoose';

const RiskDailySchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', index: true, required: true },
    as_of_date: { type: String, required: true, index: true },
    risk: { type: Number, default: null },
    band: { type: String, enum: ['green', 'amber', 'red', 'unknown'], default: 'unknown', index: true },
    drivers: [
      {
        name: String,
        value: Number,
        direction: { type: String, enum: ['up', 'down'] },
        contribution: Number,
      },
    ],
    model_version: { type: String, default: 'unknown' },
    error: { type: String },
    computedAt: { type: Date, default: Date.now },
    featureSnapshot: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

RiskDailySchema.index({ userId: 1, as_of_date: -1 }, { unique: true });

export default models.RiskDaily || model('RiskDaily', RiskDailySchema);
