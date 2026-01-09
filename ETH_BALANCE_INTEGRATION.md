# 💰 ETH Balance Integration

## Overview
Coin display sekarang menampilkan **real ETH balance** dari wallet di Base Sepolia atau Base Mainnet.

---

## ✅ Yang Sudah Diimplementasi

### 1. **getBalance() Function** ([hooks/useWallet.js](src/hooks/useWallet.js#L72-L98))

Fungsi baru untuk fetch ETH balance dari wallet:

```javascript
const { getBalance } = useWallet();

const balance = await getBalance(); // Returns: 0.1234 (in ETH)
```

**Cara Kerja:**
- Menggunakan `eth_getBalance` RPC call
- Convert dari Wei (hex) ke ETH (decimal)
- Return balance sebagai number

### 2. **Dashboard Balance Display** ([dashboard/page.jsx](src/app/dashboard/page.jsx#L107-L120))

**Features:**
- ✅ Auto-fetch balance saat wallet connected
- ✅ Display dengan 4 decimal places (0.0000 ETH)
- ✅ Click to refresh balance
- ✅ Loading state saat fetch
- ✅ Symbol Ξ (Ethereum logo)

**UI:**
```
┌─────────────────┐
│ Ξ 0.1234 ETH   │  ← Click untuk refresh
└─────────────────┘
```

### 3. **Profile Balance Display** ([profile/page.jsx](src/app/profile/page.jsx#L148-L161))

Same features dengan dashboard, ditampilkan di profile page.

---

## 🎯 Cara Menggunakan

### **Auto Fetch (Sudah Otomatis)**

Balance akan otomatis di-fetch saat:
1. User login
2. Wallet connected
3. Page di-load

### **Manual Refresh**

User bisa klik pada balance badge untuk refresh:
- Di **Dashboard**: Klik badge di kiri atas
- Di **Profile**: Klik badge di bawah user info

---

## 🔧 Technical Details

### **RPC Method yang Digunakan**
```javascript
eth_getBalance(address, "latest")
```

### **Conversion Formula**
```javascript
// Balance dalam Wei (hex) → ETH (decimal)
const balanceWei = BigInt(balanceHex);
const balanceETH = Number(balanceWei) / 1e18;
```

### **Supported Chains**
- ✅ Base Mainnet
- ✅ Base Sepolia (Testnet)

---

## 💡 Tips

### **Get Test ETH di Base Sepolia**
1. Buka [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
2. Masukkan wallet address Anda
3. Claim free testnet ETH
4. Tunggu beberapa detik
5. Refresh balance di app (klik balance badge)

### **Cek Wallet di Block Explorer**
- Base Sepolia: `https://sepolia.basescan.org/address/YOUR_ADDRESS`
- Base Mainnet: `https://basescan.org/address/YOUR_ADDRESS`

---

## 🐛 Troubleshooting

### **Balance menampilkan 0.0000**

**Penyebab:**
- Wallet baru dibuat, belum ada ETH
- Network issue

**Solusi:**
1. Claim test ETH dari faucet
2. Klik balance badge untuk refresh
3. Tunggu beberapa detik untuk transaction confirm

### **Balance tidak update setelah transfer**

**Solusi:**
- Klik balance badge untuk manual refresh
- Blockchain butuh waktu untuk confirmasi (tunggu ~2-5 detik)

---

## 📊 Display Format

```javascript
// Example displays:
0.0000 ETH  // No balance
0.0012 ETH  // Small amount
1.2345 ETH  // Regular amount
12.3456 ETH // Large amount
```

Format: `{balance.toFixed(4)} ETH`
- Always 4 decimal places
- Dalam satuan ETH (bukan Wei atau Gwei)

---

## 🚀 Next Features (Optional)

Fitur yang bisa ditambahkan nanti:
- [ ] Display USD value dari ETH
- [ ] Transaction history
- [ ] Send/Receive ETH functionality
- [ ] Multi-token support (ERC20)
- [ ] Auto-refresh balance setiap X detik

---

## 📚 Resources

- [Ethereum JSON-RPC API](https://ethereum.org/en/developers/docs/apis/json-rpc/)
- [Base Blockchain Docs](https://docs.base.org/)
- [Privy Embedded Wallets](https://docs.privy.io/guide/react/wallets/embedded/)

---

Semua sudah berfungsi! Balance akan otomatis muncul saat login. 🎉
