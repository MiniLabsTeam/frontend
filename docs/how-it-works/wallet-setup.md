# Wallet Setup

## Supported Wallets

MiniGarage uses **@onelabs/dapp-kit** for wallet integration. Any OneChain-compatible wallet that implements the Sui wallet standard is supported.

## Getting OCT Tokens

OCT is the native token on OneChain used for:
* Pulling gacha boxes
* Trading on the marketplace
* Betting in prediction markets
* Paying transaction fees

### Testnet Faucet

During testnet, you can get free OCT tokens:
1. Visit the OneChain Testnet Faucet
2. Enter your wallet address
3. Request test tokens

## Wallet Connection Flow

MiniGarage uses a secure **nonce-signature** authentication:

1. **Nonce Request** — Backend generates a unique nonce for your address
2. **Message Signing** — Your wallet signs a message containing the nonce
3. **Verification** — Backend verifies the signature matches your address
4. **JWT Issued** — A session token is issued for API access

This ensures:
* Your private key never leaves the wallet
* Each login is unique (replay-proof via nonce)
* Sessions expire after 7 days (configurable)

## Network Configuration

MiniGarage operates on **OneChain Testnet**:

| Parameter | Value |
|-----------|-------|
| Network | OneChain Testnet |
| Chain ID | `1bd5c965` |
| RPC URL | `https://rpc-testnet.onelabs.cc` |
| Native Token | OCT |

> Make sure your wallet is set to OneChain Testnet. The app will show a network warning if you're on the wrong chain.
