import { NextResponse } from 'next/server';
import getUrlModel from '../../models/Url';
import { nanoid } from 'nanoid';

export async function POST(request) {
  const Url = await getUrlModel();
  const { originalUrl } = await request.json();
  console.log("Received URL to shorten:", originalUrl);

  if (!originalUrl) {
    console.error("Invalid URL provided");
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    // Zkontrolovat, zda URL již existuje
    const existingUrl = await Url.findOne({ originalUrl });
    if (existingUrl) {
      console.log("URL already exists:", existingUrl);
      return NextResponse.json({ shortUrl: existingUrl.shortUrl }, { status: 200 });
    }

    // Vytvořit novou zkrácenou URL, pokud neexistuje
    const shortUrl = nanoid(6);
    const newUrl = new Url({
      originalUrl,
      shortUrl
    });
    await newUrl.save();
    console.log("Saved new URL:", newUrl);
    return NextResponse.json({ shortUrl }, { status: 201 });
  } catch (error) {
    console.error("Error saving to the database:", error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
