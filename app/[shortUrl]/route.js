import { NextResponse } from 'next/server';
import getUrlModel from '../../models/Url';
import getClickModel from '../../models/Click';
import parser from 'ua-parser-js';
import axios from 'axios';

const IPDATA_API_KEY = process.env.IPDATA_API_KEY;

export async function GET(request) {
  const { pathname } = new URL(request.url);
  const shortUrl = pathname.split('/').pop();

  console.log("Received request to redirect short URL:", shortUrl);

  try {
    const Url = await getUrlModel();
    const Click = await getClickModel();

    const url = await Url.findOne({ shortUrl });
    if (url) {
      console.log("Found original URL:", url.originalUrl);

      const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('remote-addr');
      const referer = request.headers.get('referer') || '';
      const userAgent = request.headers.get('user-agent') || '';
      const ua = parser(userAgent);

      let deviceType = 'desktop';
      if (ua.device.type) {
        deviceType = ua.device.type;
      }

      // Použití ipdata pro získání geolokace
      let geo = {};
      try {
        const response = await axios.get(`https://api.ipdata.co/${ipAddress}?api-key=${IPDATA_API_KEY}`);
        geo = {
          country: response.data.country_name,
          region: response.data.region,
          city: response.data.city
        };
      } catch (err) {
        console.error("Geo Location Error:", err);
      }

      console.log("IP Address:", ipAddress);
      console.log("Referer:", referer);
      console.log("User Agent:", userAgent);
      console.log("Device Type:", deviceType);
      console.log("Geo Location:", geo);

      // Uložit informace o kliknutí
      const newClick = new Click({
        shortUrl,
        ipAddress,
        referer,
        deviceType,
        geolocation: {
          country: geo.country,
          region: geo.region,
          city: geo.city
        }
      });

      await newClick.save();
      console.log("Saved click information:", newClick);

      return NextResponse.redirect(url.originalUrl);
    } else {
      console.error("URL not found for short URL:", shortUrl);
      return NextResponse.json({ error: 'URL not found' }, { status: 404 });
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
