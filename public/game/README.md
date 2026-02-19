# OneChain Racing - 2D Web Game Client

Simple 2D web-based game client for OneChain Racing Endless Race mode.

## 🎮 Features

- **Web-based**: Runs in any modern browser
- **Phaser 3**: Lightweight 2D game framework
- **Minimalist Graphics**: Simple geometric shapes, flat colors
- **Real-time Multiplayer**: Connects to backend API via polling
- **Server-authoritative**: Fair gameplay, no client-side cheating

## 📁 File Structure

```
games/
├── index.html              # Main HTML entry point
├── PLAN.md                 # Implementation plan
├── README.md               # This file
├── css/
│   └── style.css           # Minimal styling
├── js/
│   ├── config.js           # Game configuration & constants
│   ├── api.js              # Backend API client
│   ├── main.js             # Phaser initialization
│   └── scenes/
│       ├── MenuScene.js    # Main menu (create/join room)
│       ├── LobbyScene.js   # Waiting room (ready up)
│       ├── GameScene.js    # Main racing game
│       └── ResultScene.js  # Race results display
└── assets/
    └── (empty - using shapes only)
```

## 🚀 Quick Start

### Prerequisites

1. **Backend must be running:**
   ```bash
   cd E:\MiniLabs\backend
   npm install
   npm run dev
   # Backend should be running on http://localhost:3000
   ```

2. **Database setup:**
   - PostgreSQL running
   - Redis running
   - Database migrated (`npx prisma migrate dev`)

### Running the Game

1. **Serve the game files:**
   ```bash
   cd E:\MiniLabs\games
   npx http-server -p 8080
   ```

2. **Open in browser:**
   ```
   http://localhost:8080
   ```

3. **Enter credentials:**
   - **Player Address**: `0x1111111111111111111111111111111111111111` (for testing)
   - **JWT Token**: Get from backend authentication
   - **Car UID**: `0xCAR1111111111111111111111111111111111111` (from database)

## 🎯 How to Play

### Step 1: Get JWT Token

You need a JWT token to authenticate. For testing, you can:

**Option A: Use Auth API**
```bash
POST http://localhost:3000/api/auth/challenge
{
  "address": "0x1111111111111111111111111111111111111111"
}

POST http://localhost:3000/api/auth/verify
{
  "address": "0x1111111111111111111111111111111111111111",
  "signature": "..."
}
```

**Option B: Generate Test Token**
```javascript
// Run in backend directory
node
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { address: '0x1111111111111111111111111111111111111111' },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);
console.log(token);
```

### Step 2: Create Test Data

Create dummy users and cars in database:

```sql
-- Users
INSERT INTO "User" (address, username, nonce, "createdAt", "updatedAt")
VALUES
  ('0x1111111111111111111111111111111111111111', 'Player1', 'test-nonce-1', NOW(), NOW()),
  ('0x2222222222222222222222222222222222222222', 'Player2', 'test-nonce-2', NOW(), NOW());

-- Cars
INSERT INTO "Car" (
  uid, owner, name, brand, rarity, "slotLimit",
  "baseSpeed", "baseAcceleration", "baseHandling", "baseDrift",
  "isClaimed", "isListed", "createdAt", "updatedAt"
)
VALUES
  (
    '0xCAR1111111111111111111111111111111111111',
    '0x1111111111111111111111111111111111111111',
    'Test Car 1', 0, 2, 4,
    100, 80, 70, 60,
    false, false, NOW(), NOW()
  ),
  (
    '0xCAR2222222222222222222222222222222222222',
    '0x2222222222222222222222222222222222222222',
    'Test Car 2', 0, 2, 4,
    90, 85, 75, 65,
    false, false, NOW(), NOW()
  );
```

### Step 3: Play the Game

**Single Window Test:**
1. Enter credentials in top-right panel
2. Click "CREATE ROOM"
3. Wait for another player...

**Two Players Test:**
1. **Window 1:**
   - Enter Player 1 credentials
   - Click "CREATE ROOM"
   - Copy the Room UID shown

2. **Window 2:**
   - Enter Player 2 credentials
   - Paste Room UID
   - Click "JOIN ROOM"

3. **Both Windows:**
   - Click "MARK READY"
   - Game starts after 5-second countdown

4. **During Race:**
   - Use ⬅️ ➡️ arrow keys to change lanes
   - Avoid obstacles (red/orange/yellow rectangles)
   - Collect power-ups (colored circles)
   - Game auto-runs forward

5. **After Race:**
   - View rankings
   - See blockchain signature
   - Click "BACK TO MENU"

## 🎨 Visual Design

### Color Scheme
- **Background**: Dark gray (#2d3436)
- **Track**: Medium gray (#636e72)
- **Lane Lines**: White (#ffffff)

### Players
- Player 1: Green (#00b894)
- Player 2: Blue (#0984e3)
- Player 3: Yellow (#fdcb6e)
- Player 4: Orange (#e17055)

### Obstacles
- BARRIER (red): Instant elimination
- HAZARD (orange): 50% slow
- SLOW_ZONE (yellow): 30% slow

### Power-ups
- BOOST (green): +50% speed for 5 seconds
- SHIELD (light blue): Block 1 collision
- SLOW_OTHERS (purple): Slow all opponents

## 🎮 Controls

- **Arrow Left** ⬅️: Change lane left
- **Arrow Right** ➡️: Change lane right

## 🔧 Configuration

Edit `js/config.js` to change:

```javascript
CONFIG.API_BASE_URL         // Backend URL
CONFIG.CANVAS_WIDTH         // Game canvas width
CONFIG.CANVAS_HEIGHT        // Game canvas height
CONFIG.LOBBY_POLL_INTERVAL  // Lobby polling (1000ms)
CONFIG.GAME_POLL_INTERVAL   // Game polling (100ms)
CONFIG.SCALE                // Visual scale (20px per unit)
CONFIG.COLORS               // Color palette
```

## 🐛 Troubleshooting

### Game won't load
- Check backend is running on localhost:3000
- Check browser console for errors
- Verify Phaser CDN is accessible

### Can't create room
- Verify JWT token is valid and set
- Check backend console for errors
- Verify database is running

### Can't join room
- Verify Room UID is correct
- Verify Car UID exists in database
- Check player credentials

### Game state not updating
- Check backend game loop is running
- Verify Redis is running
- Check network tab for API calls

### Input not working
- Check JWT token is set
- Verify game status is "RACING"
- Check backend receives input requests

## 📊 Performance

- **Target FPS**: 60 (Phaser rendering)
- **Polling Rate**: 100ms (10 state updates/second)
- **Network**: ~10 requests/second during race
- **Memory**: <50MB (typical)

## 🔍 Debug Mode

Open browser console (F12) to see:
- API requests and responses
- Game state updates
- Input events
- Errors and warnings

## 📝 API Endpoints Used

```
POST   /api/game/room/create       - Create room
POST   /api/game/room/:id/join     - Join room
POST   /api/game/room/:id/ready    - Mark ready
GET    /api/game/room/:id          - Get room info (polling)
GET    /api/game/:id/state         - Get game state (polling)
POST   /api/game/:id/input         - Submit input
GET    /api/game/:id/result        - Get result
```

## 🚧 Known Limitations

1. **Polling-based**: Uses HTTP polling (100ms interval)
   - Future: WebSocket for real-time updates

2. **No reconnection**: If disconnected, refresh page
   - Future: Auto-reconnect logic

3. **Basic graphics**: Simple geometric shapes
   - Future: Sprite sheets, animations

4. **No sounds**: Silent gameplay
   - Future: Sound effects and music

## 🔜 Future Enhancements

1. **WebSocket Integration**
   - Replace polling with WebSocket
   - Real-time state updates
   - Lower latency

2. **Enhanced Visuals**
   - Car sprites
   - Particle effects
   - Animations

3. **Sound Effects**
   - Engine sounds
   - Collision sounds
   - Power-up sounds

4. **Additional Features**
   - Minimap
   - Spectator mode
   - Replay system

## 📖 Documentation

- [Implementation Plan](PLAN.md) - Detailed implementation plan
- [Backend README](../backend/README.md) - Backend documentation
- [Game Engine Summary](../GAME_ENGINE_IMPLEMENTATION_SUMMARY.md) - Game engine docs

## 🎯 Testing Checklist

- [ ] Backend running on localhost:3000
- [ ] Redis running
- [ ] PostgreSQL running
- [ ] Database migrated
- [ ] Test users created
- [ ] Test cars created
- [ ] JWT tokens generated
- [ ] Game served on localhost:8080
- [ ] Can create room
- [ ] Can join room
- [ ] Can mark ready
- [ ] Game starts automatically
- [ ] Can see game state updating
- [ ] Can control with arrow keys
- [ ] Obstacles visible
- [ ] Power-ups visible
- [ ] Game ends correctly
- [ ] Results displayed
- [ ] Can return to menu

## 📞 Support

For issues or questions:
1. Check browser console for errors
2. Check backend console logs
3. Review [PLAN.md](PLAN.md) for architecture
4. Check database for data consistency

---

**Built with:**
- [Phaser 3](https://phaser.io/) - HTML5 Game Framework
- [Vanilla JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript) - No framework overhead
- Love for simple, clean code ❤️
