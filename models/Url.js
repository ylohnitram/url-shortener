import mongoose from 'mongoose';
import dbConnect from '../lib/dbConnect';

const UrlSchema = new mongoose.Schema({
  originalUrl: {
    type: String,
    required: true
  },
  shortUrl: {
    type: String,
    required: true,
    unique: true
  },
  author: {
    type: String,
    default: 'anonymous',
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  ipfsPath: {
    type: String,
    required: false,
  },
  title: {
    type: String,
    required: false,
  },
  description: {
    type: String,
    required: false,
  },
});

async function getUrlModel() {
  await dbConnect();
  return mongoose.models.Url || mongoose.model('Url', UrlSchema);
}

export default getUrlModel;
