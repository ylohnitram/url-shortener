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
    default: 'bafkreie7g3esi7hx27z5n7xx5mkhxzmnboj6hycsfj436iwjusymu233va'
  },
  mime: {
    type: String,
    default: 'image/svg+xml'
  }
});

async function getUrlModel() {
  await dbConnect();
  return mongoose.models.Url || mongoose.model('Url', UrlSchema);
}

export default getUrlModel;
