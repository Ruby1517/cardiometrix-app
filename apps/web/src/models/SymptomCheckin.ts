import { Schema, model, models, Types } from 'mongoose';

const SymptomCheckinSchema = new Schema({
  userId: { type: Types.ObjectId, ref: 'User', index: true },
  checkedAt: { type: Date, index: true },
  severity: { type: Number, min: 1, max: 10 },
  symptoms: {
    headache: { type: Boolean, default: false },
    dizziness: { type: Boolean, default: false },
    fatigue: { type: Boolean, default: false },
    chestDiscomfort: { type: Boolean, default: false },
    shortnessOfBreath: { type: Boolean, default: false },
    swelling: { type: Boolean, default: false },
    otherText: { type: String, default: '' }
  },
  notes: { type: String, default: '' }
}, { timestamps: true });

SymptomCheckinSchema.index({ userId: 1, checkedAt: -1 });

export default models.SymptomCheckin || model('SymptomCheckin', SymptomCheckinSchema);
