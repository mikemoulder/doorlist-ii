// Create disposable wallets with --init. After funding them, run with --send.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { ContractFactory, JsonRpcProvider, Wallet, formatEther, parseEther, ZeroAddress } = require('../contracts/node_modules/ethers');
const walletFile = new URL('../.env.bot-testnet.local', import.meta.url);
const roles = ['ORGANIZER', 'BUYER', 'SCANNER'];
const rpc = 'https://rpc.bohr.life';
const explorer = 'https://scan.bohr.life';

if (process.argv.includes('--init')) {
  const wallets = roles.map(() => Wallet.createRandom());
  writeFileSync(walletFile, wallets.map((wallet, i) => `${roles[i]}=${wallet.privateKey}`).join('\n') + '\n', { flag: 'wx', mode: 0o600 });
}

const keys = Object.fromEntries(readFileSync(walletFile, 'utf8').trim().split(/\r?\n/).map((line) => line.split('=')));
const provider = new JsonRpcProvider(rpc);
const wallets = roles.map((role) => new Wallet(keys[role], provider));
assert.equal(new Set(wallets.map((wallet) => wallet.address)).size, 3);
for (const [i, wallet] of wallets.entries()) console.log(`${roles[i]} ${wallet.address}`);
if (process.argv.includes('--init')) process.exit(0);

assert.equal((await provider.getNetwork()).chainId, 968n, 'Expected BOT Chain testnet');
const balances = await Promise.all(wallets.map((wallet) => provider.getBalance(wallet.address)));
for (const [i, balance] of balances.entries()) console.log(`${roles[i]} balance ${formatEther(balance)} tBOT`);

const [organizer, buyer, scanner] = wallets;

async function confirm(label, tx) {
  console.log(`${label} submitted ${explorer}/tx/${tx.hash}`);
  const receipt = await tx.wait();
  assert.equal(receipt.status, 1, `${label} failed`);
  return receipt;
}

if (process.argv.includes('--fund')) {
  const target = parseEther('1');
  for (const [role, recipient] of [['Buyer', buyer], ['Scanner', scanner]]) {
    const balance = await provider.getBalance(recipient.address);
    if (balance < target) {
      await confirm(`Fund ${role}`, await organizer.sendTransaction({ to: recipient.address, value: target - balance }));
    }
  }
  process.exit(0);
}

if (!process.argv.includes('--send')) process.exit(0);
const price = parseEther('0.01');
assert.ok(balances[0] > 0n && balances[1] > 2n * price && balances[2] > 0n, 'Fund all three test wallets before sending');
const artifact = require('../contracts/artifacts/contracts/Doorlist.sol/Doorlist.json');
const factory = new ContractFactory(artifact.abi, artifact.bytecode, organizer);

const contract = await factory.deploy(organizer.address);
await confirm('Deploy', contract.deploymentTransaction());
const address = await contract.getAddress();
console.log(`Doorlist ${explorer}/address/${address}`);
assert.equal(await contract.treasury(), organizer.address);

const startsAt = Math.floor(Date.now() / 1000) + 3600;
await confirm('Create event', await contract.createEvent('Doorlist testnet rehearsal', startsAt, 5, price, ZeroAddress, 2, 0, ''));
await confirm('Approve scanner', await contract.setDoor(0, scanner.address, true));
await confirm('Buy ticket', await contract.connect(buyer).buy(0, buyer.address, { value: price }));
await confirm('Buy gift', await contract.connect(buyer).buy(0, organizer.address, { value: price }));
await confirm('Check in', await contract.connect(scanner).checkIn(0));

assert.equal(await contract.ownerOf(0), buyer.address);
assert.equal(await contract.ownerOf(1), organizer.address);
assert.equal((await contract.tickets(0)).used, true);
assert.equal((await contract.tickets(1)).used, false);
console.log('Verified five successful core transactions across three testnet wallets.');
