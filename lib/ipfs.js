import axios from 'axios';
import { Web3Storage, File } from 'web3.storage';

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

export async function findAvailableIPFSUrl(ipfsPath) {
  const checks = IPFS_GATEWAYS.map(async gateway => {
    try {
      const url = `${gateway}${ipfsPath}`;
      const response = await axios.head(url, { timeout: 2000 });
      if (response.status === 200) {
        return url;
      }
    } catch (error) {
      console.error(`Error checking gateway ${gateway}:`, error.message);
    }
    return null;
  });

  const results = await Promise.all(checks);
  return results.find(url => url !== null);
}

export async function fetchFromIPFS(ipfsPath) {
  const availableUrl = await findAvailableIPFSUrl(ipfsPath);
  if (!availableUrl) {
    throw new Error('No available IPFS gateway found for the image');
  }

  const response = await axios.get(availableUrl, { responseType: 'arraybuffer' });
  return response.data;
}

export async function uploadToWeb3Storage(buffer, filename) {
  const client = new Web3Storage({ token: process.env.WEB3_STORAGE_TOKEN });
  const file = new File([buffer], filename, { type: 'image/png' });
  const cid = await client.put([file]);
  return cid;
}

export async function getIPFSUrl(cid, filename) {
  const checks = IPFS_GATEWAYS.map(async gateway => {
    try {
      const url = `${gateway}${cid}/${filename}`;
      const response = await axios.head(url, { timeout: 2000 });
      if (response.status === 200) {
        return url;
      }
    } catch (error) {
      console.error(`Error checking gateway ${gateway}:`, error.message);
    }
    return null;
  });

  const results = await Promise.all(checks);
  return results.find(url => url !== null);
}
