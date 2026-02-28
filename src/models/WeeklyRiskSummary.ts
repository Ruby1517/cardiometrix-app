import { Schema, model, models, Types } from 'mongoose';

const WeeklyRiskSummarySchema = new Schema({
  userId: { type: Types.ObjectId, ref: 'User', index: true },
  weekStart: { type: String, index: true }, // YYYY-MM-DD (week start)
  weekEnd: { type: String }, // YYYY-MM-DD (week end)
  horizonDays: { type: Number, default: 7 },
  metrics: {
    risk_score_avg_7d: Number,
    risk_score_slope_14d: Number,
    bp_sys_avg_7d: Number,
    bp_sys_slope_14d: Number,
    bp_dia_avg_7d: Number,
    bp_dia_slope_14d: Number,
    weight_avg_7d: Number,
    weight_slope_14d: Number
  },
  signals: {
    deteriorationDetected: { type: Boolean, default: false },
    trend: { type: String, enum: ['improving', 'stable', 'worsening'] }
  },
  explanations: [String],
  summaryText: String
}, { timestamps: true });

WeeklyRiskSummarySchema.index({ userId: 1, weekStart: -1 }, { unique: true });

export default models.WeeklyRiskSummary || model('WeeklyRiskSummary', WeeklyRiskSummarySchema);
