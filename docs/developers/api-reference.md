# API Reference

Base URL: `https://minilabs-backend.up.railway.app`

All authenticated endpoints require: `Authorization: Bearer <JWT>`

---

## Authentication

### POST `/api/auth/nonce`
Get a signing nonce for wallet authentication.

**Body:**
```json
{ "address": "0x..." }
```

**Response:**
```json
{
  "success": true,
  "data": { "nonce": "...", "message": "Sign this message..." }
}
```

### POST `/api/auth/connect`
Verify wallet signature and receive JWT.

**Body:**
```json
{
  "address": "0x...",
  "signature": "0x...",
  "message": "Sign this message..."
}
```

**Response:**
```json
{
  "success": true,
  "data": { "accessToken": "jwt...", "refreshToken": "..." }
}
```

### GET `/api/auth/me`
Get current user info. *Requires auth.*

### POST `/api/auth/refresh`
Refresh an expired access token.

### PUT `/api/auth/profile`
Update username or email. *Requires auth.*

---

## Inventory

### GET `/api/inventory/cars`
List user's NFT cars. *Requires auth.*

### GET `/api/inventory/spareparts`
List user's spare parts. *Requires auth.*

### GET `/api/inventory/stats`
Get collection statistics. *Requires auth.*

### POST `/api/inventory/equip`
Equip a spare part to a car. *Requires auth.*

**Body:**
```json
{ "carUid": "...", "partUid": "..." }
```

### POST `/api/inventory/unequip`
Remove a spare part from a car. *Requires auth.*

---

## Gacha

### GET `/api/gacha/tiers`
Get available gacha tiers and prices.

### GET `/api/gacha/stats`
Get global gacha statistics.

### POST `/api/gacha/pricing`
Get signed pricing for a gacha pull. *Requires auth.*

**Body:**
```json
{ "tierId": 1 }
```

### POST `/api/gacha/pull-with-tokens`
Pull gacha using server-side token balance. *Requires auth.*

### GET `/api/gacha/history`
Get user's gacha pull history. *Requires auth.*

---

## Game

### POST `/api/game/room/create`
Create a new game room. *Requires auth.*

### POST `/api/game/room/:id/join`
Join an existing room. *Requires auth.*

### GET `/api/game/room/:id`
Get room status and players.

### POST `/api/game/:id/input`
Send player input during a race. *Requires auth.*

### GET `/api/game/:id/state`
Poll current game state.

### POST `/api/game/endless/score`
Submit 3D Endless Race score. *Requires auth.*

**Body:**
```json
{
  "score": 15000,
  "distance": 2500,
  "maxSpeed": 180,
  "gameTime": 45.5,
  "obstaclesDodged": 32,
  "carUid": "...",
  "carName": "Blaze Runner"
}
```

---

## Marketplace

### GET `/api/marketplace/listings`
Browse active marketplace listings.

**Query params:** `type`, `rarity`, `brand`, `minPrice`, `maxPrice`, `page`, `limit`

### POST `/api/marketplace/list`
List an NFT for sale. *Requires auth.*

### POST `/api/marketplace/buy/:listingId`
Buy a listed NFT. *Requires auth.*

### POST `/api/marketplace/cancel/:listingId`
Cancel your listing. *Requires auth.*

### GET `/api/marketplace/my-listings`
Get your active listings. *Requires auth.*

---

## Prediction

### GET `/api/prediction/pools`
Get active prediction pools.

### POST `/api/prediction/bet`
Place a bet on a race outcome. *Requires auth.*

### POST `/api/prediction/deposit`
Record an OCT deposit for predictions. *Requires auth.*

### POST `/api/prediction/withdraw`
Withdraw prediction balance. *Requires auth.*

---

## Quests

### GET `/api/quest/active`
Get active quests and progress. *Requires auth.*

### POST `/api/quest/claim/:questId`
Claim a completed quest reward. *Requires auth.*

---

## RWA (Physical Claims)

### GET `/api/rwa/eligible`
Get cars eligible for physical claim. *Requires auth.*

### POST `/api/rwa/claim/:carUid`
Submit a physical car claim. *Requires auth.*

### GET `/api/rwa/claims`
Get your claim history and status. *Requires auth.*

---

## Health

### GET `/health`
Server health check (no auth required).

```json
{
  "status": "healthy",
  "timestamp": "2026-03-26T...",
  "uptime": 3600,
  "database": "connected",
  "redis": "connected"
}
```
