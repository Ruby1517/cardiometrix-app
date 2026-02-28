import { Schema, model, models, Types } from 'mongoose';

const ClinicianMessageSchema = new Schema(
  {
    patientId: { type: Types.ObjectId, ref: 'User', index: true },
    authorId: { type: Types.ObjectId, ref: 'User', index: true },
    authorRole: { type: String, enum: ['patient', 'clinician', 'admin'], required: true },
    body: { type: String, required: true },
  },
  { timestamps: true }
);

ClinicianMessageSchema.index({ patientId: 1, createdAt: -1 });

export default models.ClinicianMessage || model('ClinicianMessage', ClinicianMessageSchema);
