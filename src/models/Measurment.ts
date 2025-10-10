import { Schema, model, models, Types } from 'mongoose';

const MeasurementSchema = new Schema({
  userId: { type: Types.ObjectId, ref: 'User', index: true },
  type: { type: String, enum: ['bp','weight','steps','sleep','hrv'], index: true },
  measuredAt: { type: Date, index: true },
  source: { type: String, default: 'manual' },
  payload: { type: Schema.Types.Mixed, required: true }
}, { timestamps: true });

MeasurementSchema.index({ userId: 1, measuredAt: -1 });

export default models.Measurement || model('Measurement', MeasurementSchema);