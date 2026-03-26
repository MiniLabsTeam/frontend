# Racing Guide

## Selecting a Car

Before racing, select a car from your inventory:
* Cars with higher stats perform better
* Equipped spare parts add bonus stats
* Choose a car that matches your preferred game mode

## 2D Drag Race

### How to Play
1. Go to **Game** page
2. Select **Drag Race** mode
3. Create a room or join an existing one
4. Wait for all players to ready up
5. Race!

### Controls
* **Up Arrow** — Accelerate
* **Left/Right Arrow** — Change lanes

### Winning
* First player to cross the finish line wins
* Prize pool is distributed based on finish position
* Race result is signed by the backend and submitted on-chain

---

## 3D Endless Race

### How to Play
1. Go to **Game** page
2. Select **Endless Race** mode
3. Choose your car
4. Survive as long as possible!

### Controls
* **Left/Right Arrow** — Switch between 3 lanes
* **Avoid obstacles** — Hitting them costs HP
* **Collect power-ups** — Shields, speed boosts, score multipliers

### Scoring
Your score is based on:
* **Distance** — How far you traveled
* **Max Speed** — Highest speed achieved
* **Obstacles Dodged** — Clean driving bonus
* **Game Time** — Survival duration

### Leaderboard
Scores are submitted to the global leaderboard. Top scores earn bragging rights and quest progress.

---

## 3D Multiplayer

### How to Play
1. Go to **Game** page
2. Select **Multiplayer** mode
3. Create or join a room
4. Race against real players in real-time

### Server-Authoritative
* The server runs physics at 60 FPS
* Your client sends input, server calculates positions
* This prevents all forms of cheating (speed hacks, teleports)
* What you see is a smooth interpolation of the server state

---

## Tips for Winning

| Tip | Details |
|-----|---------|
| **Match car to mode** | High Speed for Drag Race, high Handling for Endless |
| **Equip spare parts** | Even small stat boosts can decide close races |
| **Practice Endless** | Learn obstacle patterns to improve survival time |
| **Complete quests** | Racing earns quest progress and bonus tokens |
