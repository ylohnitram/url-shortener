'use client';
import { useState } from 'react';

export default function Home() {
  const [originalUrl, setOriginalUrl] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const response = await fetch('/shorten', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ originalUrl }),
    });
    const data = await response.json();
    setShortUrl(`${window.location.origin}/${data.shortUrl}`);
    setCopied(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shortUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-center">URL Shortener</h1>
        <form onSubmit={handleSubmit} className="mb-4">
          <input
            type="url"
            value={originalUrl}
            onChange={(e) => setOriginalUrl(e.target.value)}
            placeholder="Enter your URL"
            className="w-full p-2 border border-gray-300 rounded mb-2"
            required
          />
          <button type="submit" className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Shorten
          </button>
        </form>
        {shortUrl && (
          <div className="text-center">
            <h2 className="text-xl mb-2">Shortened URL:</h2>
            <button
              onClick={handleCopy}
              className="text-blue-500 underline"
            >
              {shortUrl}
            </button>
            {copied && <p className="text-green-500 mt-2">Copied to clipboard!</p>}
          </div>
        )}
      </div>
    </div>
  );
}
