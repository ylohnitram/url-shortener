import axios from 'axios';

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

export async function getIPFSUrl(ipfsPath) {
  const checks = IPFS_GATEWAYS.map(async gateway => {
    try {
      const url = `${gateway}${ipfsPath}`;
      const response = await axios.head(url, { timeout: 2000 });
      if (response.status === 200) {
        return url;
      }
    } catch (error) {
      console.error(`Error checking gateway ${gateway}:`, error);
    }
    return null;
  });

  const results = await Promise.all(checks);
  const validUrl = results.find(url => url !== null);
  if (!validUrl) {
    throw new Error('No available IPFS gateway found for URL');
  }
  return validUrl;
}

export async function uploadToPinata(buffer, filename) {
  const JWT = process.env.PINATA_TOKEN;
  const formData = new FormData();
  formData.append('file', new Blob([buffer]), filename);

  const pinataMetadata = JSON.stringify({ name: filename });
  formData.append('pinataMetadata', pinataMetadata);

  const pinataOptions = JSON.stringify({ cidVersion: 0 });
  formData.append('pinataOptions', pinataOptions);

  const response = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
    maxBodyLength: "Infinity",
    headers: {
      'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
      'Authorization': `Bearer ${JWT}`
    }
  });

  if (response.data.IpfsHash) {
    return response.data.IpfsHash;
  } else {
    throw new Error('Failed to upload to Pinata');
  }
}
