# Pulling Gacha

## Choose a Tier

Navigate to the **Gacha** page and select your tier:

| Tier | Cost | Best For |
|------|------|----------|
| Economy | 1M OCT | Budget pulls, building your collection |
| Sport | 5M OCT | Better odds for Rare and Epic drops |
| Hypercar | 10M OCT | Highest chance for Legendary cars |

## Pull Process

### 1. Request Pricing
The backend signs a pricing payload with:
* Your address
* Selected tier and price
* Expiry timestamp
* Unique nonce

### 2. Commit On-Chain
Your wallet sends a transaction to the smart contract with:
* The signed pricing data
* OCT tokens as payment

The smart contract verifies the backend signature and locks your funds.

### 3. Reveal Result
After the commit is confirmed:
* The backend determines the result (rarity, stats, brand)
* A reveal payload is signed
* You submit the reveal to the smart contract
* The NFT is minted to your wallet

## Understanding Results

### Cars
* **Brand** — Lamborghini, Ferrari, Ford, or Chevrolet
* **Rarity** — Common, Rare, Epic, or Legendary
* **Stats** — Random base Speed, Acceleration, Handling, Drift
* **Slots** — 2-4 equipment slots based on rarity

### Spare Parts
* **Type** — Wheels, Engine, Body, or Shocks
* **Compatible Brand** — Which car brand it fits
* **Bonus Stats** — Stat bonuses when equipped

## Tips

* Start with **Economy** tier to build a diverse collection
* Save for **Hypercar** tier when chasing Legendary drops
* Check your gacha history to track your luck over time
* Spare parts from gacha can significantly boost a Common car's performance
