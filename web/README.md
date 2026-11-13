# Doorlist web app

The static frontend for [Doorlist](../README.md). It has no server: every screen reads the Portaldot V3 testnet
contract directly (`lib/deployment.json` holds the address and ABI).

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static export to out/, then tools/check-chunks.mjs checks every chunk parses
```

## BOT Chain testnet rehearsal

From the repository root, compile the contracts with `cd contracts && npx hardhat compile`, then return to the root. Run `node scripts/rehearse-bot-testnet.mjs --init` once to create three disposable test wallets. Fund the organizer from the [official faucet](https://faucet.botchain.ai/basic), then use `--fund` to top up the buyer and scanner and `--send` to deploy and run the five contract actions. The script prints explorer links for the contract and transactions.

Set `NEXT_PUBLIC_BOT_TESTNET_CONTRACT` to the deployed contract address before running `npm run dev` or `npm run build` in `web`. Connect an EVM browser wallet on chain `968` and use tBOT for tickets and fees. For the browser check, create a new event, approve the scanner address shown by the door page, and scan an unused ticket displayed by the buyer. The rehearsal uses event details without media uploads.

| Path | What lives there |
|---|---|
| `lib/doorlist.ts` | Every contract read, from storage (see the architecture doc for why not logs) |
| `lib/wallet.tsx` | Sign-in chooser and writes for Ethereum-style wallets |
| `lib/substrate.ts` | Portaldot Wallet: `revive.call` writes, dry runs, signing |
| `lib/pass.ts` | The rotating door code and its verification |
| `lib/media.ts` | Event media in `transactionStorage` |
| `tools/` | A loader that works around an SWC minifier bug in `@scure/sr25519`, and the chunk check |

Architecture: [docs/architecture.md](../docs/architecture.md).
