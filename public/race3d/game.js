/**
 * game.js — Endless Race Mode
 *
 * Imports shared 3D engine from engine3d.js.
 * Handles: local obstacle spawning, collision, score, input, game loop.
 */

import * as THREE from 'three';
import {
  WEB3, CONFIG, scene, camera, clock, renderer, dirLight,
  obstacleModels, loadAssets, createCarMesh,
  createObstacleFromModel, createProceduralCar,
  trackPieces, actualTrackLength, initTrack, recycleTrack,
  isMobile,
} from './engine3d.js';

// ─── State ──────────────────────────────────────────────────────────────────
const state = {
  running: false,
  gameOver: false,
  speed: CONFIG.startSpeed,
  distance: 0,
  score: 0,
  currentLane: 1,
  targetX: CONFIG.lanes[1],
  playerX: CONFIG.lanes[1],
  obstacleTimer: 0,
  obstacleInterval: CONFIG.obstacleInterval,
  obstaclesDodged: 0,
  maxSpeedReached: 0,
  gameTime: 0,
  nearMissCooldown: 0,
};

// ─── DOM refs ───────────────────────────────────────────────────────────────
const loadingScreen = document.getElementById('loading-screen');
const loadingBar = document.getElementById('loading-bar');
const loadingText = document.getElementById('loading-text');
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const hud = document.getElementById('hud');
const hudScore = document.getElementById('hud-score');
const hudSpeed = document.getElementById('hud-speed');
const hudDistance = document.getElementById('hud-distance');
const gameoverScreen = document.getElementById('gameover-screen');
const finalScore = document.getElementById('final-score');
const finalDistance = document.getElementById('final-distance');
const scoreStatus = document.getElementById('score-status');
const scoreRank = document.getElementById('score-rank');
const restartBtn = document.getElementById('restart-btn');
const backBtn = document.getElementById('back-btn');
const startCarName = document.getElementById('start-car-name');
const startWallet = document.getElementById('start-wallet');
const mobileControls = document.getElementById('mobile-controls');
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');
const nearMissEl = document.getElementById('near-miss');

let nearMissTimeout = null;
function showNearMissFlash() {
  if (nearMissEl) {
    nearMissEl.classList.add('show');
    clearTimeout(nearMissTimeout);
    nearMissTimeout = setTimeout(() => nearMissEl.classList.remove('show'), 700);
  }
}

// ─── Obstacles (local) ──────────────────────────────────────────────────────
const obstacles = [];
let playerCar = null;

function isLaneClearForTraffic(trafficObs, laneIdx, checkAhead) {
  const laneX = CONFIG.lanes[laneIdx];
  const tz = trafficObs.position.z;
  for (const obs of obstacles) {
    if (obs === trafficObs || !obs.userData.active) continue;
    const dz = tz - obs.position.z;
    if (dz < -2 || dz > checkAhead) continue;
    if (Math.abs(obs.position.x - laneX) < 1.8) return false;
  }
  return true;
}

function spawnObstacle(excludeLane) {
  let lane;
  if (excludeLane !== undefined) {
    const available = [];
    for (let i = 0; i < CONFIG.lanes.length; i++) {
      if (i !== excludeLane) available.push(i);
    }
    lane = available[Math.floor(Math.random() * available.length)];
  } else {
    lane = Math.floor(Math.random() * CONFIG.lanes.length);
  }
  const x = CONFIG.lanes[lane];
  const z = -CONFIG.spawnDistance;

  // Pick random obstacle type
  const available = [];
  if (obstacleModels.cone) available.push({ model: obstacleModels.cone, type: 'cone', height: 1.5 });
  if (obstacleModels.cone2) available.push({ model: obstacleModels.cone2, type: 'cone2', height: 1.5 });
  if (obstacleModels.barrier) available.push({ model: obstacleModels.barrier, type: 'barrier', height: 2.0 });
  available.push({ model: null, type: 'procedural_car', height: 0 });
  if (obstacleModels.chevrolet) available.push({ model: obstacleModels.chevrolet, type: 'chevrolet', height: 3.0 });

  let mesh;
  const pick = available[Math.floor(Math.random() * available.length)];
  const container = new THREE.Group();

  if (pick.type === 'procedural_car' || pick.type === 'chevrolet') {
    if (pick.type === 'chevrolet') {
      mesh = createObstacleFromModel(pick.model, pick.height, 'chevrolet');
    } else {
      mesh = createProceduralCar();
    }

    const isOncoming = Math.random() < 0.28;
    container.userData.isTraffic = true;
    container.userData.isOncoming = isOncoming;

    if (isOncoming) {
      if (pick.type === 'chevrolet') {
        if (mesh.children[0]) mesh.children[0].rotation.y = 0;
      } else {
        mesh.rotation.y = Math.PI;
      }
      container.userData.speedRatio = -(0.5 + Math.random() * 0.5);
    } else {
      container.userData.speedRatio = 0.25 + Math.random() * 0.45;
      container.userData.targetX = x;
      container.userData.laneChangeTimer = 3 + Math.random() * 5;
      container.userData.avoidTimer = 0;
      container.userData.braking = false;
    }

    if (mesh.userData && mesh.userData.tailLightMat) container.userData.tailLightMat = mesh.userData.tailLightMat;
  } else if (pick.model) {
    mesh = createObstacleFromModel(pick.model, pick.height, pick.type);
  } else {
    const geo = new THREE.ConeGeometry(0.4, 1.2, 8);
    const mat = new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: 0.7 });
    mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.6;
    mesh.castShadow = true;
  }

  container.add(mesh);
  container.position.set(x, 0, z);
  container.userData.lane = lane;
  container.userData.active = true;

  if (Math.abs(z) < 30) return lane;
  const tooClose = obstacles.some(o =>
    o.userData.lane === lane && Math.abs(o.position.z - z) < 8
  );
  if (tooClose) return lane;

  scene.add(container);
  obstacles.push(container);
  return lane;
}

function updateObstacles(delta) {
  state.obstacleTimer += delta;
  if (state.distance < 50) return;

  if (state.obstacleTimer >= state.obstacleInterval) {
    state.obstacleTimer = 0;
    const firstLane = spawnObstacle();
    if (Math.random() < 0.35) spawnObstacle(firstLane);
    state.obstacleInterval = Math.max(
      CONFIG.minObstacleInterval,
      state.obstacleInterval - 0.003
    );
  }

  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obs = obstacles[i];
    if (obs.position.z > CONFIG.despawnDistance) {
      if (obs.userData.active) state.obstaclesDodged++;
      scene.remove(obs);
      obstacles.splice(i, 1);
    }
  }
}

// ─── Collision Detection ────────────────────────────────────────────────────
function checkCollisions() {
  if (!playerCar) return false;

  const playerBox = new THREE.Box3().setFromObject(playerCar);
  const shrink = 0.4;
  playerBox.min.x += shrink;
  playerBox.max.x -= shrink;
  playerBox.min.z += shrink;
  playerBox.max.z -= shrink;

  for (const obs of obstacles) {
    if (!obs.userData.active) continue;
    if (Math.abs(obs.position.z) > 8) continue;
    const obsBox = new THREE.Box3().setFromObject(obs);

    const obsSize = obsBox.getSize(new THREE.Vector3());
    if (obsSize.x > 10 || obsSize.y > 10 || obsSize.z > 10) {
      console.warn('Skipping oversized obstacle collision:', obsSize);
      obs.userData.active = false;
      scene.remove(obs);
      continue;
    }

    if (playerBox.intersectsBox(obsBox)) {
      obs.userData.active = false;
      return true;
    }
  }
  return false;
}

// ─── Input ──────────────────────────────────────────────────────────────────
function moveLeft() {
  if (state.currentLane > 0) {
    state.currentLane--;
    state.targetX = CONFIG.lanes[state.currentLane];
  }
}

function moveRight() {
  if (state.currentLane < CONFIG.lanes.length - 1) {
    state.currentLane++;
    state.targetX = CONFIG.lanes[state.currentLane];
  }
}

window.addEventListener('keydown', (e) => {
  if (!state.running) return;
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') moveLeft();
  if (e.code === 'ArrowRight' || e.code === 'KeyD') moveRight();
});

btnLeft.addEventListener('pointerdown', (e) => { e.preventDefault(); if (state.running) moveLeft(); });
btnRight.addEventListener('pointerdown', (e) => { e.preventDefault(); if (state.running) moveRight(); });

let touchStartX = 0;
window.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
window.addEventListener('touchend', (e) => {
  if (!state.running) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 40) {
    if (dx < 0) moveLeft(); else moveRight();
  }
}, { passive: true });

// ─── Game Logic ─────────────────────────────────────────────────────────────
function resetGame() {
  state.running = false;
  state.gameOver = false;
  state.speed = CONFIG.startSpeed;
  state.distance = 0;
  state.score = 0;
  state.currentLane = 1;
  state.targetX = CONFIG.lanes[1];
  state.playerX = CONFIG.lanes[1];
  state.obstacleTimer = 0;
  state.obstacleInterval = CONFIG.obstacleInterval;
  state.obstaclesDodged = 0;
  state.maxSpeedReached = 0;
  state.gameTime = 0;
  state.nearMissCooldown = 0;

  for (const obs of obstacles) scene.remove(obs);
  obstacles.length = 0;

  // Reset track positions
  const step = actualTrackLength - 0.5;
  for (let i = 0; i < trackPieces.length; i++) {
    trackPieces[i].position.z = actualTrackLength / 2 - i * step;
  }

  if (playerCar) {
    playerCar.position.set(CONFIG.lanes[1], 0.01, 0);
    playerCar.rotation.set(0, 0, 0);
  }
}

function startGame() {
  resetGame();
  state.running = true;
  startScreen.classList.remove('show');
  gameoverScreen.classList.remove('show');
  hud.classList.add('show');
  if (isMobile()) mobileControls.classList.add('show');
  clock.getDelta();
}

function gameOverHandler() {
  state.running = false;
  state.gameOver = true;
  hud.classList.remove('show');
  mobileControls.classList.remove('show');
  gameoverScreen.classList.add('show');
  finalScore.textContent = state.score.toLocaleString();
  finalDistance.textContent = Math.round(state.distance) + 'm driven';
  scoreStatus.textContent = '';
  scoreRank.textContent = '';
  submitScore();
}

async function submitScore() {
  if (!WEB3.backendUrl || !WEB3.authToken) {
    scoreStatus.textContent = 'Not connected to wallet';
    return;
  }
  scoreStatus.textContent = 'Saving score...';
  try {
    const res = await fetch(`${WEB3.backendUrl}/game/endless/score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WEB3.authToken}`,
      },
      body: JSON.stringify({
        carUid: WEB3.carData.uid || null,
        carName: WEB3.carData.name || null,
        score: state.score,
        distance: Math.round(state.distance),
        maxSpeed: Math.round(state.maxSpeedReached * 3.6),
        gameTime: Math.round(state.gameTime * 10) / 10,
        obstaclesDodged: state.obstaclesDodged,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.success) {
      const { rank, isPersonalBest, personalBest } = data.data;
      scoreStatus.textContent = isPersonalBest ? 'NEW PERSONAL BEST!' : `Personal best: ${personalBest.toLocaleString()}`;
      scoreRank.textContent = `Global Rank: #${rank}`;
      if (isPersonalBest) scoreStatus.style.color = '#fb923c';
      else scoreStatus.style.color = 'rgba(255,255,255,0.5)';
    }
  } catch (e) {
    console.warn('Score submission failed:', e);
    scoreStatus.textContent = 'Score save failed (offline?)';
  }
}

// ─── Update Loop ────────────────────────────────────────────────────────────
function update(delta) {
  if (!state.running) return;

  state.gameTime += delta;
  state.speed = Math.min(CONFIG.maxSpeed, state.speed + CONFIG.speedIncrement * delta);
  if (state.speed > state.maxSpeedReached) state.maxSpeedReached = state.speed;
  const moveAmount = state.speed * delta;
  state.distance += moveAmount;
  state.score = Math.round(state.distance * 2 + state.speed * 0.5);

  // Move track toward player
  for (const piece of trackPieces) {
    piece.position.z += moveAmount;
  }

  // Move obstacles (traffic uses speed ratio)
  for (const obs of obstacles) {
    const ratio = (obs.userData.speedRatio !== undefined) ? (1 - obs.userData.speedRatio) : 1;
    obs.position.z += moveAmount * ratio;

    if (obs.userData.isTraffic) {
      // Wheel rotation
      obs.traverse(child => {
        if (child.userData.isWheel) {
          child.rotation.x += state.speed * delta * (obs.userData.isOncoming ? -0.5 : 0.4);
        }
      });

      // Same-direction traffic: avoidance + lane change AI
      if (!obs.userData.isOncoming && obs.userData.targetX !== undefined) {
        obs.userData.avoidTimer -= delta;
        if (obs.userData.avoidTimer <= 0) {
          obs.userData.avoidTimer = 0.25;
          const curLane = obs.userData.lane;
          const laneBlocked = !isLaneClearForTraffic(obs, curLane, 14);
          obs.userData.braking = laneBlocked;

          if (laneBlocked) {
            const adj = [];
            if (curLane > 0) adj.push(curLane - 1);
            if (curLane < CONFIG.lanes.length - 1) adj.push(curLane + 1);
            if (adj.length > 1 && Math.random() < 0.5) adj.reverse();
            for (const nextLane of adj) {
              if (isLaneClearForTraffic(obs, nextLane, 14)) {
                obs.userData.lane = nextLane;
                obs.userData.targetX = CONFIG.lanes[nextLane];
                obs.userData.laneChangeTimer = 2 + Math.random() * 3;
                obs.userData.braking = false;
                break;
              }
            }
          } else {
            obs.userData.laneChangeTimer -= 0.25;
            if (obs.userData.laneChangeTimer <= 0) {
              const adj = [];
              if (curLane > 0) adj.push(curLane - 1);
              if (curLane < CONFIG.lanes.length - 1) adj.push(curLane + 1);
              if (adj.length) {
                const nextLane = adj[Math.floor(Math.random() * adj.length)];
                if (isLaneClearForTraffic(obs, nextLane, 14)) {
                  obs.userData.lane = nextLane;
                  obs.userData.targetX = CONFIG.lanes[nextLane];
                }
              }
              obs.userData.laneChangeTimer = 3 + Math.random() * 5;
            }
          }
        }

        // Brake light intensity
        if (obs.userData.tailLightMat) {
          const targetIntensity = obs.userData.braking ? 1.8 : 0.4;
          obs.userData.tailLightMat.emissiveIntensity +=
            (targetIntensity - obs.userData.tailLightMat.emissiveIntensity) * 8 * delta;
        }

        // Smooth lateral movement
        const dx = obs.userData.targetX - obs.position.x;
        obs.position.x += dx * Math.min(1, 1.5 * delta);
        if (obs.children[0]) {
          obs.children[0].rotation.y += (-dx * 0.15 - obs.children[0].rotation.y) * 5 * delta;
        }
      }
    }
  }

  // Recycle track
  recycleTrack(camera.position.z);

  // Spawn obstacles
  updateObstacles(delta);

  // Smooth lane change for player
  const prevX = state.playerX;
  state.playerX += (state.targetX - state.playerX) * Math.min(1, CONFIG.laneChangeSpeed * delta);
  if (playerCar) {
    playerCar.position.x = state.playerX;
    const lateralSpeed = state.playerX - prevX;
    const steerAngle = -lateralSpeed * 0.8;
    playerCar.rotation.y += (steerAngle - playerCar.rotation.y) * 8 * delta;
    playerCar.position.y = 0.01;
  }

  // Camera follows player smoothly
  camera.position.x += (state.playerX * 0.4 - camera.position.x) * 3 * delta;

  // Keep directional light near player
  dirLight.position.set(state.playerX + 5, 15, 5);
  dirLight.target.position.set(state.playerX, 0, -15);

  // Collision check
  if (checkCollisions()) {
    gameOverHandler();
    return;
  }

  // Near-miss scoring
  if (state.nearMissCooldown > 0) state.nearMissCooldown -= delta;
  if (state.nearMissCooldown <= 0) {
    for (const obs of obstacles) {
      if (!obs.userData.active || obs.userData.isTraffic) continue;
      const dx = Math.abs(obs.position.x - state.playerX);
      const dz = obs.position.z;
      if (dx < 1.8 && dz > 0.5 && dz < 5) {
        state.score += 50;
        state.nearMissCooldown = 0.8;
        showNearMissFlash();
        break;
      }
    }
  }

  // Update HUD
  hudScore.textContent = state.score.toLocaleString();
  hudSpeed.textContent = Math.round(state.speed * 3.6);
  hudDistance.textContent = Math.round(state.distance) + 'm';
}

// ─── Render Loop ────────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  update(delta);
  renderer.render(scene, camera);
}

// ─── Button Handlers ────────────────────────────────────────────────────────
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
backBtn.addEventListener('click', () => { window.location.href = '/game'; });

// ─── Init ───────────────────────────────────────────────────────────────────
async function init() {
  if (WEB3.carData.name) startCarName.textContent = WEB3.carData.name;
  if (WEB3.walletAddress) {
    const addr = WEB3.walletAddress;
    startWallet.textContent = `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

  await loadAssets(loadingBar, loadingText);

  // Create player car
  playerCar = createCarMesh(0xff6600, 'carTex1');
  playerCar.position.set(CONFIG.lanes[1], 0.01, 0);
  scene.add(playerCar);

  initTrack();

  console.log('Web3 Integration:', {
    wallet: WEB3.walletAddress ? 'connected' : 'not connected',
    car: WEB3.carData.name || 'none',
    backend: WEB3.backendUrl || 'none',
    carStats: WEB3.carData,
    gameConfig: { startSpeed: CONFIG.startSpeed.toFixed(1), maxSpeed: CONFIG.maxSpeed.toFixed(1), accel: CONFIG.speedIncrement.toFixed(3) },
  });

  loadingScreen.classList.add('hidden');
  setTimeout(() => {
    loadingScreen.style.display = 'none';
    startScreen.classList.add('show');
  }, 800);

  animate();
}

init();
