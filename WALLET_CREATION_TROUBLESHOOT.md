# 🔧 Troubleshooting: "Creating wallet..." atau "No Wallet"

## Problem:
Setelah login dengan Google/Gmail/Email, muncul badge **"Creating wallet..."** atau **"No Wallet"** yang tidak hilang.

---

## ✅ Solusi Cepat:

### **1. Tunggu 5-10 Detik**
Privy butuh waktu untuk membuat embedded wallet setelah login pertama kali.
- ⏳ Normal: 3-10 detik
- 🟡 Badge kuning "Creating wallet..." = sedang proses
- 🟢 Badge hijau dengan address = sudah siap

### **2. Refresh Halaman**
```
Tekan F5 atau Ctrl+R
```
Kadang wallet sudah dibuat tapi UI belum update.

### **3. Logout dan Login Lagi**
```
Profile → Log Out → Login lagi dengan Google
```

### **4. Clear Browser Cache**
```
Ctrl+Shift+Delete → Clear cache → Refresh
```

---

## 🔍 Debug Steps:

### **Step 1: Buka Browser Console**
Tekan **F12** atau **Ctrl+Shift+I**, lalu buka tab **Console**.

### **Step 2: Login dengan Google**
Setelah login, lihat console logs:

**✅ SUCCESS - Wallet Created:**
```javascript
🔍 Checking wallets... {walletsCount: 1, wallets: [{type: "privy", address: "0x1234..."}]}
✅ Found Privy embedded wallet: 0x1234567890abcdef...
```

**❌ PROBLEM - No Wallet:**
```javascript
🔍 Checking wallets... {walletsCount: 0, wallets: []}
⏳ No wallet found yet. Waiting for Privy to create embedded wallet...
💡 This usually takes 3-10 seconds after login.
```

### **Step 3: Screenshot Console Logs**
Kalau wallet tidak muncul setelah 30 detik:
1. Screenshot console logs
2. Screenshot UI (dashboard dengan badge)
3. Share untuk debugging

---

## 🛠️ Possible Issues & Fixes:

### **Issue 1: Privy App ID Salah**
**Symptom:** Wallet tidak pernah dibuat, error di console
**Fix:**
```bash
# Check .env.local
NEXT_PUBLIC_PRIVY_APP_ID=cmjxyscmx03pulf0cadbpdmvq
```
Pastikan App ID benar dari Privy dashboard.

### **Issue 2: Browser Extension Conflict**
**Symptom:** MetaMask atau wallet extension lain interfere
**Fix:**
1. Disable MetaMask extension sementara
2. Logout dan login lagi
3. Enable MetaMask kembali setelah embedded wallet dibuat

### **Issue 3: Network Issue**
**Symptom:** Console error "Failed to fetch" atau timeout
**Fix:**
- Check internet connection
- Restart browser
- Try different browser (Chrome/Firefox)

### **Issue 4: Privy Config Issue**
**Symptom:** Console error tentang config
**Fix:**
Check [providers.jsx](src/app/providers.jsx) - pastikan config benar:
```javascript
embeddedWallets: {
  createOnLogin: "all-users", // ← Must be "all-users"
  requireUserPasswordOnCreate: false,
}
```

---

## 📋 Status Badge Meanings:

| Badge Color | Text | Meaning |
|-------------|------|---------|
| 🟢 Green | `0x1234...5678` | ✅ Wallet connected & ready |
| 🟡 Yellow | `Creating wallet...` | ⏳ Wallet sedang dibuat, tunggu 3-10 detik |
| 🔴 Red | `Not logged in` | ❌ Belum login |

---

## 🎯 Expected Flow:

```
1. Login dengan Google
   ↓
2. Badge shows: 🟡 "Creating wallet..." (3-10 seconds)
   ↓
3. Privy creates embedded wallet
   ↓
4. Badge updates: 🟢 "0xABC...123"
   ↓
5. Balance badge shows: Ξ 0.0000 ETH
   ↓
6. Ready to use!
```

---

## 🚨 When to Report a Bug:

Jika setelah:
- ✅ Tunggu 30+ detik
- ✅ Refresh halaman
- ✅ Logout & login lagi
- ✅ Clear cache

Wallet masih belum muncul, tolong screenshot:
1. Browser console logs (F12)
2. Dashboard UI dengan badge
3. Network tab di DevTools (F12 → Network)

Dan share untuk debugging lebih lanjut.

---

## 💡 Pro Tips:

1. **First Time Login:**
   - Wallet creation ~5-10 detik
   - Tunggu sampai badge hijau muncul

2. **Next Logins:**
   - Wallet sudah exist
   - Load instantly (~1-2 detik)

3. **Multiple Devices:**
   - Same Google account = DIFFERENT wallet per device
   - Privy embedded wallet = device-specific

4. **Backup Wallet:**
   - Copy wallet address dari Profile
   - Save di tempat aman
   - Kalau ganti device, wallet berbeda

---

Kalau masih ada masalah, cek console logs dan share screenshot! 🔍
