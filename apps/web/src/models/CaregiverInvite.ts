import { Schema, model, models, Types } from 'mongoose';

const CaregiverInviteSchema = new Schema(
  {
    patientId: { type: Types.ObjectId, ref: 'User', index: true },
    caregiverEmail: { type: String, index: true },
    token: { type: String, unique: true, index: true },
    status: { type: String, enum: ['pending', 'accepted', 'expired'], default: 'pending' },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

CaregiverInviteSchema.index({ patientId: 1, createdAt: -1 });

export default models.CaregiverInvite || model('CaregiverInvite', CaregiverInviteSchema);
