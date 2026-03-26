# FAQ

## General

### What is MiniLabs?
MiniLabs is an NFT car racing game on OneChain where you collect cars, race against players, trade on the marketplace, and predict race outcomes.

### What blockchain does MiniLabs use?
MiniLabs is built on **OneChain**, a high-performance Sui-based blockchain.

### What is OCT?
OCT is the native token on OneChain, used for gacha pulls, marketplace trades, prediction bets, and transaction fees.

---

## Wallet & Account

### Which wallets are supported?
Any OneChain-compatible wallet that implements the Sui wallet standard.

### How do I get OCT tokens?
During testnet, you can use the OneChain Testnet Faucet to request free test tokens.

### Is my private key safe?
Yes. MiniLabs never accesses your private key. Authentication uses a sign-message flow where you sign a nonce with your wallet — the private key never leaves your device.

---

## Gacha

### Is the gacha system fair?
Yes. MiniLabs uses a **commit-reveal pattern** — you commit funds before the result is known, and the result is determined after your commitment. This is cryptographically verifiable on-chain.

### What can I get from gacha?
Either an **NFT Car** or a **Spare Part**, each with random rarity, brand, and stats.

### Can I get a refund on a gacha pull?
No. Once committed on-chain, the pull is final. This is by design to maintain the integrity of the commit-reveal process.

---

## Racing

### Can people cheat in races?
No. MiniLabs uses a **server-authoritative game engine** — the server runs all physics at 60 FPS and clients only send input. There's no way to modify game state from the client side.

### Do car stats matter?
Yes. Speed, Acceleration, Handling, and Drift directly affect race performance. Equipped spare parts add bonus stats.

### What happens if I disconnect during a race?
Your car stops receiving input and will gradually slow down. In multiplayer, other players continue racing.

---

## Marketplace

### How much are marketplace fees?
**5% total** — 2.5% marketplace fee + 2.5% royalty fee, deducted from the sale price.

### Can I cancel a listing?
Yes, you can cancel anytime before the item is sold. Your NFT is returned to your wallet.

### Are trades instant?
Yes. Once you confirm the buy transaction, the NFT is transferred and OCT is paid in the same atomic transaction.

---

## Physical Cars (RWA)

### Which cars can be claimed as physical models?
Only **Legendary** rarity cars with all 4 spare part slots equipped.

### Can I still trade a car after claiming?
No. Claimed cars are locked from marketplace trading, but they remain in your wallet as digital collectibles.

### How long does shipping take?
Shipping times vary by location. Track your claim status on the Claim page.

---

## Technical

### Is the code open source?
The project repositories are available on GitHub.

### What if the server goes down?
Your NFTs are safe — they exist on the blockchain, not on our servers. The server is needed for racing and real-time features, but your digital assets are always secure on-chain.

### Can I run my own backend?
The backend is open source. However, smart contract operations require the authorized backend signing key for security.
