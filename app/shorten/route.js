import { NextResponse } from 'next/server';
import getUrlModel from '../../models/Url';
import { nanoid } from 'nanoid';
import axios from 'axios';
import sharp from 'sharp';
import { downloadFromIPFS, uploadToPinata } from '../../lib/ipfs';

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
  console.log("Received URL to shorten:", originalUrl);
  console.log("Received author:", author);

  if (!originalUrl) {
    console.error("Invalid URL provided");
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    const existingUrl = await Url.findOne({ originalUrl });
    if (existingUrl) {
      console.log("URL already exists:", existingUrl);
      return NextResponse.json({ shortUrl: existingUrl.shortUrl }, { status: 200 });
    }

    try {
      const response = await axios.head(originalUrl);
      if (response.status < 200 || response.status >= 400) {
        console.error("URL is not accessible:", response.status);
        return NextResponse.json({ error: 'URL is not accessible' }, { status: 400 });
      }
    } catch (error) {
      console.error("URL verification failed:", error);
      return NextResponse.json({ error: 'URL verification failed' }, { status: 400 });
    }

    let title = 'Title not available';
    let description = 'Description not available';
    let thumbnail_uri = 'https://tzurl.art/images/tzurl-not-found.svg';
    let mime = '';

    try {
      const metadata = await fetchMetadata(originalUrl);
      console.log("Fetched metadata:", metadata);
      title = metadata.title;
      description = metadata.description;
      thumbnail_uri = metadata.thumbnail_uri;
      mime = metadata.mime;
    } catch (error) {
      console.error("Metadata fetch failed:", error);
    }

    const shortUrl = nanoid(9);
    if (mime === 'image/gif' || mime === 'video/mp4' || mime === 'video/webm' || mime === 'video/ogg') {
      try {
        console.log("Converting and uploading static image for MIME type:", mime);
        const buffer = await downloadFromIPFS(thumbnail_uri.split('ipfs://')[1]);
        console.log("Downloaded buffer from IPFS");
        const staticImageBuffer = await sharp(buffer).png().toBuffer();
        console.log("Converted image to PNG");
        const cid = await uploadToPinata(staticImageBuffer, `thumbnail-${shortUrl}-.png`);
        console.log(`Uploaded PNG to Pinata with CID: ${cid}`);
        thumbnail_uri = `ipfs://${cid}`;
        mime = 'image/png'; 
      } catch (error) {
        console.error("Failed to convert and upload image:", error);
        thumbnail_uri = 'https://tzurl.art/images/tzurl-not-found.svg';
      }
    }

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
