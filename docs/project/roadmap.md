# 🗺️ Roadmap

MiniGarage development roadmap after Hackathon MVP.

---

## 🎯 Hackathon MVP (Completed) ✅

**Timeline:** Dec 2025 – Jan 2026  

This phase validates the **core product loop**:

> **Gacha → Fragment → Assembly → Trade → Ownership**

### Delivered

- ✅ IDRX-based Gacha System  
- ✅ Fragment Assembly (burn fragments → mint car NFT)  
- ✅ Car NFT & Fragment NFT smart contracts  
- ✅ Base Mini App integration  
- ✅ Backend-coordinated marketplace (MVP)  
- ✅ MockIDRX on Base Sepolia  
- ✅ Gas-sponsored transactions (user-friendly UX)

> **Outcome:**  
> A fully playable Web3 collectible game with real ownership and on-chain assets.

---

## 🚀 Post-Hackathon Roadmap

Post-hackathon development is split into **three clear quarters** to ensure
security, scalability, and long-term RWA viability.

---

## 🟢 Q1 2026 — Alpha Stabilization

**Focus:** Security, UX polish, and early community traction

### Goal
> Make MiniGarage **stable, understandable, and trustworthy** for early adopters.

---

### 🔐 Security & Reliability
- Smart contract review & internal audit
- Admin wallet migration to **multi-sig**
- Rate limiting (faucet, gacha, marketplace)
- Incident response & rollback plan

---

### 🎮 UX & Gameplay
- Interactive onboarding tutorial
- Clear gacha odds & rarity indicators
- Collection progress (% completion per series)
- Achievement & badge system (basic)

---

### 🏪 Marketplace V2 — User-Owned Listings

> **Key Upgrade:** Marketplace evolves from admin-led to **user-owned trading**.

- Users can **list and sell their own NFTs**
- NFTs remain in **user wallets** (non-custodial)
- Listing uses **approval-based selling**, not NFT deposits
- Users set their own prices in IDRX
- Platform only facilitates settlement (2.5% service fee)

**Important:**  
Users **do NOT need to send NFTs to admin** to sell them.

---

### 👥 Community
- Public user profiles
- Collector & trader leaderboards
- Social sharing (gacha results, collections)

---

## 🟡 Q2 2026 — Beta & Mainnet Preparation

**Focus:** Fairness, scalability, and economic credibility

### Goal
> Prepare MiniGarage for **real users and real value** on mainnet.

---

### ⛓️ Mainnet Readiness
- Deploy contracts to **Base Mainnet**
- Meta-transactions (gas sponsorship)
- Emergency pause / circuit breaker
- Upgrade strategy (UUPS / proxy)

---

### 🎲 Fair & Transparent Gacha
- Chainlink VRF (provably fair RNG)
- Transparent supply caps per car model
- On-chain mint counters tied to **real-world inventory**

---

### 💰 Economy & Trust
- Finalize IDRX strategy (stablecoin / pricing layer)
- Treasury transparency dashboard
- Marketplace fee tuning based on real usage data

---

### 📦 RWA Foundations
- Physical inventory mapping (off-chain ↔ on-chain)
- Redemption logic design (NFT → physical)
- Immutable on-chain redemption records

---

## 🔵 Q3 2026 — RWA & Ecosystem Expansion

**Focus:** Real-world assets, retention, and differentiation

### Goal
> Transform MiniGarage into a **digital-first RWA collectibles platform**.

---

### 🚚 Physical Redemption (V1)
- Burn NFT → claim physical die-cast
- Shipping workflow (limited regions)
- Redemption status tracking
- Proof of authenticity (QR / serial)

---

### 🎮 Gameplay Expansion
- Car attributes (cosmetic & stats)
- Limited edition & seasonal drops
- Brand or community collaborations

---

### 🌍 Platform Growth
- External wallet support (WalletConnect)
- Cross-platform access (beyond Mini App)
- Partner integrations (brands, creators, communities)

---

## 📊 Roadmap Overview Diagram

```mermaid
flowchart LR
    A[Hackathon MVP ✅] --> B[Q1 2026<br/>Alpha Stabilization]
    B --> C[Q2 2026<br/>Beta & Mainnet Prep]
    C --> D[Q3 2026<br/>RWA & Expansion]

    A:::done
    B:::phase
    C:::phase
    D:::future

    classDef done fill:#c8f7c5,stroke:#2ecc71,color:#000;
    classDef phase fill:#dbeafe,stroke:#3b82f6,color:#000;
    classDef future fill:#fde68a,stroke:#f59e0b,color:#000;
