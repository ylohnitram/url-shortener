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

export async function downloadFromIPFS(ipfsPath) {
  const checks = IPFS_GATEWAYS.map(async gateway => {
    try {
      const url = `${gateway}${ipfsPath}`;
      console.log(`Checking gateway: ${url}`);
      const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 1500 });
      if (response.status === 200) {
        console.log(`Successful response from gateway: ${url}`);
        return response.data;
      }
    } catch (error) {
      console.error(`Error checking gateway ${gateway}:`, error.message);
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

export async function uploadToWeb3Storage(buffer, filename) {
  const client = new Web3Storage({ token: process.env.WEB3_STORAGE_TOKEN });
  const files = [new File([buffer], filename)];
  const cid = await client.put(files);
  console.log(`File uploaded to Web3.Storage with CID: ${cid}`);
  return cid;
}

export async function findAvailableIPFSUrl(ipfsPath) {
  const checks = IPFS_GATEWAYS.map(async gateway => {
    try {
      const url = `${gateway}${ipfsPath}`;
      console.log(`Checking gateway: ${url}`);
      const response = await axios.head(url, { timeout: 1500 }); 
      if (response.status === 200) {
        console.log(`Successful response from gateway: ${url}`);
        return url;
      }
    } catch (error) {
      console.error(`Error checking gateway ${gateway}:`, error.message);
    }
    return null;
  });

  const results = await Promise.all(checks);
  const availableUrl = results.find(url => url !== null);
  if (!availableUrl) {
    console.log('No available IPFS gateway found');
  }
  return availableUrl;
}
