import { NextResponse } from 'next/server';
import getClickModel from '../../../models/Click';

export async function GET(request, { params }) {
  const Click = await getClickModel();
  const { shortUrl } = params;

  console.log("Received request for click information for short URL:", shortUrl);

  try {
    const clicks = await Click.find({ shortUrl });
    return NextResponse.json(clicks, { status: 200 });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
