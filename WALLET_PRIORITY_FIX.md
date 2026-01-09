# 🔧 Wallet Priority Fix

## Problem yang Diperbaiki:
Saat logout dan login kembali dengan **Gmail/Email**, app malah pakai **MetaMask wallet address** bukan embedded wallet dari Privy.

---

## ✅ Solusi yang Diterapkan:

### 1. **Update Wallet Detection Logic** ([useWallet.js](src/hooks/useWallet.js#L19-L51))

**Sebelum:**
```javascript
// ❌ Pakai wallet pertama yang ketemu (bisa MetaMask)
if (embedded) {
  use(embedded);
} else if (wallets.length > 0) {
  use(wallets[0]); // ❌ Bisa MetaMask!
}
```

**Sekarang:**
```javascript
// ✅ PRIORITAS 1: Embedded Wallet Privy (email/social login)
const embeddedWallet = wallets.find(w => w.walletClientType === "privy");

if (embeddedWallet) {
  use(embeddedWallet); // ✅ Prioritas untuk embedded
  return;
}

// ✅ PRIORITAS 2: External Wallet (MetaMask, dll)
// Hanya pakai kalau TIDAK ada embedded wallet
const externalWallets = wallets.filter(w => w.walletClientType !== "privy");

if (externalWallets.length > 0) {
  use(externalWallets[0]); // Pakai MetaMask kalau user connect dengan wallet
  return;
}
```

### 2. **Update Privy Config** ([providers.jsx](src/app/providers.jsx#L18-L27))

Tambahkan setting untuk embedded wallet:
```javascript
embeddedWallets: {
  createOnLogin: "all-users",
  requireUserPasswordOnCreate: false,
  noPromptOnSignature: true, // ✅ Smooth UX - no popup spam
}
```

---

## 🎯 Behavior Sekarang:

### **Scenario 1: Login dengan Gmail/Email**
1. User login dengan Gmail
2. Privy auto-create **embedded wallet**
3. App SELALU pakai embedded wallet ✅
4. MetaMask di-ignore (meski extension aktif)

### **Scenario 2: Login dengan MetaMask**
1. User pilih "Connect Wallet" di login
2. Connect MetaMask
3. App pakai **MetaMask wallet** ✅
4. Tidak create embedded wallet

### **Scenario 3: User punya keduanya**
1. User login dengan Gmail (punya embedded)
2. Lalu connect MetaMask juga
3. App tetap pakai **embedded wallet** ✅ (prioritas lebih tinggi)

---

## 🔍 How to Verify:

### **Test Steps:**
1. **Logout dari app**
2. **Login dengan Gmail** (bukan MetaMask)
3. **Buka Profile page**
4. **Check wallet address**:
   - Seharusnya BERBEDA dari MetaMask address
   - Ini adalah Privy embedded wallet address

### **Expected Result:**
```
Wallet Address:
0xABC123... ← Embedded wallet (Privy)

BUKAN:
0x92F977... ← MetaMask wallet
```

---

## 💡 Technical Details:

### **Wallet Detection Priority:**
1. 🥇 **Privy Embedded Wallet** (`walletClientType: "privy"`)
2. 🥈 **External Wallets** (MetaMask, Coinbase, etc)

### **Login Method vs Wallet Type:**
| Login Method | Wallet Type | Address Source |
|--------------|-------------|----------------|
| Gmail | Embedded (Privy) | Auto-created by Privy |
| Email | Embedded (Privy) | Auto-created by Privy |
| Twitter | Embedded (Privy) | Auto-created by Privy |
| Discord | Embedded (Privy) | Auto-created by Privy |
| "Connect Wallet" | External (MetaMask) | User's MetaMask |

---

## 🐛 Known Issues Fixed:

- ✅ Login Gmail pakai MetaMask address
- ✅ Logout/login switch wallet address
- ✅ Embedded wallet tidak terdetect
- ✅ Balance tidak update karena wrong wallet

---

## 📝 Notes:

- Embedded wallet = Managed oleh Privy, tidak perlu MetaMask extension
- External wallet = User-controlled (MetaMask, Coinbase Wallet, dll)
- Satu user bisa punya KEDUA wallet, tapi app prioritaskan embedded

---

Sekarang login dengan Gmail harusnya pakai wallet address yang benar! 🎉
