import { NextResponse } from 'next/server';
import getUrlModel from '../../models/Url';
import { nanoid } from 'nanoid';
import axios from 'axios';
import sharp from 'sharp';
import { downloadFromIPFS, uploadToWeb3Storage } from '../../lib/ipfs';

const GRAPHQL_API_URL = 'https://data.objkt.com/v3/graphql';

async function fetchMetadata(originalUrl) {
  const match = originalUrl.match(/tokens\/([^/]+)\/([^/]+)/);
  if (!match) {
    throw new Error('Invalid URL format');
  }

  const [_, fa_contract, token_id] = match;

  const query = `
    query ItemDescription {
      token(
        where: {fa_contract: {_eq: "${fa_contract}"}, token_id: {_eq: "${token_id}"}}
      ) {
        name
        description
        thumbnail_uri
        mime
      }
    }
  `;

  const response = await axios.post(GRAPHQL_API_URL, { query });

  if (response.data.errors) {
    throw new Error(response.data.errors[0].message);
  }

  const tokenData = response.data.data.token[0];
  if (!tokenData) {
    throw new Error('No token data found');
  }

  return {
    title: tokenData.name,
    description: tokenData.description,
    thumbnail_uri: tokenData.thumbnail_uri,
    mime: tokenData.mime
  };
}

export async function POST(request) {
  const Url = await getUrlModel();
  const { originalUrl, author } = await request.json();

  if (!originalUrl) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    const existingUrl = await Url.findOne({ originalUrl });
    if (existingUrl) {
      return NextResponse.json({ shortUrl: existingUrl.shortUrl }, { status: 200 });
    }

    try {
      const response = await axios.head(originalUrl);
      const statusCode = response.status;
      if (statusCode < 200 || statusCode >= 400) {
        return NextResponse.json({ error: 'URL is not accessible' }, { status: 400 });
      }
    } catch (error) {
      return NextResponse.json({ error: 'URL verification failed' }, { status: 400 });
    }

    let title = 'Title not available';
    let description = 'Description not available';
    let thumbnail_uri = 'https://tzurl.art/images/tzurl-not-found.svg';
    let mime = '';

    try {
      const metadata = await fetchMetadata(originalUrl);
      title = metadata.title;
      description = metadata.description;
      thumbnail_uri = metadata.thumbnail_uri;
      mime = metadata.mime;
    } catch (error) {
      console.error("Metadata fetch failed:", error);
    }

    if (mime === 'image/gif' || mime === 'video/mp4' || mime === 'video/webm' || mime === 'video/ogg') {
      try {
        const ipfsPath = thumbnail_uri.split('ipfs://')[1];
        const buffer = await downloadFromIPFS(ipfsPath);
        const convertedBuffer = await sharp(buffer).png().toBuffer();
        const cid = await uploadToWeb3Storage(convertedBuffer, 'thumbnail.png');
        thumbnail_uri = `${cid}/thumbnail.png`;
      } catch (error) {
        thumbnail_uri = 'https://tzurl.art/images/tzurl-not-found.svg';
      }
    }

    const shortUrl = nanoid(6);
    const newUrl = new Url({
      originalUrl,
      shortUrl,
      author: author || 'anonymous',
      title,
      description,
      ipfsPath: thumbnail_uri.split('/').pop(),
      mime
    });
    await newUrl.save();
    return NextResponse.json({ shortUrl }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
