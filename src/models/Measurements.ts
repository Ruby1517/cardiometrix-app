import { Schema, model, models, Types } from 'mongoose';

const MeasurementsSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', index: true, required: true },
    ts: { type: Date, required: true, index: true },
    type: {
      type: String,
      enum: ['a1c', 'lipid', 'glucose'],
      required: true,
      index: true,
    },
    payload: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true, collection: 'measurements' },
);

MeasurementsSchema.index({ userId: 1, ts: -1, type: 1 });

export default models.Measurements || model('Measurements', MeasurementsSchema);
