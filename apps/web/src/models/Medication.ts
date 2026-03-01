import { Schema, model, models, Types } from 'mongoose';

const MedicationSchema = new Schema({
  userId: { type: Types.ObjectId, ref: 'User', index: true },
  name: { type: String, required: true },
  dose: { type: String, required: true },
  schedule: { type: String, required: true },
  active: { type: Boolean, default: true }
}, { timestamps: true });

MedicationSchema.index({ userId: 1, createdAt: -1 });

export default models.Medication || model('Medication', MedicationSchema);
