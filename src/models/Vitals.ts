import { Schema, model, models, Types } from 'mongoose';

const VitalsSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', index: true, required: true },
    ts: { type: Date, required: true, index: true },
    type: {
      type: String,
      enum: ['bp', 'weight', 'hr', 'hrv', 'steps', 'sleep'],
      required: true,
      index: true,
    },
    payload: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true, collection: 'vitals' },
);

VitalsSchema.index({ userId: 1, ts: -1, type: 1 });

export default models.Vitals || model('Vitals', VitalsSchema);
