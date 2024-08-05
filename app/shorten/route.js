import { NextResponse } from 'next/server';
import getUrlModel from '../../models/Url';
import { nanoid } from 'nanoid';
import axios from 'axios';
import { Web3Storage, File } from 'web3.storage';
import sharp from 'sharp';

const GRAPHQL_API_URL = 'https://data.objkt.com/v3/graphql';
const WEB3_STORAGE_TOKEN = process.env.WEB3_STORAGE_TOKEN;

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

  const response = await axios.post(GRAPHQL_API_URL, {
    query,
  });

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

async function uploadToWeb3Storage(buffer, filename) {
  const client = new Web3Storage({ token: WEB3_STORAGE_TOKEN });
  const file = new File([buffer], filename, { type: 'image/png' });
  const cid = await client.put([file]);
  return `https://${cid}.ipfs.dweb.link/${filename}`;
}

async function processThumbnail(thumbnailUri, mime) {
  if (mime === 'image/gif' || mime.startsWith('video/')) {
    try {
      const response = await axios.get(thumbnailUri, { responseType: 'arraybuffer' });
      const buffer = await sharp(response.data).png().toBuffer();
      const staticImageUrl = await uploadToWeb3Storage(buffer, 'thumbnail.png');
      return staticImageUrl;
    } catch (error) {
      console.error("Error processing thumbnail:", error);
      return 'bafkreie7g3esi7hx27z5n7xx5mkhxzmnboj6hycsfj436iwjusymu233va';
    }
  } else {
    return thumbnailUri.replace('ipfs://', '');
  }
}

export async function POST(request) {
  const Url = await getUrlModel();
  const { originalUrl, author } = await request.json();
  console.log("Received URL to shorten:", originalUrl);
  console.log("Received author:", author);

  if (!originalUrl) {
    console.error("Invalid URL provided");
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    // 1. Zkontrolovat, zda URL již existuje
    const existingUrl = await Url.findOne({ originalUrl });
    if (existingUrl) {
      console.log("URL already exists:", existingUrl);
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
    let thumbnail_uri = 'bafkreie7g3esi7hx27z5n7xx5mkhxzmnboj6hycsfj436iwjusymu233va';
    let mime = '';

    try {
      const metadata = await fetchMetadata(originalUrl);
      title = metadata.title;
      description = metadata.description;
      thumbnail_uri = await processThumbnail(metadata.thumbnail_uri, metadata.mime);
      mime = metadata.mime;
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
      mime
    });
    await newUrl.save();
    console.log("Saved new URL:", newUrl);
    return NextResponse.json({ shortUrl }, { status: 201 });
  } catch (error) {
    console.error("Error saving to the database:", error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
