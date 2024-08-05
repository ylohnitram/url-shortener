import axios from 'axios';
import { create, auth, store } from '@web3-storage/w3up-client';

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

export async function uploadToWeb3Storage(buffer) {
  const client = create();
  await auth(client, process.env.WEB3_STORAGE_TOKEN);
  const cid = await store(client, new Blob([buffer]));
  return cid.toString(); // Vraťte ROOT CID jako string
}
