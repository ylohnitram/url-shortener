import mongoose from 'mongoose';
import dbConnect from '../lib/dbConnect';

const ClickSchema = new mongoose.Schema({
  shortUrl: {
    type: String,
    required: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  referer: {
    type: String,
    default: 'unknown'
  },
  deviceType: {
    type: String,
    default: 'unknown'
  },
  geolocation: {
    country: String,
    region: String,
    city: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

async function getClickModel() {
  await dbConnect();
  return mongoose.models.Click || mongoose.model('Click', ClickSchema);
}

export default getClickModel;
