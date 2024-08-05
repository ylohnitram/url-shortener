'use client';
import { useState } from 'react';

export default function Home() {
  const [originalUrl, setOriginalUrl] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setShortUrl(''); // Vymaže předchozí vygenerovaný odkaz
    const response = await fetch('/shorten', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ originalUrl, author: 'anonymous' }),
    });
    const data = await response.json();
    setShortUrl(`${window.location.origin}/${data.shortUrl}`);
    setLoading(false);
    setCopied(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shortUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-white text-black">
      <div className="bg-gray-200 p-8 rounded shadow-md w-full max-w-lg text-center">
        <h1 className="text-2xl font-bold mb-4">URL Shortener</h1>
        <form onSubmit={handleSubmit} className="mb-4">
          <input
            type="url"
            value={originalUrl}
            onChange={(e) => setOriginalUrl(e.target.value)}
            placeholder="Enter your URL"
            className="w-full p-2 border border-gray-300 rounded mb-2 text-black"
            required
          />
          <input
            type="hidden"
            value="anonymous"
            name="author"
          />
          <button
            type="submit"
            className={`w-full p-2 rounded ${
              loading ? 'bg-gray-500' : 'bg-gray-800 hover:bg-gray-900'
            } text-white`}
            disabled={loading}
          >
            {loading ? 'Generating...' : 'Shorten'}
          </button>
        </form>
        {shortUrl && (
          <div>
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
