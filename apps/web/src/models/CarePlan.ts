import { Schema, model, models, Types } from 'mongoose';

const CarePlanSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', index: true },
    weekStart: { type: String, index: true },
    weekEnd: { type: String },
    summary: { type: String },
    focusAreas: [{ type: String }],
    actions: [
      {
        title: String,
        detail: String,
        metric: String,
        target: String,
      },
    ],
  },
  { timestamps: true }
);

CarePlanSchema.index({ userId: 1, weekStart: 1 }, { unique: true });

export default models.CarePlan || model('CarePlan', CarePlanSchema);
