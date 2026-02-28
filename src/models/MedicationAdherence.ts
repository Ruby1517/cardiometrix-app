import { Schema, model, models, Types } from 'mongoose';

const MedicationAdherenceSchema = new Schema({
  userId: { type: Types.ObjectId, ref: 'User', index: true },
  medicationId: { type: Types.ObjectId, ref: 'Medication', index: true },
  date: { type: String, index: true }, // YYYY-MM-DD
  status: { type: String, enum: ['taken', 'missed'], required: true }
}, { timestamps: true });

MedicationAdherenceSchema.index({ userId: 1, medicationId: 1, date: 1 }, { unique: true });

export default models.MedicationAdherence || model('MedicationAdherence', MedicationAdherenceSchema);
