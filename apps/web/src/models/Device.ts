import { Schema, model, models, Types } from 'mongoose';

const DeviceSchema = new Schema({
  userId: { type: Types.ObjectId, ref: 'User', index: true },
  provider: { type: String, enum: ['manual','googlefit','apple','fitbit','withings','omron','expo'], default: 'manual' },
  access: { type: Schema.Types.Mixed }, // tokens if using an aggregator later
  expoPushToken: { type: String, index: true },
  platform: { type: String },
  model: { type: String },
  status: { type: String, enum: ['active','revoked'], default: 'active' }
}, { timestamps: true });

export default models.Device || model('Device', DeviceSchema);
