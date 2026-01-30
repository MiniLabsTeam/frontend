# 🏪 NFT Marketplace

A peer-to-peer marketplace where collectors trade real, on-chain assets — coordinated by backend services for a gasless user experience.

---

## 📈 Trading Features

The MiniGarage Marketplace allows collectors to **buy and sell Car NFTs and Fragments** using IDRX.

* **Sell Your Assets**  
  List complete cars or spare fragments for IDRX.

* **Buy Missing Parts**  
  Purchase specific fragments needed to assemble a full car.

* **Player-Driven Pricing**  
  All prices are set by users, not by the platform.

---

## 💰 Fees & Economics

<table data-card-size="large" data-view="cards">
<thead><tr><th>Item</th><th>Details</th></tr></thead>
<tbody>
<tr>
<td><strong>Listing Fee</strong></td>
<td>Free</td>
</tr>
<tr>
<td><strong>Gas Fees</strong></td>
<td>Sponsored by MiniGarage</td>
</tr>
<tr>
<td><strong>Service Fee</strong></td>
<td>2.5% (deducted from seller)</td>
</tr>
<tr>
<td><strong>Currency</strong></td>
<td>IDRX only</td>
</tr>
</tbody>
</table>

> ♻️ Marketplace fees are routed to the **Treasury** to fund gas sponsorship and platform operations.

---

## ⚙️ How Trading Works (Backend-Coordinated)

MiniGarage currently uses an **off-chain listing system** with **on-chain settlement**.

### Step-by-Step Flow

1. **Seller Creates Listing**
   - NFT stays in seller’s wallet
   - Seller approves backend relayer to transfer NFT upon sale

2. **Buyer Purchases**
   - Buyer approves IDRX spending
   - Buyer clicks “Buy” (no ETH required)

3. **Backend Executes Trade**
   - Transfers IDRX from buyer → seller (minus 2.5% fee)
   - Transfers NFT from seller → buyer
   - Backend pays all gas fees

> 🔒 If any step fails, the transaction is reverted and no assets move.

---

## 🧩 Supported Assets

The marketplace supports two on-chain asset types:

### 🚗 Car NFTs (ERC-721)
- Fully assembled cars
- Tradeable immediately
- Future physical redemption (RWA)

### 🧩 Fragment NFTs (ERC-1155)
- Represent crafting progress
- Lower entry cost
- Highly liquid among collectors

> 💡 This ensures that even fragment rewards retain real market value.

---

## 🔗 On-Chain Settlement

Although listings are handled off-chain, **all asset transfers happen on-chain**:

- IDRX transfers via `MockIDRXv2`
- Car ownership via `BaseWheelsCars`
- Fragment ownership via `BaseWheelsFragments`

Users always retain **true on-chain ownership**.

---

## ⚡ Gasless Experience

MiniGarage removes Web3 friction:

* Users never pay gas
* Backend relayer submits transactions
* Users only sign approvals
* No ETH balance required

---

## 🔮 Roadmap: On-Chain Marketplace

Post-hackathon, the marketplace will be upgraded to a fully on-chain smart contract:

- On-chain listings
- Trustless atomic swaps
- Reduced backend dependency
- Full decentralization

This MVP prioritizes **UX, speed, and accessibility** while preserving real ownership.
