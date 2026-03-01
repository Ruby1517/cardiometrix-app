import { Schema, model, models, Types } from 'mongoose';

const CaregiverAccessSchema = new Schema(
  {
    patientId: { type: Types.ObjectId, ref: 'User', index: true },
    caregiverId: { type: Types.ObjectId, ref: 'User', index: true },
  },
  { timestamps: true }
);

CaregiverAccessSchema.index({ patientId: 1, caregiverId: 1 }, { unique: true });

export default models.CaregiverAccess || model('CaregiverAccess', CaregiverAccessSchema);
