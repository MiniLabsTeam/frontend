# Testing Guide - OneChain Racing 2D Client

Quick guide untuk testing game client dengan backend.

## 🚀 Quick Test (5 Minutes)

### 1. Setup Database (One-time)

```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create test users
INSERT INTO "User" (address, username, nonce, "createdAt", "updatedAt")
VALUES
  ('0x1111111111111111111111111111111111111111', 'Player1', 'nonce1', NOW(), NOW()),
  ('0x2222222222222222222222222222222222222222', 'Player2', 'nonce2', NOW(), NOW());

-- Create test cars
INSERT INTO "Car" (
  uid, owner, name, brand, rarity, "slotLimit",
  "baseSpeed", "baseAcceleration", "baseHandling", "baseDrift",
  "isClaimed", "isListed", "createdAt", "updatedAt"
)
VALUES
  ('0xCAR1111111111111111111111111111111111111', '0x1111111111111111111111111111111111111111',
   'Green Racer', 0, 2, 4, 100, 80, 70, 60, false, false, NOW(), NOW()),
  ('0xCAR2222222222222222222222222222222222222', '0x2222222222222222222222222222222222222222',
   'Blue Speedster', 0, 2, 4, 95, 85, 75, 65, false, false, NOW(), NOW());
```

### 2. Generate JWT Tokens

**Terminal 1:**
```bash
cd E:\MiniLabs\backend
node -e "const jwt = require('jsonwebtoken'); console.log('PLAYER 1:', jwt.sign({address:'0x1111111111111111111111111111111111111111'}, process.env.JWT_SECRET || 'your-secret-key-minimum-32-characters', {expiresIn:'7d'}));"
```

**Terminal 2:**
```bash
cd E:\MiniLabs\backend
node -e "const jwt = require('jsonwebtoken'); console.log('PLAYER 2:', jwt.sign({address:'0x2222222222222222222222222222222222222222'}, process.env.JWT_SECRET || 'your-secret-key-minimum-32-characters', {expiresIn:'7d'}));"
```

Simpan kedua token!

### 3. Start Services

**Terminal 1 - Backend:**
```bash
cd E:\MiniLabs\backend
npm run dev
```

**Terminal 2 - Game Client:**
```bash
cd E:\MiniLabs\games
npx http-server -p 8080
```

### 4. Test Multiplayer

**Browser Window 1 (Player 1):**
1. Open `http://localhost:8080`
2. Isi form top-right:
   - Player Address: `0x1111111111111111111111111111111111111111`
   - JWT Token: `<token dari step 2>`
   - Car UID: `0xCAR1111111111111111111111111111111111111`
3. Click **CREATE ROOM**
4. **COPY ROOM UID** yang muncul!

**Browser Window 2 (Player 2):**
1. Open `http://localhost:8080` (new window/tab)
2. Isi form top-right:
   - Player Address: `0x2222222222222222222222222222222222222222`
   - JWT Token: `<token player 2>`
   - Car UID: `0xCAR2222222222222222222222222222222222222`
3. **PASTE ROOM UID** di input field
4. Click **JOIN ROOM**

**Both Windows:**
1. Click **MARK READY**
2. Wait 5 seconds (countdown)
3. **GAME STARTS!** 🎮

### 5. During Race

- **See both cars moving forward automatically**
- **Press ⬅️ ➡️** to change lanes
- **Avoid red obstacles** (instant death)
- **Collect green circles** (speed boost)
- **Watch for power-ups effects**

### 6. After Race

- View rankings
- See winner
- Check blockchain signature
- Click "BACK TO MENU"

## 🔍 What to Check

### ✅ Lobby Scene
- [ ] Both players visible in list
- [ ] Ready status updates
- [ ] Status changes: WAITING → COUNTDOWN → RACING

### ✅ Game Scene
- [ ] Both cars visible and different colors
- [ ] Cars move forward (Z position increases)
- [ ] Obstacles spawn every ~2 seconds
- [ ] Power-ups spawn occasionally
- [ ] Distance counter increases
- [ ] Rank updates
- [ ] Speed shows
- [ ] Lane switching works

### ✅ Result Scene
- [ ] Winner shown correctly
- [ ] Rankings display
- [ ] Distance and time shown
- [ ] Signature present

## 🐛 Common Issues

### "Authentication required"
- JWT token not set or expired
- Generate new token

### "Car not found"
- Car UID wrong or doesn't exist
- Check database for car UIDs

### "Room not found"
- Room UID wrong
- Room expired
- Create new room

### Game state not updating
- Backend not running
- Redis not running
- Check browser console (F12)

### Obstacles not visible
- Game state polling failing
- Check Network tab in browser

## 📊 Expected Behavior

**Time: 0s**
- Both players at Z=0
- No obstacles
- Status: RACING

**Time: 2s**
- First obstacle spawns
- Players at Z≈30

**Time: 5s**
- 2-3 obstacles on track
- Maybe 1 power-up
- Players at Z≈75

**Time: 10s**
- 4-5 obstacles
- 1-2 power-ups
- Players at Z≈150

**Game End:**
- Max 5 minutes OR
- All but 1 player eliminated OR
- All players eliminated

## 🎯 Success Criteria

1. ✅ Can create room
2. ✅ Can join room
3. ✅ Game starts after both ready
4. ✅ Both players visible
5. ✅ Obstacles spawn
6. ✅ Power-ups spawn
7. ✅ Lane switching works
8. ✅ Collision detection works
9. ✅ Game ends properly
10. ✅ Results displayed

## 📝 Test Scenarios

### Scenario 1: Normal Race
1. 2 players join
2. Both ready
3. Race for 30 seconds
4. Player 1 wins
5. Check results

### Scenario 2: Obstacle Collision
1. Start race
2. Let car hit red BARRIER
3. Player should be eliminated
4. Other player wins

### Scenario 3: Power-up Collection
1. Start race
2. Drive over green circle (BOOST)
3. Speed should increase
4. Effect lasts 5 seconds

### Scenario 4: Late Join
1. Player 1 creates and readies
2. Wait 10 seconds
3. Player 2 joins and readies
4. Game should start

## 🔧 Debug Commands

### Check active games
```bash
curl http://localhost:3000/api/game/active \
  -H "Authorization: Bearer <TOKEN>"
```

### Check room status
```bash
curl http://localhost:3000/api/game/room/<ROOM_UID>
```

### Check game state
```bash
curl http://localhost:3000/api/game/<ROOM_UID>/state \
  -H "Authorization: Bearer <TOKEN>"
```

### Force stop game
```bash
curl -X POST http://localhost:3000/api/game/<ROOM_UID>/stop \
  -H "Authorization: Bearer <TOKEN>"
```

## 📹 Recording Test

For bug reports, record:
1. Browser console (F12)
2. Network tab (F12 → Network)
3. Backend console output
4. Screen recording of gameplay

## ✅ Final Checklist

Before reporting "it works":

- [ ] Backend logs show game loop running
- [ ] Redis has game state keys
- [ ] Database has race record after game
- [ ] Both players see same game state
- [ ] Collisions detected correctly
- [ ] Power-ups apply effects
- [ ] Winner determined correctly
- [ ] Signature generated
- [ ] Can replay multiple times

## 🎉 Success!

If all checks pass:
- Game client works! ✅
- Backend integration works! ✅
- Ready for WebSocket upgrade! ✅

---

**Next Steps:**
1. Test with 4 players
2. Test edge cases (disconnect, timeout)
3. Implement WebSocket for real-time
4. Add sound effects
5. Improve graphics
