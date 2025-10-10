import { Schema, model, models, Types } from 'mongoose';

const ClinicianShareSchema = new Schema({
  userId: { type: Types.ObjectId, ref: 'User', index: true },
  token: { type: String, unique: true, index: true },
  expiresAt: { type: Date, index: true },
  pin: { type: String }
}, { timestamps: true });

export default models.ClinicianShare || model('ClinicianShare', ClinicianShareSchema);