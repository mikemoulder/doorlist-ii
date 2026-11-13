import { createPublicClient, defineChain, http, isAddress, type Address } from 'viem';
import deployment from './deployment.json';
import mainnet from '../../deployments/bot-mainnet.json';

const botTestnetContract = process.env.NEXT_PUBLIC_BOT_TESTNET_CONTRACT;
if (botTestnetContract && !isAddress(botTestnetContract)) throw new Error('Invalid BOT Chain testnet contract address');
export const isBotMainnet = process.env.NEXT_PUBLIC_DOORLIST_NETWORK === 'bot-mainnet';
export const isBotChain = isBotMainnet || Boolean(botTestnetContract);
export const doorTopUp = isBotMainnet ? '0.005' : '1';
const botTestnetRpc = 'https://rpc.bohr.life';

export const activeChain = defineChain(isBotMainnet ? {
  id: mainnet.chainId,
  name: mainnet.network,
  nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
  rpcUrls: { default: { http: [mainnet.rpc] } },
  blockExplorers: { default: { name: 'BOTScan', url: 'https://scan.botchain.ai' } },
} : botTestnetContract ? {
  id: 968,
  name: 'BOT Chain Testnet',
  nativeCurrency: { name: 'Test BOT', symbol: 'tBOT', decimals: 18 },
  rpcUrls: { default: { http: [botTestnetRpc] } },
  blockExplorers: { default: { name: 'BOTScan', url: 'https://scan.bohr.life' } },
  testnet: true,
} : {
  id: deployment.chainId,
  name: 'Portaldot V3 Testnet',
  nativeCurrency: { name: 'Portaldot', symbol: 'POT', decimals: 18 },
  rpcUrls: { default: { http: [deployment.rpc] } },
});

export const SUBSTRATE_WS = 'wss://test-node-v3.portaldot.dev';
export const EXPLORER = activeChain.blockExplorers?.default.url ?? 'https://node-console.portaldot.dev';

export const DOORLIST = (isBotMainnet ? mainnet.address : botTestnetContract || deployment.address) as Address;
export const TREASURY = (isBotMainnet ? mainnet.treasury : deployment.treasury) as Address;
export const DEPLOY_BLOCK = BigInt(deployment.block);
export const doorlistAbi = (isBotMainnet ? mainnet : deployment).abi;

/** Doorlist USD: native asset 2026, reached from Solidity through its ERC-20 precompile. */
export const DUSD = {
  assetId: 2026,
  address: '0x000007ea00000000000000000000000000010000' as Address,
  symbol: 'dUSD',
  decimals: 6,
};
/** Test faucet: 100 dUSD once per address (deployments/dusd-faucet.json). */
export const FAUCET = {
  address: '0xF7EF82239bDEB68AF78bAA8ABA24eb93C2188A3F' as Address,
  amount: 100_000_000n,
  abi: [
    { type: 'function', name: 'claim', stateMutability: 'nonpayable', inputs: [], outputs: [] },
    { type: 'function', name: 'claimed', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'bool' }] },
    { type: 'error', name: 'AlreadyClaimed', inputs: [] },
    { type: 'error', name: 'PoolEmpty', inputs: [] },
  ],
} as const;
export const NATIVE = '0x0000000000000000000000000000000000000000' as Address;

export const client = createPublicClient({ chain: activeChain, transport: http(activeChain.rpcUrls.default.http[0], { retryCount: 3 }) });

export const erc20Abi = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ name: 'o', type: 'address' }, { name: 's', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 's', type: 'address' }, { name: 'v', type: 'uint256' }], outputs: [{ type: 'bool' }] },
] as const;
