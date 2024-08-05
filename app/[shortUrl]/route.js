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

      let ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('remote-addr');
      if (ipAddress.startsWith('::ffff:')) {
        ipAddress = ipAddress.split('::ffff:')[1];
      }

      const referer = request.headers.get('referer') || '';
      const userAgent = request.headers.get('user-agent') || '';
      const ua = parser(userAgent);

      let deviceType = 'desktop';
      if (ua.device.type) {
        deviceType = ua.device.type;
      }

      // Použití ipdata pro získání geolokace
      let geo = {};
      if (ipAddress !== '127.0.0.1') {
        try {
          const response = await axios.get(`https://api.ipdata.co/${ipAddress}?api-key=${IPDATA_API_KEY}`);
          console.log('Geolocation API response:', response.data);
          geo = {
            country: response.data.country_name,
            region: response.data.region,
            city: response.data.city
          };
        } catch (err) {
          console.error("Geo Location Error:", err);
        }
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
          country: geo.country || '',
          region: geo.region || '',
          city: geo.city || ''
        }
      });

      await newClick.save();
      console.log("Saved click information:", newClick);

      // Vraťte HTML odpověď s meta tagy a automatickým přesměrováním
      const htmlResponse = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta property="og:title" content="${url.title || 'Title not available'}">
          <meta property="og:description" content="${url.description || 'Description not available'}">
          <meta property="og:image" content="${url.originalUrl}">
          <meta property="og:url" content="https://tzurl.art/${shortUrl}">
          <meta name="twitter:card" content="summary_large_image">
          <meta name="twitter:title" content="${url.title || 'Title not available'}">
          <meta name="twitter:description" content="${url.description || 'Description not available'}">
          <meta name="twitter:image" content="${url.originalUrl}">
          <meta name="twitter:site" content="@tzurl_art">
          <meta name="twitter:creator" content="@tzurl_art">
          <title>Redirecting...</title>
          <script>
            let countdown = 3;
            const countdownElement = document.getElementById('countdown');
            const interval = setInterval(() => {
              countdownElement.textContent = countdown;
              countdown -= 1;
              if (countdown < 0) {
                clearInterval(interval);
                window.location.href = "${url.originalUrl}";
              }
            }, 1000);
          </script>
        </head>
        <body>
          <p>Redirecting to <a href="${url.originalUrl}">${url.originalUrl}</a> in <span id="countdown">3</span> seconds...</p>
          <p>Shortened by <a href="https://tzurl.art/">tzurl.art</a></p>
        </body>
        </html>
      `;
      return new Response(htmlResponse, {
        headers: {
          'Content-Type': 'text/html',
        },
      });
    } else {
      console.error("URL not found for short URL:", shortUrl);
      return NextResponse.json({ error: 'URL not found' }, { status: 404 });
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
