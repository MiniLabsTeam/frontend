# 🏎️ MiniGarage

> **Collect. Build. Own.** - The Ultimate NFT Car Collection Platform on Base

[![Built on Base](https://img.shields.io/badge/Built%20on-Base-0052FF?style=for-the-badge&logo=coinbase)](https://base.org)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![Privy](https://img.shields.io/badge/Auth-Privy-purple?style=for-the-badge)](https://privy.io)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Smart Contracts](#-smart-contracts)
- [Demo](#-demo)
- [Team](#-team)

---

## 🎯 Overview

**MiniGarage** is a Web3 gaming platform that brings the thrill of collecting die-cast cars into the blockchain era. Players can collect, trade, and own exclusive NFT cars through an engaging gacha system, all powered by the Base blockchain.

### 🛑 The Problem

*   **No True Ownership:** Gamers spend billions on in-game items locked in walled gardens, losing everything if servers shut down.
*   **Unverifiable Scarcity:** Digital "limited editions" are often arbitrary, with no guarantee that developers won't mint more.
*   **RWA Supply Mismatch:** Many projects oversell NFTs beyond their physical stock, leading to redemption failures.
*   **Inefficient Collecting:** Real-world collectors waste time hunting for inventory in physical stores without real-time transparency.
*   **Unfair RNG:** Pure gacha systems leave players with useless duplicates and no clear path to their desired item.
*   **Web3 Friction:** Mainstream users are discouraged by complex wallet setups and gas fees.

### ✅ The Solution

MiniGarage bridges the gap between physical collecting and digital ownership through a transparent, fair, and accessible ecosystem:

*   **Hard-Capped RWA Supply:** We enforce a strict **1:1 limit**. Digital minting is directly tied to real-world inventory. When physical cars run out, the gacha and assembly mechanisms automatically disable.
*   **Fair Progression:** A hybrid model combining **Gacha** thrills with **Fragment Assembly**. Bad luck is mitigated—accumulate fragments to guarantee crafting your dream car.
*   **Seamless Onboarding:** Powered by **Privy**, users login via email or socials with gas-sponsored transactions, making the blockchain interaction invisible.
*   **Real-Time Transparency:** Collectors know exactly how many units remain, eliminating the guesswork of physical hunting.

#### 🔮 Future Roadmap
*   **ERC-6551 Integration:** We plan to explore **Token Bound Accounts** to give each car its own unique identity and provenance layer, allowing vehicles to hold their own upgrade history and racing achievements.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎰 **Gacha System** | 4-tier box system (Standard, Rare, Premium, Legendary) with car fragments and complete cars |
| 🔧 **Car Crafting** | Collect 5 fragments (Chassis, Wheels, Engine, Body, Interior) to mint a complete car NFT |
| 💼 **Digital Wallet** | Privy-powered embedded wallet with social login support |
| 🏪 **Marketplace** | Trade cars and fragments with other collectors |
| 📦 **Inventory** | Manage your collection with detailed car stats and rarity info |
| 🎨 **PWA Support** | Install as a mobile app for the best experience |

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS
- **Auth:** Privy React Auth
- **Icons:** Lucide React
- **PWA:** next-pwa

### Blockchain
- **Network:** Base (Ethereum L2)
- **Token:** MockIDRX (ERC-20)
- **NFTs:** ERC-721 (Cars & Fragments)
- **Library:** ethers.js v6

### Backend
- Node.js / Express
- PostgreSQL
- Smart Contract Integration

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   Next.js PWA   │────▶│  Backend API    │────▶│  Base Network   │
│   (Frontend)    │     │  (Node.js)      │     │  (Blockchain)   │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │                       │                       │
        ▼                       ▼                       ▼
   Privy Auth            PostgreSQL DB           Smart Contracts
   (Embedded Wallet)     (User Data)             (NFT & Token)
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Privy Account (for API keys)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-team/minigarage.git
cd minigarage/frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Privy API keys and backend URL

# Run development server
npm run dev
```

### Environment Variables

```env
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_CHAIN_ID=8453
```

### Production Build

```bash
npm run build
npm run start
```

---

## 📜 Smart Contracts

| Contract | Description | Address |
|----------|-------------|---------|
| MockIDRX | ERC-20 Game Token | `0x...` |
| CarNFT | ERC-721 Car Collection | `0x...` |
| FragmentNFT | ERC-721 Car Fragments | `0x...` |
| GachaVault | Gacha Box Logic | `0x...` |

---

## 🎮 Demo

- **Live Demo:** [minigarage.app](https://minigarage.app)
- **Video Demo:** [YouTube Link](#)

### Screenshots

<p align="center">
  <img src="public/screenshots/home.png" width="200" alt="Home" />
  <img src="public/screenshots/gacha.png" width="200" alt="Gacha" />
  <img src="public/screenshots/inventory.png" width="200" alt="Inventory" />
</p>

---

## 👥 Team

| Name | Role | GitHub |
|------|------|--------|
| Diva Filemon | Full Stack Developer | [@github](#) |
| Imanuel Putra | Smart Contract Developer | [@github](#) |
| Sargio | UI/UX Designer | [@github](#) |

---

## 📄 License

This project is built for hackathon purposes. MIT License.

---

<p align="center">
  <b>Built with ❤️ for Base Hackathon 2026</b>
</p>
