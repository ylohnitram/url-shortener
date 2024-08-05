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
  title: {
    type: String,
    default: 'Title not available'
  },
  description: {
    type: String,
    default: 'Description not available'
  },
  ipfsPath: {
    type: String,
    default: '/images/tzurl-not-found.svg'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

async function getUrlModel() {
  await dbConnect();
  return mongoose.models.Url || mongoose.model('Url', UrlSchema);
}

export default getUrlModel;
