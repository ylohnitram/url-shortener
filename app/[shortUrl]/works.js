import { NextResponse } from 'next/server';
import getUrlModel from '../../models/Url';

export async function GET(request, { params }) {
  const Url = await getUrlModel();
  const { shortUrl } = params;
  console.log("Received request to redirect short URL:", shortUrl);

  try {
    const url = await Url.findOne({ shortUrl });
    if (url) {
      console.log("Found original URL:", url.originalUrl);
      return NextResponse.redirect(url.originalUrl);
    } else {
      console.error("URL not found for short URL:", shortUrl);
      return NextResponse.json({ error: 'URL not found' }, { status: 404 });
    }
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

