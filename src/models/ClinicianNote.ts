import { Schema, model, models, Types } from 'mongoose';

const ClinicianNoteSchema = new Schema(
  {
    patientId: { type: Types.ObjectId, ref: 'User', index: true },
    authorId: { type: Types.ObjectId, ref: 'User', index: true },
    body: { type: String, required: true },
  },
  { timestamps: true }
);

ClinicianNoteSchema.index({ patientId: 1, createdAt: -1 });

export default models.ClinicianNote || model('ClinicianNote', ClinicianNoteSchema);
