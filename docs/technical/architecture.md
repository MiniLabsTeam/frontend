# 🏗️ Architecture

Complete technical architecture of MiniGarage.

---

## 📊 System Architecture Diagram

![System Architecture](Architecture.png)

---

## 🎨 Frontend (PWA Stack)

### Technology Choices

| Tech | Version | Purpose |
|------|---------|---------|
| **Next.js** | 15.5.9 | React framework with App Router |
| **React** | 19.2.3 | UI library |
| **Tailwind CSS** | 3.4.15 | Utility-first styling |
| **Privy SDK** | 3.12.0 | Auth + embedded wallets |
| **ethers.js** | 6.16.0 | Blockchain interactions |
| **Lucide React** | 0.563.0 | Icon library |
| **next-pwa** | 5.6.0 | Progressive Web App features |
| **Sonner** | 2.0.7 | Toast notifications |

### Why Next.js 15?

- ✅ **App Router** - Modern routing with layouts
- ✅ **Server Components** - Better performance
- ✅ **API Routes** - Built-in backend for simple tasks
- ✅ **Image Optimization** - Automatic image resizing
- ✅ **SEO** - Server-side rendering for metadata
- ✅ **PWA Support** - Works great with next-pwa

### Why Tailwind CSS?

- ✅ **Rapid Development** - No context switching
- ✅ **Consistent Design** - Design system in config
- ✅ **Small Bundle** - Purges unused styles
- ✅ **Responsive** - Mobile-first approach
- ✅ **Dark Mode** - Built-in support (future)

### Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── layout.jsx          # Root layout
│   ├── page.jsx            # Homepage
│   ├── providers.jsx       # Privy + React Query
│   ├── globals.css         # Global styles
│   ├── dashboard/          # Dashboard page
│   ├── gacha/              # Gacha box page
│   │   └── [tier]/         # Dynamic tier routes
│   ├── inventory/          # Collection management
│   ├── marketplace/        # Trading page
│   ├── profile/            # User settings
│   └── history/            # Transaction history
│
├── components/
│   ├── GachaAnimation.jsx  # Box opening animation
│   ├── OnboardingModal.jsx # First-time user guide
│   ├── SetUsernameModal.jsx
│   ├── ShippingInfoModal.jsx
│   └── shared/             # Reusable components
│       ├── Button.jsx
│       ├── BottomNavigation.jsx
│       ├── EmptyState.jsx
│       ├── SkeletonCard.jsx
│       └── ...
│
├── hooks/
│   └── useWallet.js        # Custom wallet hook
│
├── lib/
│   ├── api.js              # Backend API client
│   ├── gachaApi.js         # Gacha-specific API
│   └── mockidrx.js         # IDRX contract helpers
│
├── constants/
│   ├── blockchain.js       # Contract addresses
│   ├── ui.js               # RARITY_CONFIG, etc.
│   └── index.js            # Barrel export
│
└── utils/                  # Helper functions
```

---

## 🔐 Privy (Authentication)

### Google Login → Embedded Wallet Flow

```
1. User clicks "Login with Google"
         │
         ▼
2. Privy OAuth → Google consent screen
         │
         ▼
3. User approves → Privy creates account
         │
         ▼
4. Privy generates embedded wallet
         │ (Wallet keys encrypted with user's OAuth token)
         ▼
5. User lands in app with wallet address
```

### Supported Login Methods

| Method | Icon | User Type |
|--------|------|-----------|
| **Email** | 📧 | General users |
| **Google** | 🔵 | Mainstream users |
| **Twitter** | 🐦 | Crypto-native users |
| **Discord** | 💬 | Gamers |
| **Wallet** | 🔐 | MetaMask/Rainbow users |

### Why Privy?

- ✅ **No seed phrases** - Users never see private keys
- ✅ **Social recovery** - Recover via email/OAuth
- ✅ **Embedded wallet** - Native Web3 experience
- ✅ **Multi-chain** - Supports Base, Ethereum, etc.
- ✅ **Export option** - Users can export keys later

### Privy Configuration

```javascript
// src/app/providers.jsx
import { PrivyProvider } from '@privy-io/react-auth';

<PrivyProvider
  appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID}
  config={{
    loginMethods: ['email', 'google', 'twitter', 'discord', 'wallet'],
    appearance: {
      theme: 'light',
      accentColor: '#0052FF', // Base blue
    },
    embeddedWallets: {
      createOnLogin: 'all-users',
      requireUserPasswordOnCreate: false,
    },
  }}
>
  {children}
</PrivyProvider>
```

---

## ⚡ RPC Provider & Indexer

### RPC Endpoint

**Primary:** `https://sepolia.base.org` (Public)

**Backup Plans:**
- Alchemy Base Sepolia
- Infura Base support
- Self-hosted archive node (future)

### Why Public RPC?

- ✅ **Free** - No API key needed for hackathon
- ✅ **Reliable** - Coinbase infrastructure
- ✅ **Rate limits** - 10 req/sec (enough for MVP)

### Indexer (Future)

**Current:** Direct RPC calls via ethers.js

**Future:** Use The Graph for:
- Historical transaction queries
- NFT ownership tracking
- Marketplace activity feed
- Analytics dashboard

---

## 📦 Metadata Storage

### Current: Backend API

**Why:**
- ✅ Fast iteration during hackathon
- ✅ No IPFS setup complexity
- ✅ Easy to update metadata

**Cons:**
- ❌ Centralized (single point of failure)
- ❌ Not truly decentralized

### Metadata Structure

```json
{
  "name": "Bugatti Chiron #1234",
  "description": "A legendary hypercar from MiniGarage",
  "image": "https://api.minigarage.app/images/bugatti-chiron.png",
  "external_url": "https://minigarage.app/car/1234",
  "attributes": [
    {
      "trait_type": "Series",
      "value": "Hypercar"
    },
    {
      "trait_type": "Rarity",
      "value": "Legendary"
    },
    {
      "trait_type": "Brand",
      "value": "Bugatti Chiron"
    }
  ]
}
```

### Future: IPFS via Pinata

**Post-Hackathon Plan:**

1. **Upload to Pinata:** Images + metadata JSON
2. **Get IPFS CID:** `ipfs://Qm...`
3. **Update tokenURI:** Point NFT to IPFS
4. **Benefit:** Permanent, decentralized storage

**Pinata Integration:**
```javascript
const pinataSDK = require('@pinata/sdk');
const pinata = pinataSDK(API_KEY, API_SECRET);

// Upload image
const imageRes = await pinata.pinFileToIPFS(imageBuffer);
const imageURI = `ipfs://${imageRes.IpfsHash}`;

// Upload metadata
const metadata = { name, image: imageURI, attributes };
const metadataRes = await pinata.pinJSONToIPFS(metadata);
const tokenURI = `ipfs://${metadataRes.IpfsHash}`;
```

---

## 🚀 Deployment

### Frontend: Vercel

**URL:** [mini-garage.vercel.app](https://mini-garage.vercel.app)

**Why Vercel:**
- ✅ **Next.js optimized** - Best performance
- ✅ **Auto deployments** - GitHub integration
- ✅ **Edge Network** - Fast globally
- ✅ **Free tier** - Perfect for hackathon
- ✅ **Custom domains** - Easy DNS setup

**Build Command:**
```bash
npm run build
```

**Output:** Static + serverless functions

---

### Backend: Node.js on Railway/Render

**Alternative 1: Railway**
- ✅ PostgreSQL included
- ✅ Simple deployment
- ✅ Auto-scaling

**Alternative 2: Render**
- ✅ Free tier
- ✅ Persistent storage
- ✅ Easy env vars

**Current:** Backend integrated with frontend via Next.js API routes (for simplicity)

---

### Smart Contracts: Base Sepolia

**Deployment Tool:** Hardhat

```bash
# Deploy contracts
cd contracts
npx hardhat run scripts/deploy.js --network baseSepolia
```

**Post-Deployment:**
1. Verify on BaseScan
2. Update frontend `.env` with addresses
3. Grant minter roles to backend wallet

---

## 🔄 Data Flow Examples

### Opening a Gacha Box

```
1. Frontend: User clicks "Open Standard Box"
         │
         ▼
2. Frontend: Check IDRX balance (ethers.js → RPC)
         │
         ▼
3. Frontend: Approve IDRX spend (contract.approve())
         │
         ▼
4. Frontend: POST /api/gacha/open { boxType: "standard" }
         │
         ▼
5. Backend: Verify Privy JWT
         │
         ▼
6. Backend: Check user owns approved IDRX
         │
         ▼
7. Backend: transferFrom() IDRX to backend wallet
         │
         ▼
8. Backend: burn() IDRX
         │
         ▼
9. Backend: Generate random reward (RNG)
         │
         ▼
10. Backend: Mint Car/Fragment NFT to user
         │
         ▼
11. Backend: Save activity to PostgreSQL
         │
         ▼
12. Backend: Return { reward, txHash }
         │
         ▼
13. Frontend: Show animation + update UI
```

---

## 📊 Performance Metrics

| Metric | Target | Current |
|--------|--------|---------|
| **Page Load** | <2s | ~1.5s |
| **Time to Interactive** | <3s | ~2.5s |
| **Lighthouse Score** | 90+ | 92 |
| **Bundle Size** | <300KB | ~250KB |
| **API Response** | <500ms | ~300ms |
| **TX Confirmation** | <5s | ~3s |

---

## 🔐 Security Architecture

| Layer | Protection |
|-------|------------|
| **Frontend** | Input validation, XSS prevention |
| **API** | Privy JWT, rate limiting, CORS |
| **Smart Contracts** | OpenZeppelin, ReentrancyGuard |
| **Database** | SQL injection protection, encrypted data |
| **Wallet** | Privy encryption, no private key exposure |

---

## 🧪 Testing Stack

| Type | Tool |
|------|------|
| **Unit Tests** | Jest |
| **Component Tests** | React Testing Library |
| **E2E Tests** | Playwright |
| **Contract Tests** | Hardhat + Chai |
| **Load Tests** | k6 (future) |
