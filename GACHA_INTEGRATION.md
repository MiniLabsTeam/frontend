# Gacha Backend Integration

## 📋 Overview

Sistem gacha frontend sudah terintegrasi dengan backend API untuk:
- Fetch available gacha boxes dan user coins
- Open gacha box dan mint NFT on-chain
- Display real-time rewards dan transaction hash

---

## 🔌 API Endpoints yang Digunakan

### 1. **GET `/gacha/boxes`**
Mengambil daftar gacha boxes dan coins user.

**Response:**
```json
{
  "userCoins": 150,
  "boxes": [
    {
      "type": "standard",
      "costCoins": 50,
      "canAfford": true,
      "rewards": [...]
    },
    {
      "type": "premium",
      "costCoins": 150,
      "canAfford": true,
      "rewards": [...]
    },
    {
      "type": "legendary",
      "costCoins": 500,
      "canAfford": false,
      "rewards": [...]
    }
  ]
}
```

### 2. **POST `/gacha/open`**
Membuka gacha box dan mint NFT.

**Request:**
```json
{
  "boxType": "standard" // atau "premium", "legendary"
}
```

**Response:**
```json
{
  "success": true,
  "boxType": "standard",
  "reward": {
    "tokenId": 1234567890,
    "modelName": "BMW M3",
    "series": "Sport",
    "rarity": "rare",
    "txHash": "0x..."
  },
  "coins": {
    "spent": 50,
    "remaining": 100
  },
  "message": "Congratulations! You got a rare BMW M3!"
}
```

---

## 🎨 UI Features

### **Header**
- **💰 Coins Badge** (kiri): User coins dari backend database
- **Ξ ETH Badge** (kanan): Blockchain balance (clickable untuk switch network)

### **Box Selection**
- 3 tabs untuk pilih box type: Standard, Premium, Legendary
- Menampilkan cost per box
- Disabled jika user tidak punya cukup coins

### **Cost Display**
- Menampilkan cost dari selected box type secara dinamis
- Icon 💰 untuk coins

### **Reward Result**
- Car name dan series
- Rarity badge dengan color gradient
- Token ID NFT
- Transaction hash (clickable link ke BaseScan)
- Claim button untuk spin lagi

---

## 🔄 Flow

1. **Page Load**
   - Fetch gacha boxes dari backend → `GET /gacha/boxes`
   - Fetch blockchain balance → `eth_getBalance`

2. **Select Box Type**
   - User pilih: Standard (50), Premium (150), atau Legendary (500)
   - Cost display update otomatis

3. **Slide to Open**
   - User slide slider ke kanan
   - Trigger `POST /gacha/open` dengan selected box type

4. **Backend Processing**
   - Check user coins cukup atau tidak
   - Random select reward based on probability
   - Mint NFT on-chain (smart contract)
   - Deduct coins from user
   - Return reward data + txHash

5. **Display Result**
   - Show reward car dengan rarity
   - Display token ID & tx hash
   - Update user coins

6. **Claim**
   - Refresh gacha data (update coins)
   - Reset untuk spin lagi

---

## 🛠️ Files Modified

### **Frontend**
- `frontend/src/lib/gachaApi.js` ✨ (NEW)
  - API client functions: `getGachaBoxes()`, `openGachaBox()`
  - Rarity config mapping

- `frontend/src/app/gacha/page.jsx`
  - Integrated backend API calls
  - Added box selection UI
  - Added user coins display
  - Updated reward result with NFT info
  - Error handling dan loading states

### **Backend** (Already exists)
- `backends/src/routes/gacha.ts`
  - POST `/gacha/open` - Open gacha & mint NFT
  - GET `/gacha/boxes` - Get available boxes

- `backends/src/config/gacha.ts`
  - Gacha box configurations
  - Probability distributions
  - Reward definitions

---

## 🚀 Testing

### **Test Flow:**
1. Login dengan Privy (Google/Email)
2. Pastikan ada coins di database (atau mint via backend)
3. Pilih box type (Standard/Premium/Legendary)
4. Slide to open
5. Wait untuk blockchain transaction
6. Lihat result dengan token ID & tx hash
7. Klik "Claim" untuk spin lagi

### **Error Scenarios:**
- ❌ Insufficient coins → Error message "Insufficient coins!"
- ❌ Blockchain mint failed → Error message "Failed to mint Car NFT"
- ❌ Network error → Error message "Failed to open gacha box"

---

## 🔒 Authentication

Semua API calls menggunakan **Privy authentication token**:
```javascript
const authToken = await getAccessToken();
await openGachaBox(boxType, authToken);
```

Backend middleware `auth` akan:
1. Verify Privy token
2. Extract `userId` dan `walletAddress`
3. Attach to request untuk use di endpoint

---

## 📊 Data Flow

```
Frontend (Gacha Page)
    ↓
  getAccessToken() [Privy]
    ↓
  POST /gacha/open { boxType }
    ↓
Backend API
    ↓
  Check user coins
    ↓
  Select random reward
    ↓
  mintCar() [Blockchain]
    ↓
  Save to database + Deduct coins
    ↓
  Return { reward, txHash, coins }
    ↓
Frontend displays result
```

---

## 💡 Next Steps

### **Optional Enhancements:**
1. **Car Images Mapping**
   - Map `modelName` to actual car images
   - Update `image` field in reward result

2. **Animation Improvements**
   - Add spinning reel animation
   - Sound effects on spin

3. **History**
   - Show gacha history (past spins)
   - Total cars owned

4. **Share Result**
   - Share button to social media
   - Screenshot feature

---

## 🐛 Troubleshooting

### **"Failed to fetch gacha boxes"**
- ✅ Check backend server is running
- ✅ Check API_BASE_URL in `frontend/src/lib/api.js`
- ✅ Check Privy auth token is valid

### **"Insufficient coins"**
- ✅ Check user coins in database: `SELECT coins FROM User WHERE id = ?`
- ✅ Mint coins via backend: `UPDATE User SET coins = coins + 100`

### **"Failed to mint NFT"**
- ✅ Check smart contract is deployed
- ✅ Check wallet has ETH for gas
- ✅ Check RPC provider is working

---

## 📝 Example Usage

```javascript
// Fetch gacha boxes
const { userCoins, boxes } = await getGachaBoxes(authToken);

// Open standard box
const result = await openGachaBox("standard", authToken);

console.log(result);
// {
//   success: true,
//   reward: {
//     tokenId: 1234567890,
//     modelName: "BMW M3",
//     series: "Sport",
//     rarity: "rare",
//     txHash: "0x..."
//   },
//   coins: {
//     spent: 50,
//     remaining: 100
//   }
// }
```

---

## ✅ Checklist

- [x] API client created (`gachaApi.js`)
- [x] Backend integration in gacha page
- [x] Box selection UI
- [x] User coins display
- [x] Error handling
- [x] Loading states
- [x] Reward result with NFT info
- [x] Transaction hash link to BaseScan
- [x] Claim button to reset

---

**Integration Complete!** 🎉
