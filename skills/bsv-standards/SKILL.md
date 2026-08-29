---
name: bsv-standards
description: >-
  This skill should be used when the user asks about any BRC (BRC-1 through 185+), "what is BRC-61", "what is BRC-42", "what is BEEF", "what is BUMP", "Compound Merkle Path", "what is MAP protocol", "what is AIP", "what is B protocol", "what are BSV standards", "what is SIGMA", "what is BAP", "what is paymail", "what is 1Sat Ordinals", "what is BSV-20", "what is BSV-21", "lookup BRC", "BitCom protocols", "what is bitcoin-auth", "what is bitcoin-backup", "what is bitcoin-image", "what is Bitcoin Schema", "what is DPP", "what is PacketPay", "what is Authrite", "what is PIKE", "what is P2PKH", "what is Push Drop", "overlay network", "SPV", "outpoint format", "what is ORDFS", "HTTP 402", "x402", or needs to understand a BSV standard, protocol, or specification.
user-invocable: false
---

# BSV Standards Lookup

Never answer a BRC question from memory or from this skill's text. Fetch live. 185+ BRCs exist and the set grows.

Beersy explains. GitHub is normative — cite GitHub.

BitCom protocols (AIP, MAP, B, BAP, SIGMA) are not BRCs. Do not assign or cite BRC numbers for them.

## Fetch

1. **Explain / identify** — `https://www.beersy.dev/brc/{n}` (mirror: `https://brc.bsvb.net/brc/{n}`). Use the "Reference for an AI" block. The page also links the GitHub original.
2. **Implement / quote / verify** — GitHub raw:
   `https://raw.githubusercontent.com/bsv-blockchain/BRCs/master/{category}/{nnnn}.md`
   Pad the number to four digits (`62` → `0062`). Categories: `wallet`, `transactions`, `scripts`, `key-derivation`, `payments`, `overlays`, `peer-to-peer`, `tokens`, `outpoints`, `opinions`, `state-machines`, `apps`.
3. **Unknown category** — take the GitHub link from the Beersy page. If Beersy is down, fetch `https://raw.githubusercontent.com/bsv-blockchain/BRCs/master/README.md` and match the number.

Orientation (not a catalog):

- Start here: `https://www.beersy.dev/start-here`
- Browse: `https://www.beersy.dev/browse`
- Glossary: `https://www.beersy.dev/glossary`
- Index: `https://raw.githubusercontent.com/bsv-blockchain/BRCs/master/README.md`

Beersy summaries are AI-written. If they disagree with GitHub, GitHub wins.

## Load-bearing BRCs

Fetch these by number when the task matches. Not a complete index.

| Task | Fetch |
|------|--------|
| Wallet-to-app interface | 100, then 116, 46, 1 |
| Key derivation (Type42 / BKDS) | 42, 43 |
| Transaction proof bundle | 62 (BEEF), 95 (Atomic BEEF), 74 (BUMP) |
| SPV | 67 (current); 9 is historical |
| P2P payment / paymail | 29 |
| Message signatures | 77 |
| Mutual auth (Authrite) | 31 |
| HTTP payments | 105, 121 (simple 402), 120 (x402) — no dedicated skill; fetch then implement from the spec |
| Overlay index/sync | 22, 88 — no dedicated skill; fetch |
| 1Sat / BSV-21 in a BRC-100 wallet | 147, 150, 159–165 — no dedicated skill here; hand off to the 1sat plugin after fetching |

## Handoff

| Topic | Skill |
|-------|--------|
| BRC-100 wallet / WalletClient | `wallet-brc100`, `wallet-brc100-go`, `yours-wallet` |
| Type42 / BIP32 / BRC-43 invoice numbers | `key-derivation` |
| BSM / BRC-77 / Sigma / AIP signing | `message-signing` |
| BRC-2 encrypt/decrypt | `wallet-encrypt-decrypt` |
| Raw / EF / BEEF decode | `decode-bsv-transaction` |
| BAP identity CLI | `create-bap-identity`, `manage-bap-backup` |
| `.bep` backups | `encrypt-decrypt-backup` |
| ORDFS content | `ordfs` |
| ScriptTemplate authoring | `create-script-template`, `review-script-template` |
| 1Sat ordinals, BSV-21, marketplace | 1sat plugin (`ordinals-create`, `tokens`, `wallet-setup`) |
| BitCom prefixes and layouts | `references/bitcom-protocols.md` |
| bitcoin-auth / backup / image | `references/offchain-standards.md` |

## Packages

| Package | Covers |
|---------|--------|
| `@bsv/sdk` | Keys, BEEF, BRC-77, BRC-2, WalletClient |
| `@bsv/wallet-toolbox` | BRC-100 wallet |
| `@1sat/templates` | BitCom templates, inscriptions, BSV-20/21 scripts |
| `@1sat/actions` | Ordinals, tokens, identity actions (1sat plugin) |
| `bsv-bap` | BAP identity |
| `sigma-protocol` | SIGMA |
| `bitcoin-auth` | HTTP Bitcoin-Auth-Token |
| `bitcoin-backup` | Encrypted `.bep` |
| `bitcoin-image` | `b://` / `ord://` URL normalization |
