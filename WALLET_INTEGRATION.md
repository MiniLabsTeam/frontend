# 🔐 Wallet Integration Guide - Privy + Base Blockchain

## Overview
Frontend sudah terintegrasi dengan **Privy** untuk autentikasi dan **embedded wallet** yang otomatis dibuat saat user login.

---

## ✅ Yang Sudah Dikonfigurasi

### 1. **Privy Provider** ([providers.jsx](src/app/providers.jsx))
- Auto-create wallet untuk semua user yang login
- Support Base Sepolia (testnet) dan Base Mainnet
- Login methods: Email, Wallet, Google, Twitter, Discord

### 2. **Custom Hook: useWallet** ([hooks/useWallet.js](src/hooks/useWallet.js))
Hook untuk mengelola wallet connection dengan mudah.

**Features:**
- ✅ Deteksi wallet connection status
- ✅ Ambil wallet address
- ✅ Get auth token untuk backend API
- ✅ Switch chain/network
- ✅ Get wallet client untuk signing transactions

### 3. **API Client** ([lib/api.js](src/lib/api.js))
Utility untuk komunikasi dengan backend yang sudah include Privy auth token.

---

## 📖 Cara Menggunakan

### **1. Setup Environment Variables**

Buat file `.env.local` di folder `frontend/`:

```bash
# Copy dari example
cp .env.local.example .env.local
```

Isi dengan config Privy Anda:
```env
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### **2. Menggunakan useWallet Hook**

```jsx
"use client";

import { useWallet } from "@/hooks/useWallet";

export default function MyComponent() {
  const {
    isConnected,
    walletAddress,
    getAuthToken,
    ready,
    authenticated
  } = useWallet();

  // Cek status wallet
  if (!ready) return <div>Loading...</div>;
  if (!authenticated) return <div>Please login</div>;
  if (!isConnected) return <div>No wallet connected</div>;

  return (
    <div>
      <h1>Wallet Connected!</h1>
      <p>Address: {walletAddress}</p>
    </div>
  );
}
```

### **3. Memanggil Backend API**

```jsx
"use client";

import { useWallet } from "@/hooks/useWallet";
import { apiPost, apiGet } from "@/lib/api";
import { useState } from "react";

export default function GachaPage() {
  const { getAuthToken } = useWallet();
  const [loading, setLoading] = useState(false);

  const handleSpin = async () => {
    try {
      setLoading(true);

      // Get Privy auth token
      const authToken = await getAuthToken();

      // Call backend API
      const result = await apiPost("/api/gacha/spin", {}, authToken);

      console.log("Gacha result:", result);
      alert(`You got: ${result.fragmentName}`);

    } catch (error) {
      console.error("Error:", error);
      alert("Failed to spin: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleSpin} disabled={loading}>
      {loading ? "Spinning..." : "Spin Gacha!"}
    </button>
  );
}
```

### **4. Contoh Lengkap: Fetch User Data**

```jsx
import { useWallet } from "@/hooks/useWallet";
import { apiGet } from "@/lib/api";
import { useEffect, useState } from "react";

export default function Profile() {
  const { getAuthToken, isConnected, walletAddress } = useWallet();
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    if (isConnected) {
      fetchUserData();
    }
  }, [isConnected]);

  const fetchUserData = async () => {
    try {
      const token = await getAuthToken();
      const data = await apiGet("/api/user/profile", token);
      setUserData(data);
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  };

  if (!isConnected) {
    return <div>Please connect wallet</div>;
  }

  return (
    <div>
      <h1>Profile</h1>
      <p>Wallet: {walletAddress}</p>
      {userData && (
        <div>
          <p>Coins: {userData.coins}</p>
          <p>Level: {userData.level}</p>
        </div>
      )}
    </div>
  );
}
```

---

## 🔧 Troubleshooting

### **Problem: "No wallet connected" setelah login**

**Solusi:**
1. Pastikan `embeddedWallets.createOnLogin` di [providers.jsx](src/app/providers.jsx) adalah `"all-users"`
2. Restart development server
3. Clear browser cache dan login ulang

### **Problem: Backend returns "User has no linked wallet"**

**Solusi:**
1. Cek di Privy Dashboard apakah embedded wallet sudah enable
2. Pastikan user sudah benar-benar login (authenticated = true)
3. Tunggu beberapa detik setelah login agar wallet terbuat

### **Problem: API calls return 401 Unauthorized**

**Solusi:**
1. Pastikan `getAuthToken()` dipanggil sebelum API request
2. Cek apakah token di-pass ke parameter kedua/ketiga di `apiPost/apiGet`
3. Verify PRIVY_APP_SECRET di backend sudah benar

---

## 🎯 Backend Integration Points

Backend sudah siap menerima request dengan middleware auth:

```typescript
// Backend: middleware/auth.ts
export async function auth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const claims = await privy.verifyAuthToken(token);
  const user = await privy.getUser(claims.userId);

  req.userId = claims.userId;
  req.walletAddress = user.wallet?.address; // ✅ Wallet address dari Privy

  next();
}
```

---

## 📚 Resources

- [Privy Docs](https://docs.privy.io/)
- [Base Blockchain Docs](https://docs.base.org/)
- [Viem Docs](https://viem.sh/)

---

## ✨ Summary

**Yang sudah berfungsi:**
- ✅ Auto-create embedded wallet saat login
- ✅ Wallet address detection
- ✅ Auth token generation untuk backend
- ✅ API client dengan auto auth headers
- ✅ Wallet status indicator di UI

**Next steps untuk Anda:**
1. Copy file `.env.local.example` menjadi `.env.local`
2. Isi Privy App ID dan Backend URL
3. Jalankan `npm run dev`
4. Login dan cek wallet address muncul di dashboard
5. Test API calls ke backend

Semoga membantu! 🚀
