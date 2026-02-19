# Implementation Plan: 2D Web Game Client for Endless Race

## Context

The user needs a **simple 2D web-based game client** for the OneChain Racing Endless Race mode. The backend game engine is already complete (60 FPS server-authoritative system with Redis state management), and this client will connect to the existing API endpoints to provide a playable multiplayer racing experience.

**Why this is needed:**
- Backend game engine exists but has no visual client
- Users need a way to play and test the game
- Must integrate with existing `/api/game/*` endpoints
- Should be simple, fast to develop, and easy to deploy

**Technology chosen:**
- **Platform:** Web 2D (HTML5 Canvas + Phaser 3)
- **Graphics:** Simple/minimalist (geometric shapes, flat colors)
- **Scope:** Endless Race mode only
- **Backend:** Direct connection to localhost:3000 API

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│          Phaser 3 Game Client               │
│  (E:\MiniLabs\games)                        │
│                                             │
│  ┌────────────┐  ┌──────────────┐          │
│  │ MenuScene  │→│ LobbyScene   │→         │
│  └────────────┘  └──────────────┘          │
│                         ↓                    │
│  ┌────────────┐  ┌──────────────┐          │
│  │ResultScene │←│  GameScene   │          │
│  └────────────┘  └──────────────┘          │
│         ↑               ↓                    │
│         └───── API Client ─────┘           │
└─────────────────────────────────────────────┘
                     ↓ HTTP/REST
┌─────────────────────────────────────────────┐
│       Backend Game Engine                   │
│       (localhost:3000/api/game)             │
│                                             │
│  • POST /room/create                        │
│  • POST /room/:id/join                      │
│  • POST /room/:id/ready                     │
│  • GET  /room/:id (polling)                 │
│  • GET  /:roomId/state (polling)            │
│  • POST /:roomId/input                      │
│  • GET  /:roomId/result                     │
└─────────────────────────────────────────────┘
```

## File Structure

```
E:\MiniLabs\games/
├── index.html                    # Main HTML entry point
├── package.json                  # Dependencies (optional)
├── css/
│   └── style.css                 # Minimal styling
├── js/
│   ├── config.js                 # Game config & constants
│   ├── api.js                    # API client wrapper
│   ├── scenes/
│   │   ├── MenuScene.js          # Main menu (create/join room)
│   │   ├── LobbyScene.js         # Waiting room (ready up)
│   │   ├── GameScene.js          # Racing game (main gameplay)
│   │   └── ResultScene.js        # Race result display
│   └── main.js                   # Phaser game initialization
└── assets/
    └── (empty - using shapes only)
```

## Components to Implement

### 1. index.html
- Load Phaser 3 from CDN
- Canvas container for game
- UI overlay for address/token input
- Load all JS modules in order

### 2. js/config.js
- API_BASE_URL: http://localhost:3000/api
- Canvas size: 800x600
- Track dimensions matching backend (15 units, 3 lanes)
- Visual scale: 20px per game unit
- Color palette for minimalist design
- Polling intervals (lobby: 1s, game: 100ms)

### 3. js/api.js
**API Client Class** with methods:
- `createRoom(gameMode, maxPlayers, entryFee, deadline)`
- `joinRoom(roomUid, carUid)`
- `markReady(roomUid)`
- `getRoomInfo(roomUid)` - For lobby polling
- `getGameState(roomUid)` - For game state polling
- `submitInput(roomUid, action)` - Send player inputs
- `getResult(roomUid)` - Fetch race results

### 4. js/scenes/MenuScene.js
**Main Menu:**
- Title screen
- Input: Player address
- Input: JWT token
- Button: Create Room → API call → Switch to LobbyScene
- Input: Room UID + Button: Join Room → API call → Switch to LobbyScene
- Display: List of available rooms (from GET /api/game/rooms)

### 5. js/scenes/LobbyScene.js
**Waiting Room:**
- Display room info (UID, mode, player count)
- Poll GET /api/game/room/:id every 1 second
- Show all players with ready status
- Button: Mark Ready → POST /api/game/room/:id/ready
- Auto-switch to GameScene when status = "RACING"

### 6. js/scenes/GameScene.js
**Main Racing Game:**

**Rendering (Top-down 2D view):**
- Track: 3 lanes with white line separators
- Players: Colored rectangles at position (x, z)
- Obstacles: Rectangles colored by type (BARRIER=red, HAZARD=orange, SLOW_ZONE=yellow)
- Power-ups: Circles colored by type (BOOST=green, SHIELD=blue, SLOW=purple)
- UI overlay: Distance, Rank, Speed, Active power-ups

**State Polling:**
- GET /api/game/:roomId/state every 100ms
- Update all game objects from response
- Check if status = "FINISHED" → Switch to ResultScene

**Camera:**
- Follow current player's Z position
- Scroll upward as player progresses
- Offset to show track ahead

**Input Handling:**
- Arrow Left → POST /api/game/:roomId/input { action: "TURN_LEFT" }
- Arrow Right → POST /api/game/:roomId/input { action: "TURN_RIGHT" }

**Coordinate Conversion:**
- Game units (backend) → Screen pixels
- X: (gameX + TRACK_WIDTH/2) * SCALE
- Y: CANVAS_HEIGHT - (gameZ * SCALE) + cameraOffset

### 7. js/scenes/ResultScene.js
**Race Results:**
- Fetch GET /api/game/:roomId/result
- Display winner (large text)
- Show rankings table (rank, player, distance, time)
- Show signature for blockchain verification
- Button: Back to Menu → Switch to MenuScene

### 8. js/main.js
**Phaser Initialization:**
- Create GameAPI instance
- Configure Phaser (800x600, scenes array, physics)
- Start with MenuScene
- Make API globally accessible via `game.api`

### 9. css/style.css
**Minimal Styling:**
- Center game canvas
- Dark background (#2d3436)
- Overlay panel for inputs (top-right, semi-transparent)
- Simple input styling

## Implementation Order

**Phase 1: Setup & Structure (30 min)**
1. Create index.html with Phaser CDN
2. Create config.js with constants
3. Create api.js with API wrapper skeleton
4. Create main.js with Phaser init
5. Create style.css with basic layout

**Phase 2: Menu & Lobby (1 hour)**
6. Implement MenuScene UI and room creation/join logic
7. Implement LobbyScene with player list and polling
8. Test: Create room → Join → Ready → Auto-start

**Phase 3: Game Scene (2-3 hours)**
9. GameScene: Render track and lanes
10. GameScene: Render players from state
11. GameScene: Render obstacles from state
12. GameScene: Render power-ups from state
13. GameScene: Implement camera following
14. GameScene: Add state polling loop
15. GameScene: Add input handling
16. GameScene: Add UI overlay (speed, rank, distance)

**Phase 4: Results & Polish (30-60 min)**
17. Implement ResultScene with rankings table
18. Add error handling (network errors, invalid rooms)
19. Add loading indicators
20. Test full flow: Menu → Lobby → Game → Results

## API Integration Details

All requests use:
- Base URL: `http://localhost:3000/api`
- Headers: `{ Authorization: "Bearer <JWT>", Content-Type: "application/json" }`

**Key endpoints:**
- POST /game/room/create → Returns { data: { uid, status, ... } }
- POST /game/room/:uid/join → Returns { data: { roomPlayer, carStats } }
- POST /game/room/:uid/ready → Returns { success: true }
- GET /game/room/:uid → Returns room with players array
- GET /game/:uid/state → Returns { data: { players, obstacles, powerUps, ... } }
- POST /game/:uid/input → Body: { action: "TURN_LEFT" | "TURN_RIGHT" | ... }
- GET /game/:uid/result → Returns { data: { winner, rankings, signature } }

## Visual Design (Minimalist)

**Color Palette:**
- Background: #2d3436 (dark gray)
- Track: #636e72 (medium gray)
- Lane lines: #ffffff (white)
- Players: #00b894 (green), #0984e3 (blue), #fdcb6e (yellow), #e17055 (orange)
- Obstacles: #d63031 (red), #e17055 (orange), #fdcb6e (yellow)
- Power-ups: #00b894 (green), #74b9ff (blue), #a29bfe (purple)

**Shapes:**
- Players: 16x32 rounded rectangles
- Obstacles: Rectangles (size from backend)
- Power-ups: 12px radius circles
- Track: Solid gray with white line separators

## Testing Strategy

**Setup:**
```bash
# Terminal 1: Start backend
cd E:\MiniLabs\backend
npm run dev

# Terminal 2: Serve game
cd E:\MiniLabs\games
npx http-server -p 8080
```

**Test Flow:**
1. Open http://localhost:8080 in 2 browser windows
2. Window 1: Enter address + token → Create room → Copy room UID
3. Window 2: Enter address + token → Join room (paste UID)
4. Both windows: Click "Mark Ready"
5. Observe: Game auto-starts, both cars visible, moving forward
6. Observe: Obstacles spawn every 2 seconds
7. Observe: Power-ups spawn occasionally
8. Test: Arrow keys change lanes
9. Wait: Game ends after 5 minutes or collision
10. Verify: Results screen shows rankings and winner

**Verify Backend:**
- Check database: Room status = FINISHED
- Check database: Race record with winner and raceData
- Check console: Game loop logs

## Critical Files Reference

**Backend (already exist):**
- `E:\MiniLabs\backend\src\routes\game.routes.ts` - API endpoints
- `E:\MiniLabs\backend\src\services\game\GameEngineService.ts` - Game logic
- `E:\MiniLabs\backend\src\types\game.ts` - Type definitions

**Frontend (to create):**
- All files in `E:\MiniLabs\games/` as outlined above

## Verification Checklist

✅ **Setup:**
- [ ] Phaser loads correctly
- [ ] API client initialized
- [ ] Config constants match backend

✅ **Menu Scene:**
- [ ] Can create room successfully
- [ ] Can join room with UID
- [ ] Room list displays

✅ **Lobby Scene:**
- [ ] Players list updates
- [ ] Ready status shows
- [ ] Auto-switches to game when racing starts

✅ **Game Scene:**
- [ ] Track renders with 3 lanes
- [ ] Player cars render at correct positions
- [ ] Obstacles render and spawn
- [ ] Power-ups render and spawn
- [ ] Camera follows player
- [ ] State updates every 100ms
- [ ] Input sends to backend
- [ ] UI shows speed/rank/distance

✅ **Result Scene:**
- [ ] Winner displays correctly
- [ ] Rankings show all players
- [ ] Signature displayed
- [ ] Can return to menu

✅ **Integration:**
- [ ] All API calls succeed
- [ ] JWT auth works
- [ ] Game state syncs correctly
- [ ] Backend validates inputs
- [ ] Race saved to database

---

**Total Estimated Time:** 4-6 hours
**Complexity:** Low-Medium
**Dependencies:** Backend running on localhost:3000
