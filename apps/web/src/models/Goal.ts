import { Schema, model, models, Types } from 'mongoose';

const GoalSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', index: true, unique: true },
    bpSystolicTarget: { type: Number },
    bpDiastolicTarget: { type: Number },
    weightTargetKg: { type: Number },
  },
  { timestamps: true }
);

export default models.Goal || model('Goal', GoalSchema);
