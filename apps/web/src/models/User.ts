import { Schema, model, models, Types } from 'mongoose';

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['patient','clinician','admin'], default: 'patient', index: true },
  clinicianId: { type: Types.ObjectId, ref: 'User' },
  profile: {
    dob: Date,
    sex: { type: String, enum: ['male','female','other'], default: 'other' },
    heightCm: Number,
    conditions: [String]
  }
}, { timestamps: true });

export type UserDoc = typeof models.User extends { prototype: infer T } ? T : any;
export default models.User || model('User', UserSchema);