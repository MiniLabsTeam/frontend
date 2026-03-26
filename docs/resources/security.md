# Security

MiniGarage takes security seriously across every layer of the stack.

## Authentication

* **Nonce-based wallet signing** — each login requires signing a unique nonce
* **JWT with expiry** — access tokens expire after 7 days
* **Refresh token rotation** — refresh tokens are single-use
* **No password storage** — authentication is entirely wallet-based

## Smart Contract Security

* **Ed25519 signature verification** — all critical operations require backend signatures
* **Nonce anti-replay** — each signed operation uses a unique nonce, tracked on-chain
* **Signature expiry** — signed payloads expire after 5 minutes
* **Escrow pattern** — marketplace NFTs are held by the contract, not by users

## Server Security

* **Server-authoritative game engine** — clients cannot modify game state
* **Rate limiting** — API endpoints are rate-limited to prevent abuse
* **Helmet.js** — HTTP security headers (CSP, XSS protection, etc.)
* **Input validation** — all requests validated with Joi schemas
* **CORS restrictions** — only authorized origins can access the API
* **TLS encryption** — all connections use HTTPS/WSS

## Data Security

* **PostgreSQL with TLS** — encrypted database connections via Neon
* **Redis with TLS** — encrypted cache connections via Upstash
* **No sensitive data in client** — private keys and secrets never leave the server
* **Environment variables** — all secrets stored as environment variables, never in code

## Anti-Cheat

| Layer | Protection |
|-------|-----------|
| **Game Engine** | Server-authoritative physics, no client-side simulation |
| **Race Results** | Ed25519 signed by backend before on-chain submission |
| **Gacha** | Commit-reveal prevents result manipulation |
| **Predictions** | Bets locked before race starts, settlement signed by backend |
| **Marketplace** | Smart contract escrow prevents double-spending |

## Responsible Disclosure

If you discover a security vulnerability, please report it responsibly through our GitHub repository's security advisory feature.
