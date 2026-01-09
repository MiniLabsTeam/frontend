# 🔧 Privy Dashboard Setup - PENTING!

## ⚠️ CRITICAL: Enable Embedded Wallets di Privy Dashboard

Kalau stuck di "Creating wallet...", kemungkinan besar **Embedded Wallets belum di-enable** di Privy Dashboard.

---

## 📋 Setup Steps:

### **Step 1: Login ke Privy Dashboard**
```
https://dashboard.privy.io
```

### **Step 2: Pilih App Anda**
- Pilih app dengan ID: `cmjxyscmx03pulf0cadbpdmvq`
- Atau buat app baru kalau belum ada

### **Step 3: Enable Embedded Wallets**

1. **Klik "Wallets" di sidebar kiri**
2. **Cari section "Embedded Wallets"**
3. **Toggle ON untuk "Enable embedded wallets"**
4. **Pilih "Create for all users" atau "Create for users without wallets"**
5. **Klik "Save"**

### **Step 4: Configure Embedded Wallet Settings**

Di section Embedded Wallets:
- ✅ **Create on login**: ON
- ✅ **Require password**: OFF (untuk smooth UX)
- ✅ **Chain**: Base Sepolia (84532)

### **Step 5: Configure Login Methods**

Di section "Login Methods":
- ✅ Email
- ✅ Google
- ✅ Twitter (optional)
- ✅ Discord (optional)
- ✅ Wallet (MetaMask, etc)

### **Step 6: Save Changes**

Klik **"Save"** di kanan atas.

---

## 🔑 Alternative: Update App ID

Kalau app ID `cmjxyscmx03pulf0cadbpdmvq` bukan punya Anda atau belum di-configure:

### **Create New Privy App:**

1. **Go to:** https://dashboard.privy.io
2. **Click "Create App"**
3. **Name:** Base Wheels (atau nama lain)
4. **Select:** Web3 Wallet
5. **Click "Create"**

### **Copy App ID:**

Setelah app dibuat:
1. Go to **Settings**
2. Copy **App ID** (format: `cm...`)
3. Update `.env.local`:

```env
NEXT_PUBLIC_PRIVY_APP_ID=YOUR_NEW_APP_ID_HERE
```

### **Enable Embedded Wallets:**

Follow Step 3-6 di atas.

---

## 🧪 Verify Setup:

### **Test di Privy Dashboard:**

1. Go to **Users** tab
2. Click **"Test Login"**
3. Login dengan Google
4. Check apakah wallet address muncul di user profile

Kalau wallet address muncul = setup benar ✅

---

## 📝 Checklist:

Sebelum test lagi, pastikan:

- [ ] Privy App exists di dashboard
- [ ] Embedded Wallets di-enable
- [ ] "Create on login" di-set ke "all users"
- [ ] Login methods (Email, Google) di-enable
- [ ] App ID di `.env.local` benar
- [ ] Restart dev server (`npm run dev`)

---

Setelah setup, logout dan login lagi untuk test!
