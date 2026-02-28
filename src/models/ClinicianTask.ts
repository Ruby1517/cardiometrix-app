import { Schema, model, models, Types } from 'mongoose';

const ClinicianTaskSchema = new Schema(
  {
    patientId: { type: Types.ObjectId, ref: 'User', index: true },
    authorId: { type: Types.ObjectId, ref: 'User', index: true },
    title: { type: String, required: true },
    detail: { type: String },
    status: { type: String, enum: ['open', 'done'], default: 'open' },
    dueDate: { type: String },
  },
  { timestamps: true }
);

ClinicianTaskSchema.index({ patientId: 1, createdAt: -1 });

export default models.ClinicianTask || model('ClinicianTask', ClinicianTaskSchema);
