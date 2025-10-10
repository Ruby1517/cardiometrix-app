import { Schema, model, models, Types } from 'mongoose';

const DailyFeatureSchema = new Schema({
  userId: { type: Types.ObjectId, ref: 'User', index: true },
  date: { type: String, index: true }, // YYYY-MM-DD
  features: {
    bp_sys_avg_7d: Number,
    bp_dia_var_7d: Number,
    hrv_avg_7d: Number,
    steps_avg_7d: Number,
    sleep_debt_h: Number,
    weight_trend_14d: Number,
    morning_evening_bp_diff: Number
  }
}, { timestamps: true });

DailyFeatureSchema.index({ userId: 1, date: -1 }, { unique: true });

export default models.DailyFeature || model('DailyFeature', DailyFeatureSchema);