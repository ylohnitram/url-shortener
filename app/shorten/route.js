import { NextResponse } from 'next/server';
import getUrlModel from '../../models/Url';
import { nanoid } from 'nanoid';
import axios from 'axios';

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

    // 3. Vytvořit novou zkrácenou URL, pokud neexistuje
    const shortUrl = nanoid(6);
    const newUrl = new Url({
      originalUrl,
      shortUrl,
      author: author || 'anonymous',
    });
    await newUrl.save();
    console.log("Saved new URL:", newUrl);
    return NextResponse.json({ shortUrl }, { status: 201 });
  } catch (error) {
    console.error("Error saving to the database:", error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
