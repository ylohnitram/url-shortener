import { NextResponse } from 'next/server';
import getUrlModel from '../../models/Url';
import { nanoid } from 'nanoid';
import axios from 'axios';
import sharp from 'sharp';
import { uploadToWeb3Storage, findAvailableIPFSUrl, downloadFromIPFS } from '../../lib/ipfs';

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
        where: {fa_contract: {_eq: "${fa_contract}"}, token_id: {_eq: "${token_id}"} }
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
    console.error("Invalid URL provided");
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    // 1. Zkontrolovat, zda URL již existuje
    const existingUrl = await Url.findOne({ originalUrl });
    if (existingUrl) {
      return NextResponse.json({ shortUrl: existingUrl.shortUrl }, { status: 200 });
    }

    // 2. Ověřit, že URL je dostupná
    try {
      const response = await axios.head(originalUrl);
      const statusCode = response.status;
      if (statusCode < 200 || statusCode >= 400) {
        console.error("URL is not accessible:", statusCode);
        return NextResponse.json({ error: 'URL is not accessible' }, { status: 400 });
      }
    } catch (error) {
      console.error("URL verification failed:", error);
      return NextResponse.json({ error: 'URL verification failed' }, { status: 400 });
    }

    // 3. Získat metadata z objkt.com
    let title = 'Title not available';
    let description = 'Description not available';
    let thumbnail_uri = 'images/tzurl-not-found.svg';
    let mime = '';

    try {
      const metadata = await fetchMetadata(originalUrl);
      title = metadata.title;
      description = metadata.description;
      mime = metadata.mime;

      if (mime === 'image/png' || mime === 'image/jpeg' || mime === 'image/jpg') {
        thumbnail_uri = metadata.thumbnail_uri.split('ipfs://')[1];
      } else if (mime === 'image/gif' || mime.startsWith('video/')) {
        const buffer = await downloadFromIPFS(metadata.thumbnail_uri.split('ipfs://')[1]);
        const staticImageBuffer = await sharp(buffer).png().toBuffer();
        const cid = await uploadToWeb3Storage(staticImageBuffer, 'thumbnail.png');
        thumbnail_uri = cid;
      }
    } catch (error) {
      console.error("Metadata fetch failed:", error);
    }

    // 4. Vytvořit novou zkrácenou URL, pokud neexistuje
    const shortUrl = nanoid(6);
    const newUrl = new Url({
      originalUrl,
      shortUrl,
      author: author || 'anonymous',
      title,
      description,
      ipfsPath: thumbnail_uri,
      mime,
    });
    await newUrl.save();
    return NextResponse.json({ shortUrl }, { status: 201 });
  } catch (error) {
    console.error("Error saving to the database:", error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
