import { Schema, model, models, Types } from 'mongoose';

const DeviceSchema = new Schema({
  userId: { type: Types.ObjectId, ref: 'User', index: true },
  provider: { type: String, enum: ['manual','googlefit','apple','fitbit','withings','omron'], default: 'manual' },
  access: { type: Schema.Types.Mixed }, // tokens if using an aggregator later
  status: { type: String, enum: ['active','revoked'], default: 'active' }
}, { timestamps: true });

export default models.Device || model('Device', DeviceSchema);