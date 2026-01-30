# 📜 Smart Contracts

MiniGarage smart contract suite deployed on Base Sepolia, designed with a **hybrid architecture** that balances on-chain ownership and off-chain game logic for optimal user experience.

---

## 🎯 Contract Suite Overview

MiniGarage currently uses **3 core smart contracts** that form the foundation of the game economy and asset ownership:

<table data-card-size="large" data-view="cards">
<thead><tr><th></th><th></th><th></th></tr></thead>
<tbody>
<tr>
<td><strong>MockIDRXv2</strong></td>
<td>ERC-20</td>
<td>In-game currency + gasless payments (Server-relayed)</td>
</tr>
<tr>
<td><strong>BaseWheelsFragments</strong></td>
<td>ERC-1155</td>
<td>Car part fragments for crafting (Semi-fungible)</td>
</tr>
<tr>
<td><strong>BaseWheelsCars</strong></td>
<td>ERC-721</td>
<td>Complete car NFTs (RWA-ready, Burnable)</td>
</tr>
</tbody>
</table>

> **🎯 Design Choice:** Game logic (gacha RNG, assembly validation, marketplace logic) is handled off-chain by backend services, while ownership, balances, and scarcity live on-chain.

---

## 🧱 Architecture Philosophy

MiniGarage follows a **hybrid Web2.5 architecture**:

### Smart Contracts
*   **Enforce ownership**
*   Handle balances and transfers
*   Enable burning for crafting & redemption

### Backend Services
*   Execute game logic (RNG, gacha rolls)
*   Validate crafting rules
*   Sponsor gas fees (gasless UX)

> **This approach prioritizes:**
> ⚡ Speed | 🧠 Simplicity | 📱 Consumer-grade UX

---

## 📋 Token Standards Used

### 1. ERC-20 — In-game Currency
**Used for:** IDRX (Mock Indonesian Rupiah)

*   **Familiar denomination** (2 decimals)
*   **Simple approvals** and transfers
*   **Compatible** with wallets and tooling
*   Enables **gas abstraction** via server relay

**Contract:** `MockIDRXv2.sol`

### 2. ERC-1155 — Fragment System
**Used for:** Car part fragments

**Why ERC-1155?**
*   Fragment types are semi-fungible
*   **Efficient batch minting & burning**
*   Ideal for crafting mechanics
*   **Lower gas cost** than ERC-721

**Fragment Types:**
*   `0` — Chassis
*   `1` — Wheels
*   `2` — Engine
*   `3` — Body
*   `4` — Interior

**Contract:** `BaseWheelsFragments.sol`

### 3. ERC-721 — Complete Cars (RWA)
**Used for:** Fully assembled cars

**Why ERC-721?**
*   Each car is **unique**
*   **Full ownership** & transferability
*   **Marketplace compatible**
*   Supports **burn-for-redemption** (RWA)

**Contract:** `BaseWheelsCars.sol`

---

## 📜 Contract Details

### 1️⃣ MockIDRXv2 (ERC-20)

**Purpose:** In-game currency with gasless transaction support via server wallet relay.

**Key Characteristics:**
*   **Decimals:** 2 (Rupiah-like)
*   **Faucet-enabled** (testnet)
*   **Treasury-based economy**
*   **Server-relayed payments**

**Key Functions:**
*   `claimFaucet()`: Claim free IDRX every 24 hours (Testnet only).
*   `payForSpinOnBehalfOf(address user, uint256 cost)`: Gasless payment flow. Server wallet pays gas, tokens transferred from `user` → `treasury`.
*   `batchPayForSpinOnBehalfOf(...)`: Batch version for gas optimization.
*   `burn(uint256 amount)`: Burn tokens from caller.

### 2️⃣ BaseWheelsFragments (ERC-1155)

**Purpose:** Represents modular car parts used for assembly.

**Key Functions:**
*   `mintFragment(address to, uint256 id, uint256 amount)`: Mint fragment type to user (Auth: Backend).
*   `mintBatch(...)`: Batch minting for efficiency.
*   `burnForAssembly(address user, uint256[] ids, uint256[] amounts)`: Burns fragments during crafting. Called by backend after validation.
*   `checkAllParts(address user)`: Returns balances of all fragment types.

> **🔎 Trust Model:** Backend only calls burn after user-initiated crafting action.

### 3️⃣ BaseWheelsCars (ERC-721)

**Purpose:** Represents fully assembled cars and real-world collectible claims.

**Key Functions:**
*   `mintCar(address to)`: Mint a new car NFT. Called by backend after successful gacha or assembly.
*   `burnForRedeem(uint256 tokenId)`: Permanently burns NFT for physical redemption (RWA).
*   `tokenURI(uint256 tokenId)`: Metadata served via backend / IPFS.
*   `totalSupply()`: Returns total minted cars.

---

## 🔐 Security Model

### Access Control
MiniGarage uses a simple and auditable permission model:
*   `owner` — contract admin
*   `authorizedMinters` — backend services

**Implemented via:**
*   OpenZeppelin `Ownable`
*   Mapping-based minter authorization (gas-efficient)

### Gasless Transaction Model
1.  Users approve once
2.  Server wallet relays transactions
3.  Users pay with **IDRX**
4.  Server pays **gas**

**Removes:**
*   ❌ ETH requirement
*   ❌ Gas confusion
*   ❌ Wallet friction

### Input Validation
All contracts validate:
*   ✅ Non-zero addresses
*   ✅ Authorized callers
*   ✅ Valid IDs and balances
*   ✅ Proper ownership before burn

---

## 🧪 Testing Status

*   **Unit-tested core flows:**
    *   IDRX transfers & faucet
    *   Fragment mint/burn
    *   Car mint/burn
*   **Manual integration testing** via frontend
*   🔧 Full automated coverage planned post-hackathon.

---

## 🚀 Future Improvements

**Known Limitations (Transparent Disclosure):**
*   ❌ Gacha RNG not on-chain (backend-driven)
*   ❌ No on-chain marketplace yet
*   ❌ Supply cap enforced off-chain (testnet phase)

> These are intentional tradeoffs for speed and UX during early development.

**Roadmap (Post-Hackathon):**
*   [ ] On-chain supply cap for RWA cars
*   [ ] Chainlink VRF for provably fair RNG
*   [ ] ERC-2981 royalties
*   [ ] On-chain marketplace
*   [ ] Multi-sig treasury
*   [ ] Optional ERC-6551 (token-bound inventory)

---

## ✅ Summary

**MiniGarage smart contracts are:**
*   **Simple**
*   **Purpose-built**
*   **Consumer-first**
*   **RWA-ready**

> Ownership is enforced on-chain, while gameplay remains **fast, flexible, and scalable**.