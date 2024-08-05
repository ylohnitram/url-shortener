import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://dweb.link/ipfs/",
  "https://4everland.io/ipfs/",
  "https://ipfs.eth.aragon.network/ipfs/",
  "https://w3s.link/ipfs/",
  "https://trustless-gateway.link/ipfs/",
  "https://ipfs.runfission.com/ipfs/",
  "https://hardbin.com/ipfs/",
  "https://nftstorage.link/ipfs/"
];

export async function downloadFromIPFS(ipfsPath) {
  const checks = IPFS_GATEWAYS.map(async gateway => {
    try {
      const url = `${gateway}${ipfsPath}`;
      const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 2000 });
      if (response.status === 200) {
        return response.data;
      }
    } catch (error) {
      console.error(`Error checking gateway ${gateway}:`, error);
    }
    return null;
  });

  const results = await Promise.all(checks);
  const buffer = results.find(data => data !== null);
  if (!buffer) {
    throw new Error('No available IPFS gateway found for download');
  }
  return buffer;
}

export async function uploadToPinata(buffer, filename) {
  const formData = new FormData();
  formData.append('file', buffer, { filename });

  const pinataMetadata = JSON.stringify({
    name: filename,
  });
  formData.append('pinataMetadata', pinataMetadata);

  const pinataOptions = JSON.stringify({
    cidVersion: 0,
  });
  formData.append('pinataOptions', pinataOptions);

  try {
    const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
      maxBodyLength: "Infinity",
      headers: {
        'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
        'Authorization': `Bearer ${process.env.PINATA_API_KEY}`
      }
    });
    return res.data.IpfsHash;
  } catch (error) {
    console.error('Upload to Pinata failed:', error);
    throw error;
  }
}
