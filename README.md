# ❄️ Arctic - Polar Profit | Web3 Game on ARC Testnet

> **Mint Arctic Beasts NFTs, stake them in the Ice Mine, and earn $ARCTIC tokens — all on ARC Testnet.**

![Arctic Banner](https://img.shields.io/badge/Network-ARC%20Testnet-blue?style=flat-square)
![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

## 🎮 Game Overview

Arctic is a super-simple idle farming + play-to-earn Web3 game set in the Arctic ice caps.

**Core Loop:**
1. 🔗 Connect wallet → ARC Testnet auto-added
2. 💧 Get free test USDC from [Circle Faucet](https://faucet.circle.com)
3. 🎨 Free mint Arctic Beasts NFTs
4. ⛏️ Stake NFTs → earn $ARCTIC every second
5. 🎁 Claim → upgrade/mint/sell → repeat

## 🐾 Rarity Tiers

| Tier | Animal | Rarity | Reward Multiplier |
|------|--------|--------|-------------------|
| Common | 🦊 Polar Fox | 50% | 1x |
| Rare | 🐧 Penguin | 30% | 3x |
| Epic | 🐻‍❄️ Polar Bear | 15% | 8x |
| Legendary | 🐉 Ice Dragon | 5% | 20x |

## 🌐 ARC Testnet Info

- **Chain ID:** 5042002
- **RPC:** https://rpc.testnet.arc.network
- **Explorer:** https://testnet.arcscan.app
- **Gas Token:** USDC (6 decimals)
- **Faucet:** https://faucet.circle.com

## 📁 Repo Structure

```
arctic-game-arc-testnet/
├── contracts/              # Hardhat project
│   ├── contracts/
│   │   ├── ArcticToken.sol      # $ARCTIC ERC-20
│   │   ├── ArcticBeasts.sol     # NFT collection (free mint)
│   │   ├── ArcticStaking.sol    # Stake NFTs → earn tokens
│   │   └── ArcticMarket.sol     # P2P NFT marketplace
│   ├── scripts/
│   │   └── deploy.js            # One-command deploy
│   ├── hardhat.config.js
│   ├── .env.example
│   └── package.json
├── frontend/               # React + Vite + Wagmi
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── WalletConnect.tsx
│   │   │   ├── Mint.tsx
│   │   │   ├── Stake.tsx
│   │   │   └── Claim.tsx
│   │   └── lib/
│   │       ├── arcChain.ts      # ARC Testnet config
│   │       ├── contracts.json   # Deployed addresses
│   │       └── abis.json        # Contract ABIs
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── README.md
└── .gitignore
```

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/arctic-game-arc-testnet.git
cd arctic-game-arc-testnet
```

### 2. Deploy Contracts

```bash
cd contracts
npm install
cp .env.example .env
# Edit .env → add your testnet private key
npx hardhat compile
npx hardhat run scripts/deploy.js --network arcTestnet
```

**Deploy output will show all 4 contract addresses.** Copy them.

### 3. Update Frontend

Edit `frontend/src/lib/contracts.json` with deployed addresses.

### 4. Run Frontend

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

### 5. Deploy Frontend (Vercel/Netlify)

```bash
cd frontend
npm run build
# Deploy dist/ folder to Vercel/Netlify (one click)
```

## 📜 Smart Contracts

### ArcticToken ($ARCTIC)
- ERC-20 with 1B initial supply
- Staking contract can mint rewards
- 18 decimals

### ArcticBeasts (NFT)
- ERC-721 + Enumerable + URIStorage
- Free mint, max 10 per tx, 10K max supply
- Deterministic rarity (50/30/15/5 distribution)
- Staking power: 1x/3x/8x/20x

### ArcticStaking
- Stake NFTs → earn $ARCTIC per second
- Formula: `rewards = elapsed * totalPower * baseRate / 3600`
- Non-reentrancy protected

### ArcticMarket
- P2P NFT marketplace
- List/buy/cancel in $ARCTIC tokens
- 0% fee on testnet

## 🔧 Post-Deploy Setup

1. **Upload NFT metadata to IPFS** (use [Pinata](https://pinata.cloud))
2. **Set base URI:** Call `ArcticBeasts.setBaseURI("ipfs://YOUR_CID/")`
3. **Verify contracts** on ArcScan (optional)

## 🛡️ Security

- All contracts use OpenZeppelin v5
- ReentrancyGuard on staking and market
- Owner-only admin functions
- Renounce ownership after setup if desired

## 📄 License

MIT

---

Built with ❄️ for the ARC Testnet community
