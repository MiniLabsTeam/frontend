/**
 * multiplayer.js — Multiplayer Racing Mode
 *
 * Imports shared 3D engine from engine3d.js.
 * Handles: WebSocket, lobby, server-driven game state, prediction, input.
 */

import * as THREE from 'three';
import {
  WEB3, CONFIG, scene, camera, renderer, dirLight,
  obstacleModels, loadAssets, createCarMesh,
  createObstacleFromModel, createProceduralCar,
  trackPieces, initTrack, recycleTrack,
  updateTraffic, clearTraffic, trafficState,
  isMobile,
} from './engine3d.js';

// ═══════════════════════════════════════════════════════════════════════════════
//  MULTIPLAYER CONFIG (extends shared CONFIG)
// ═══════════════════════════════════════════════════════════════════════════════

const CFG = {
  apiBaseUrl: localStorage.getItem('backend_url') || 'http://localhost:3000/api',
  token: localStorage.getItem('auth_token') || '',
  playerAddress: localStorage.getItem('wallet_address') || '',
  carUid: localStorage.getItem('game_car_uid') || '',

  playerColors: [0x00e676, 0x2979ff, 0xffea00, 0xff6d00],

  obstacleColors: {
    BARRIER: 0xd63031,
    HAZARD: 0xe17055,
    SLOW_ZONE: 0xfdcb6e,
  },

  powerUpColors: {
    BOOST: 0x00e676,
    SHIELD: 0x74b9ff,
    SLOW_OTHERS: 0xa29bfe,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  DOM REFERENCES
// ═══════════════════════════════════════════════════════════════════════════════

const $ = (id) => document.getElementById(id);
const loadingScreen = $('loading-screen');
const loadingBar = $('loading-bar');
const loadingText = $('loading-text');
const menuScreen = $('menu-screen');
const lobbyScreen = $('lobby-screen');
const hud = $('hud');
const resultScreen = $('result-screen');
const predictionPanel = $('prediction-panel');
const spectatorBadge = $('spectator-badge');
const mobileControls = $('mobile-controls');

// ═══════════════════════════════════════════════════════════════════════════════
//  SCREEN MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

function showScreen(name) {
  for (const s of [loadingScreen, menuScreen, lobbyScreen, resultScreen]) {
    s.classList.remove('show');
  }
  hud.classList.remove('show');
  mobileControls.classList.remove('show');
  spectatorBadge.classList.remove('show');
  predictionPanel.classList.remove('show');

  switch (name) {
    case 'loading': loadingScreen.classList.add('show'); break;
    case 'menu': menuScreen.classList.add('show'); break;
    case 'lobby': lobbyScreen.classList.add('show'); break;
    case 'game':
      hud.classList.add('show');
      if (isMobile()) mobileControls.classList.add('show');
      break;
    case 'result': resultScreen.classList.add('show'); break;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  API CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

class GameAPI {
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  async _req(method, endpoint, data = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    const opts = { method, headers };
    if (data && (method === 'POST' || method === 'PUT')) opts.body = JSON.stringify(data);
    const res = await fetch(`${this.baseUrl}${endpoint}`, opts);
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`);
    return json;
  }

  createRoom(gameMode, maxPlayers, entryFee, deadline) {
    return this._req('POST', '/game/room/create', { gameMode, maxPlayers, entryFee, deadline });
  }
  createRoomWithAI(carUid) {
    return this._req('POST', '/game/room/create-vs-ai', { carUid });
  }
  getLiveRooms() { return this._req('GET', '/game/rooms/live'); }
  getResult(roomUid) { return this._req('GET', `/game/${roomUid}/result`); }
  getPredictionPool(roomUid) { return this._req('GET', `/prediction/pool/${roomUid}`); }
  placeBet(poolId, predictedWinnerId, amount) {
    return this._req('POST', '/prediction/bet', { poolId, predictedWinnerId, amount });
  }
  getPredictionBalance() { return this._req('GET', '/prediction/balance'); }
}

const api = new GameAPI(CFG.apiBaseUrl, CFG.token);

// ═══════════════════════════════════════════════════════════════════════════════
//  WEBSOCKET CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

class WS {
  constructor(apiBaseUrl, token) {
    const baseUrl = apiBaseUrl.replace('/api', '');
    this.socket = io(baseUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });
    this.connected = false;
    this.socket.on('connect', () => { this.connected = true; console.log('WS connected'); });
    this.socket.on('disconnect', (r) => { this.connected = false; console.log('WS disconnected:', r); });
    this.socket.on('connect_error', (e) => { this.connected = false; console.error('WS error:', e.message); });
  }

  on(event, handler) { this.socket.on(event, handler); }
  off(event, handler) { this.socket.off(event, handler); }

  emit(event, data, cb) {
    if (!this.connected) {
      const wait = new Promise((res, rej) => {
        const t = setTimeout(() => rej(new Error('WS timeout')), 10000);
        this.socket.once('connect', () => { clearTimeout(t); res(); });
      });
      wait.then(() => this.socket.emit(event, data, cb)).catch((e) => cb && cb({ success: false, message: e.message }));
      return;
    }
    this.socket.emit(event, data, cb);
  }

  _emitPromise(event, data) {
    return new Promise((resolve, reject) => {
      this.emit(event, data, (res) => {
        if (res && res.success) resolve(res.data);
        else reject(new Error(res?.message || `${event} failed`));
      });
    });
  }

  joinRoom(roomUid, carUid) { return this._emitPromise('PLAYER_JOIN', { roomUid, carUid }); }
  markReady(roomUid) { return this._emitPromise('PLAYER_READY', { roomUid }); }
  sendInput(roomUid, action) {
    this.emit('PLAYER_INPUT', { roomUid, action }, (r) => {
      if (r && !r.success) console.error('Input error:', r.message);
    });
  }
  getRoomState(roomUid) { return this._emitPromise('GET_ROOM_STATE', { roomUid }); }
  spectateJoin(roomUid) { return this._emitPromise('SPECTATE_JOIN', { roomUid }); }
  spectateLeave(roomUid) { return this._emitPromise('SPECTATE_LEAVE', { roomUid }); }
  cancelRoom(roomUid) { return this._emitPromise('ROOM_CANCEL', { roomUid }); }
  leaveRoom(roomUid) { return this._emitPromise('PLAYER_LEAVE', { roomUid }); }
  disconnect() { this.socket.disconnect(); }
}

let ws = null;

function initWebSocket() {
  if (ws) ws.disconnect();
  ws = new WS(CFG.apiBaseUrl, CFG.token);
  return ws;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  3D HELPERS (multiplayer-specific)
// ═══════════════════════════════════════════════════════════════════════════════

let lastTrafficTime = 0;

function createNameTag(text, isMe) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = isMe ? 'rgba(0,230,118,0.7)' : 'rgba(255,255,255,0.5)';
  ctx.font = 'bold 28px Orbitron, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.substring(0, 12), 128, 32);
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  sprite.scale.set(3, 0.75, 1);
  sprite.position.y = 2.5;
  return sprite;
}

function createObstacle3D(type) {
  const group = new THREE.Group();
  let model = null;
  let obstType = null;

  if (type === 'BARRIER' && obstacleModels.barrier) { model = obstacleModels.barrier; obstType = 'barrier'; }
  else if (type === 'HAZARD' && obstacleModels.chevrolet) { model = obstacleModels.chevrolet; obstType = 'chevrolet'; }
  else if (type === 'HAZARD' && obstacleModels.cone) { model = obstacleModels.cone; obstType = 'cone'; }
  else if (type === 'SLOW_ZONE' && obstacleModels.cone2) { model = obstacleModels.cone2; obstType = 'cone2'; }

  if (model) {
    const targetH = obstType === 'chevrolet' ? 3.0 : 1.5;
    const mesh = createObstacleFromModel(model, targetH, obstType);
    group.add(mesh);
  } else {
    const geo = new THREE.ConeGeometry(0.4, 1.2, 8);
    const mat = new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: 0.7 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.6;
    mesh.castShadow = true;
    group.add(mesh);
  }

  return group;
}

function createPowerUp3D(type) {
  const color = CFG.powerUpColors[type] || 0x00e676;
  const group = new THREE.Group();
  const geo = new THREE.OctahedronGeometry(0.6, 0);
  const mat = new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: 0.4,
    metalness: 0.3, roughness: 0.2, transparent: true, opacity: 0.85,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 1.0;
  mesh.castShadow = true;
  group.add(mesh);
  group.userData.spinMesh = mesh;
  return group;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GAME STATE
// ═══════════════════════════════════════════════════════════════════════════════

const gameState = {
  currentScreen: 'loading',
  roomUid: null,
  isHost: false,
  isSpectator: false,
  vsAI: false,
  serverState: null,
  playerCars: {},
  obstacle3DMap: {},
  powerUp3DMap: {},
  myPlayerZ: 0,
  myPlayerX: 0,
  cameraInitialized: false,
};

// ═══════════════════════════════════════════════════════════════════════════════
//  MENU SCREEN LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

let roomRefreshInterval = null;

function showMenu() {
  gameState.currentScreen = 'menu';
  showScreen('menu');
  fetchRooms();
  roomRefreshInterval = setInterval(fetchRooms, 5000);
}

function hideMenu() {
  if (roomRefreshInterval) { clearInterval(roomRefreshInterval); roomRefreshInterval = null; }
}

async function fetchRooms() {
  try {
    const res = await api.getLiveRooms();
    const rooms = (res.data || []).filter(r => ['WAITING', 'BETTING', 'STARTED', 'RACING'].includes(r.status));
    renderRoomsList(rooms);
  } catch (e) {
    $('rooms-list').innerHTML = '<div class="text-dim text-sm" style="text-align:center;padding:1rem;">Failed to load rooms</div>';
  }
}

function renderRoomsList(rooms) {
  const list = $('rooms-list');
  if (rooms.length === 0) {
    list.innerHTML = '<div class="text-dim text-sm" style="text-align:center;padding:2rem;">No active rooms - Create one!</div>';
    return;
  }
  list.innerHTML = rooms.map(r => {
    const isWaiting = r.status === 'WAITING';
    const isBetting = r.status === 'BETTING';
    const statusClass = isWaiting ? 'status-waiting' : isBetting ? 'status-betting' : 'status-racing';
    const statusLabel = isWaiting ? 'WAITING' : isBetting ? 'BETTING' : 'LIVE';
    const players = r.players || [];
    const names = players.map(p => (p.user?.username || (p.playerAddress?.substring(0, 8) + '...'))).join(', ');

    return `
      <div class="room-card">
        <div class="room-info">
          <div class="room-uid">${r.roomUid.substring(0, 16)}...</div>
          <div class="room-meta">${players.length}/${r.maxPlayers} | ${names || 'Empty'}</div>
        </div>
        <span class="room-status ${statusClass}">${statusLabel}</span>
        ${isWaiting
          ? `<button class="btn btn-ghost" onclick="window._joinRoom('${r.roomUid}')">JOIN</button>`
          : `<button class="btn btn-ghost" onclick="window._watchRoom('${r.roomUid}')">WATCH</button>`
        }
      </div>
    `;
  }).join('');
}

function setMenuStatus(text, color = '#fb923c') {
  const el = $('menu-status');
  el.textContent = text;
  el.style.color = color;
}

async function createRoom() {
  try {
    setMenuStatus('Creating room...');
    if (!CFG.token) { setMenuStatus('No auth token!', '#ef4444'); return; }
    try {
      const balRes = await api.getPredictionBalance();
      if ((balRes?.data?.balanceOCT || 0) < 2) {
        setMenuStatus('Need 2+ OCT deposit. Visit Prediction page.', '#ef4444');
        return;
      }
    } catch { setMenuStatus('Cannot check balance', '#ef4444'); return; }

    const res = await api.createRoom('ENDLESS_RACE', 2, '1000000', new Date(Date.now() + 3600000).toISOString());
    if (res.success && res.data?.roomUid) {
      const roomUid = res.data.roomUid;
      setMenuStatus('Room created! Joining...');
      await ws.joinRoom(roomUid, CFG.carUid);
      hideMenu();
      showLobby(roomUid, true, false);
    }
  } catch (e) { setMenuStatus(e.message, '#ef4444'); }
}

async function createRoomVsAI() {
  try {
    setMenuStatus('Setting up AI match...');
    if (!CFG.token || !CFG.carUid) { setMenuStatus('Missing token or car!', '#ef4444'); return; }
    const res = await api.createRoomWithAI(CFG.carUid);
    if (res.success && res.data?.roomUid) {
      const roomUid = res.data.roomUid;
      setMenuStatus('Joining AI match...');
      await ws.joinRoom(roomUid, CFG.carUid);
      hideMenu();
      showLobby(roomUid, true, true);
    }
  } catch (e) { setMenuStatus(e.message, '#ef4444'); }
}

async function joinRoom(roomUid) {
  try {
    if (!CFG.token || !CFG.carUid) { setMenuStatus('Missing token or car!', '#ef4444'); return; }
    try {
      const balRes = await api.getPredictionBalance();
      if ((balRes?.data?.balanceOCT || 0) < 2) {
        setMenuStatus('Need 2+ OCT deposit.', '#ef4444');
        return;
      }
    } catch { setMenuStatus('Cannot check balance', '#ef4444'); return; }

    setMenuStatus('Joining room...');
    await ws.joinRoom(roomUid, CFG.carUid);
    hideMenu();
    showLobby(roomUid, false, false);
  } catch (e) { setMenuStatus(e.message, '#ef4444'); }
}

async function watchRoom(roomUid) {
  try {
    setMenuStatus('Connecting as spectator...');
    await ws.spectateJoin(roomUid);
    gameState.isSpectator = true;
    hideMenu();
    startRacing(roomUid);
    spectatorBadge.classList.add('show');
  } catch (e) { setMenuStatus(e.message, '#ef4444'); }
}

window._joinRoom = joinRoom;
window._watchRoom = watchRoom;

// ═══════════════════════════════════════════════════════════════════════════════
//  LOBBY SCREEN LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

function showLobby(roomUid, isHost, vsAI) {
  gameState.currentScreen = 'lobby';
  gameState.roomUid = roomUid;
  gameState.isHost = isHost;
  gameState.vsAI = vsAI;
  gameState.isSpectator = false;

  showScreen('lobby');
  $('lobby-room-id').textContent = `ROOM  ${roomUid.substring(0, 24)}...`;
  $('lobby-mode').textContent = 'ENDLESS_RACE';
  $('lobby-status').textContent = 'WAITING';
  $('lobby-status').style.color = '#fbbf24';
  $('lobby-players').innerHTML = '';
  $('betting-box').style.display = 'none';
  $('lobby-instruction').textContent = vsAI ? 'Starting AI match...' : 'Waiting for opponent... Auto-bet: 2 OCT on yourself';

  $('btn-ready').style.display = vsAI ? 'inline-block' : 'none';
  $('btn-cancel-room').style.display = (!vsAI && isHost) ? 'inline-block' : 'none';

  setupLobbyWS();

  ws.getRoomState(roomUid).then((room) => {
    $('lobby-mode').textContent = `${room.gameMode} | ${room.currentPlayers}/${room.maxPlayers} Players`;
    $('lobby-status').textContent = room.status;
    renderLobbyPlayers(room.players || []);
  }).catch(() => {});

  if (vsAI) {
    setTimeout(() => {
      ws.markReady(roomUid).then(() => {
        $('btn-ready').textContent = 'READY';
        $('btn-ready').disabled = true;
        $('lobby-instruction').textContent = 'Waiting for game to start...';
      }).catch(() => {});
    }, 800);
  }
}

function renderLobbyPlayers(players) {
  $('lobby-players').innerHTML = players.map((p, i) => {
    const addr = p.playerAddress || p.user?.address || '???';
    const short = addr.substring(0, 6) + '...' + addr.slice(-4);
    const ready = p.isReady;
    return `
      <div class="player-card" style="border-color: ${ready ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.08)'}">
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="width:10px;height:10px;border-radius:50%;background:#${CFG.playerColors[i % 4].toString(16).padStart(6, '0')};"></div>
          <span class="player-addr">${short}</span>
        </div>
        <span class="player-ready ${ready ? 'ready-yes' : 'ready-no'}">${ready ? 'READY' : 'WAITING'}</span>
      </div>
    `;
  }).join('');
}

function setupLobbyWS() {
  ws.off('LOBBY_UPDATE');
  ws.off('GAME_START');
  ws.off('BETTING_START');
  ws.off('BETTING_COUNTDOWN');
  ws.off('ROOM_CANCELLED');

  ws.on('LOBBY_UPDATE', (room) => {
    if (gameState.currentScreen !== 'lobby') return;
    $('lobby-mode').textContent = `${room.gameMode} | ${room.currentPlayers}/${room.maxPlayers} Players`;
    $('lobby-status').textContent = room.status;
    let color = '#fbbf24';
    if (room.status === 'COUNTDOWN') color = '#4ade80';
    else if (room.status === 'RACING') color = '#60a5fa';
    $('lobby-status').style.color = color;
    renderLobbyPlayers(room.players || []);
  });

  ws.on('BETTING_START', (data) => {
    if (gameState.currentScreen !== 'lobby') return;
    $('betting-box').style.display = 'block';
    $('lobby-status').textContent = 'BETTING';
    $('lobby-status').style.color = '#a78bfa';
    if (data.pool) {
      const poolOCT = (Number(BigInt(data.pool.totalPool || '0')) / 1e9).toFixed(2);
      $('betting-pool').textContent = `Pool: ${poolOCT} OCT`;
    }
  });

  ws.on('BETTING_COUNTDOWN', (data) => {
    if (gameState.currentScreen !== 'lobby') return;
    const s = data.secondsLeft;
    $('betting-timer').textContent = `${s}s`;
    $('betting-timer').style.color = s <= 10 ? '#ef4444' : s <= 30 ? '#fbbf24' : '#c084fc';
  });

  ws.on('GAME_START', (data) => {
    console.log('GAME_START received', data);
    startRacing(gameState.roomUid);
  });

  ws.on('ROOM_CANCELLED', () => {
    $('lobby-status').textContent = 'CANCELLED';
    $('lobby-status').style.color = '#ef4444';
    $('lobby-instruction').textContent = 'Room cancelled. All bets refunded.';
    setTimeout(() => showMenu(), 2000);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  RACING — MAIN 3D GAME LOOP
// ═══════════════════════════════════════════════════════════════════════════════

let racingActive = false;
let clientEliminated = false;

function startRacing(roomUid) {
  gameState.currentScreen = 'game';
  gameState.roomUid = roomUid;
  gameState.cameraInitialized = false;
  lastTrafficTime = 0;
  clientEliminated = false;
  const wastedOverlay = $('wasted-overlay');
  if (wastedOverlay) wastedOverlay.style.display = 'none';
  showScreen('game');
  clearGameObjects();
  racingActive = true;
  setupRacingWS();
}

// Client-side collision: traffic cars only (server handles obstacle collisions)
function checkClientCollisions() {
  if (clientEliminated || gameState.isSpectator) return;
  const myCar = gameState.playerCars[CFG.playerAddress];
  if (!myCar) return;

  // Check if server already marked us as finished
  const myServerPlayer = gameState.serverState?.players?.find(p => p.playerId === CFG.playerAddress);
  if (myServerPlayer?.isFinished) return;

  const playerBox = new THREE.Box3().setFromObject(myCar);
  const shrink = 0.35;
  playerBox.min.x += shrink;
  playerBox.max.x -= shrink;
  playerBox.min.z += shrink;
  playerBox.max.z -= shrink;

  for (const trafficCar of trafficState.cars) {
    const obsBox = new THREE.Box3().setFromObject(trafficCar);
    const size = obsBox.getSize(new THREE.Vector3());
    if (size.x > 10 || size.z > 10) continue; // skip oversized meshes
    if (playerBox.intersectsBox(obsBox)) {
      clientEliminated = true;
      const wastedOverlay = $('wasted-overlay');
      if (wastedOverlay) wastedOverlay.style.display = 'flex';
      return;
    }
  }
}

function clearGameObjects() {
  for (const id in gameState.playerCars) {
    scene.remove(gameState.playerCars[id]);
  }
  gameState.playerCars = {};
  for (const id in gameState.obstacle3DMap) {
    scene.remove(gameState.obstacle3DMap[id]);
  }
  gameState.obstacle3DMap = {};
  for (const id in gameState.powerUp3DMap) {
    scene.remove(gameState.powerUp3DMap[id]);
  }
  gameState.powerUp3DMap = {};
  clearTraffic();
}

function setupRacingWS() {
  ws.off('GAME_STATE');
  ws.off('GAME_END');

  ws.on('GAME_STATE', (state) => {
    gameState.serverState = state;
    if (state.status === 'FINISHED') {
      endRacing();
      return;
    }
    renderGameState(state);
  });

  ws.on('GAME_END', (result) => {
    gameState.endResult = result;
    setTimeout(() => endRacing(), 100);
  });
}

function renderGameState(state) {
  if (!state) return;

  // Determine focus player
  let focusPlayer;
  if (gameState.isSpectator) {
    focusPlayer = state.players.reduce((best, p) =>
      (!best || (p.position?.z || 0) > (best.position?.z || 0)) ? p : best, null);
  } else {
    focusPlayer = state.players.find(p => p.playerId === CFG.playerAddress);
  }

  if (focusPlayer) {
    gameState.myPlayerZ = focusPlayer.position.z;
    gameState.myPlayerX = focusPlayer.position.x;
  }

  // ── Render Players ──
  const activePlayers = new Set();
  state.players.forEach((player, idx) => {
    const id = player.playerId;
    activePlayers.add(id);

    if (!gameState.playerCars[id]) {
      const texKey = `carTex${(idx % 5) + 1}`;
      const color = CFG.playerColors[idx % CFG.playerColors.length];
      const car = createCarMesh(color, texKey);
      const isMe = !gameState.isSpectator && id === CFG.playerAddress;
      const shortAddr = id.substring(0, 6) + '...' + id.slice(-4);
      car.add(createNameTag(shortAddr, isMe));
      scene.add(car);
      gameState.playerCars[id] = car;
    }

    const car3D = gameState.playerCars[id];
    const targetX = player.position.x;
    const targetZ = -player.position.z;

    // Smooth lane change interpolation
    if (car3D.userData.prevX === undefined) car3D.userData.prevX = targetX;
    const prevX = car3D.userData.prevX;
    const smoothX = prevX + (targetX - prevX) * Math.min(1, CONFIG.laneChangeSpeed * 0.016);
    car3D.userData.prevX = smoothX;

    car3D.position.x = smoothX;
    car3D.position.y = 0.01;
    car3D.position.z = targetZ;

    // Car steering rotation
    const lateralSpeed = smoothX - prevX;
    const steerAngle = -lateralSpeed * 0.8;
    const currentSteer = car3D.userData.steer || 0;
    car3D.userData.steer = currentSteer + (steerAngle - currentSteer) * 0.3;
    if (car3D.children[0]) {
      car3D.children[0].rotation.y = Math.PI + car3D.userData.steer;
    }

    // Opacity for finished players
    car3D.traverse((c) => {
      if (c.isMesh && c.material) {
        c.material.opacity = player.isFinished ? 0.3 : 1.0;
        c.material.transparent = player.isFinished;
      }
    });
  });

  // Remove gone players
  for (const id in gameState.playerCars) {
    if (!activePlayers.has(id)) {
      scene.remove(gameState.playerCars[id]);
      delete gameState.playerCars[id];
    }
  }

  // ── Render Obstacles ──
  const activeObs = new Set();
  if (state.obstacles) {
    state.obstacles.forEach((obs) => {
      activeObs.add(obs.id);
      if (!gameState.obstacle3DMap[obs.id]) {
        const mesh = createObstacle3D(obs.type);
        scene.add(mesh);
        gameState.obstacle3DMap[obs.id] = mesh;
      }
      const m = gameState.obstacle3DMap[obs.id];
      m.position.x = obs.position.x;
      m.position.y = 0;
      m.position.z = -obs.position.z;
    });
  }
  for (const id in gameState.obstacle3DMap) {
    if (!activeObs.has(id)) {
      scene.remove(gameState.obstacle3DMap[id]);
      delete gameState.obstacle3DMap[id];
    }
  }

  // ── Render Power-Ups ──
  const activePU = new Set();
  if (state.powerUps) {
    state.powerUps.forEach((pu) => {
      if (pu.collected) return;
      activePU.add(pu.id);
      if (!gameState.powerUp3DMap[pu.id]) {
        const mesh = createPowerUp3D(pu.type);
        scene.add(mesh);
        gameState.powerUp3DMap[pu.id] = mesh;
      }
      const m = gameState.powerUp3DMap[pu.id];
      m.position.x = pu.position.x;
      m.position.y = 0;
      m.position.z = -pu.position.z;
      if (m.userData.spinMesh) {
        m.userData.spinMesh.rotation.y += 0.03;
        m.userData.spinMesh.position.y = 1.0 + Math.sin(Date.now() / 300) * 0.2;
      }
    });
  }
  for (const id in gameState.powerUp3DMap) {
    if (!activePU.has(id)) {
      scene.remove(gameState.powerUp3DMap[id]);
      delete gameState.powerUp3DMap[id];
    }
  }

  // ── Camera follow ──
  if (focusPlayer) {
    const carWorldZ = -focusPlayer.position.z;
    camera.position.x = 0;
    camera.position.y = 6;
    camera.position.z = carWorldZ + 10;
    camera.lookAt(new THREE.Vector3(0, 1, carWorldZ - 20));

    dirLight.position.set(5, 15, carWorldZ + 5);
    dirLight.target.position.set(0, 0, carWorldZ - 15);
  }

  // ── Track recycling ──
  recycleTrack(camera.position.z);

  // ── HUD Update ──
  if (focusPlayer) {
    $('hud-rank').textContent = `${focusPlayer.rank || '?'}${rankSuffix(focusPlayer.rank)}`;
    $('hud-speed').textContent = Math.floor(focusPlayer.speed || 0);
    $('hud-distance').textContent = `${Math.floor(focusPlayer.position.z)}m`;
  }
}

function rankSuffix(r) {
  if (!r) return '';
  if (r === 1) return 'st';
  if (r === 2) return 'nd';
  if (r === 3) return 'rd';
  return 'th';
}

// ═══════════════════════════════════════════════════════════════════════════════
//  RACING END → RESULTS
// ═══════════════════════════════════════════════════════════════════════════════

async function endRacing() {
  racingActive = false;
  clientEliminated = false;
  const wastedOverlay = $('wasted-overlay');
  if (wastedOverlay) wastedOverlay.style.display = 'none';
  gameState.currentScreen = 'result';
  showScreen('result');
  clearTraffic();

  ws.off('GAME_STATE');
  ws.off('GAME_END');
  if (gameState.isSpectator) {
    ws.spectateLeave(gameState.roomUid).catch(() => {});
    spectatorBadge.classList.remove('show');
  }

  try {
    const res = await api.getResult(gameState.roomUid);
    if (res.success && res.data) {
      renderResults(res.data);
    } else {
      $('result-winner').textContent = 'Failed to load results';
    }
  } catch (e) {
    $('result-winner').textContent = `Error: ${e.message}`;
  }
}

function renderResults(data) {
  const winner = data.winner || 'Unknown';
  $('result-winner').textContent = `Winner: ${winner.substring(0, 15)}...`;

  const rankings = data.rankings || [];
  $('result-rankings').innerHTML = rankings.map((r, i) => {
    const medal = i === 0 ? '&#129351;' : i === 1 ? '&#129352;' : i === 2 ? '&#129353;' : `${r.rank}.`;
    const addr = (r.playerId || '???').substring(0, 12) + '...';
    const dist = r.distance || 0;
    const time = ((r.finalTime || 0) / 1000).toFixed(1);
    return `
      <div class="rank-row ${i === 0 ? 'winner' : ''}">
        <div class="rank-num">${medal}</div>
        <div class="rank-addr">${addr}</div>
        <div class="rank-dist">${dist}m</div>
        <div class="rank-time">${time}s</div>
      </div>
    `;
  }).join('');

  if (data.signature) {
    $('signature-box').style.display = 'block';
    $('signature-value').textContent = data.signature.substring(0, 60) + '...';
  } else {
    $('signature-box').style.display = 'none';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PREDICTION PANEL
// ═══════════════════════════════════════════════════════════════════════════════

let predRefreshInterval = null;
let predBetting = false;

function openPrediction() {
  predictionPanel.classList.add('show');
  fetchPrediction();
  fetchPredBalance();
  predRefreshInterval = setInterval(() => { fetchPrediction(); fetchPredBalance(); }, 5000);
}

function closePrediction() {
  predictionPanel.classList.remove('show');
  if (predRefreshInterval) { clearInterval(predRefreshInterval); predRefreshInterval = null; }
}

async function fetchPredBalance() {
  try {
    const res = await api.getPredictionBalance();
    if (res.success) {
      const bal = (Number(res.data?.balanceMist || 0) / 1e9).toFixed(2);
      $('pred-balance').textContent = `Balance: ${bal} OCT`;
      $('pred-balance').style.color = Number(res.data?.balanceMist || 0) <= 0 ? '#ef4444' : '#a78bfa';
    }
  } catch {
    $('pred-balance').textContent = 'Balance: N/A';
  }
}

async function fetchPrediction() {
  try {
    const res = await api.getPredictionPool(gameState.roomUid);
    if (res.success) renderPrediction(res.data);
  } catch {
    $('pred-pool').textContent = 'Pool: not available';
  }
}

function renderPrediction(pool) {
  const totalOCT = (Number(pool.totalPool || 0) / 1e9).toFixed(2);
  $('pred-pool').textContent = `Pool: ${totalOCT} OCT`;

  const endsAt = pool.room?.bettingEndsAt ? new Date(pool.room.bettingEndsAt).getTime() : 0;
  const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
  let bettingClosed = false;
  if (endsAt && remaining > 0) {
    $('pred-window').textContent = `Betting closes in ${remaining}s`;
    $('pred-window').style.color = remaining <= 10 ? '#ef4444' : '#c084fc';
  } else if (endsAt) {
    $('pred-window').textContent = 'Betting closed';
    $('pred-window').style.color = '#ef4444';
    bettingClosed = true;
  } else {
    $('pred-window').textContent = '';
  }

  const players = pool.room?.players || [];
  const playerBets = pool.playerBets || {};
  const odds = pool.odds || {};

  $('pred-players').innerHTML = players.map((rp) => {
    const addr = rp.playerAddress || rp.user?.address || '';
    const name = rp.user?.username || addr.substring(0, 10) + '...';
    const playerOdds = odds[addr] ? odds[addr].toFixed(1) + 'x' : '--';
    const betCount = playerBets[addr]?.count || 0;

    return `
      <div class="pred-player-card">
        <div class="pred-player-name">${name}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span class="pred-odds">${playerOdds}</span>
          <span class="pred-bets">${betCount} bets</span>
        </div>
        ${(!pool.isSettled && !bettingClosed)
          ? `<button class="btn btn-bet" onclick="window._placeBet('${pool.id}', '${addr}', '${name}')">BET 2 OCT</button>`
          : ''
        }
      </div>
    `;
  }).join('');
}

window._placeBet = async (poolId, playerAddr, playerName) => {
  if (predBetting) return;
  predBetting = true;
  try {
    await api.placeBet(poolId, playerAddr, 2);
    $('pred-message').textContent = `+2 OCT on ${playerName}!`;
    $('pred-message').style.color = '#4ade80';
    fetchPrediction();
    fetchPredBalance();
  } catch (e) {
    $('pred-message').textContent = e.message;
    $('pred-message').style.color = '#ef4444';
  }
  predBetting = false;
  setTimeout(() => { $('pred-message').textContent = ''; }, 3000);
};

// ═══════════════════════════════════════════════════════════════════════════════
//  INPUT HANDLING
// ═══════════════════════════════════════════════════════════════════════════════

function sendLeft() {
  if (gameState.isSpectator || gameState.currentScreen !== 'game') return;
  ws.sendInput(gameState.roomUid, 'TURN_LEFT');
}

function sendRight() {
  if (gameState.isSpectator || gameState.currentScreen !== 'game') return;
  ws.sendInput(gameState.roomUid, 'TURN_RIGHT');
}

window.addEventListener('keydown', (e) => {
  if (gameState.currentScreen !== 'game') return;
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') sendLeft();
  if (e.code === 'ArrowRight' || e.code === 'KeyD') sendRight();
});

$('btn-left').addEventListener('pointerdown', (e) => { e.preventDefault(); sendLeft(); });
$('btn-right').addEventListener('pointerdown', (e) => { e.preventDefault(); sendRight(); });

let touchStartX = 0;
window.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
window.addEventListener('touchend', (e) => {
  if (gameState.currentScreen !== 'game') return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 40) {
    if (dx < 0) sendLeft(); else sendRight();
  }
}, { passive: true });

// ═══════════════════════════════════════════════════════════════════════════════
//  BUTTON EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════════════════════

$('btn-create-room').addEventListener('click', createRoom);
$('btn-vs-ai').addEventListener('click', createRoomVsAI);
$('btn-refresh-rooms').addEventListener('click', fetchRooms);

$('btn-ready').addEventListener('click', async () => {
  try {
    $('btn-ready').textContent = 'MARKING READY...';
    $('btn-ready').disabled = true;
    await ws.markReady(gameState.roomUid);
    $('btn-ready').textContent = 'READY';
    $('lobby-instruction').textContent = 'Waiting for other players...';
  } catch (e) {
    $('btn-ready').textContent = 'MARK READY';
    $('btn-ready').disabled = false;
    $('lobby-instruction').textContent = `Error: ${e.message}`;
  }
});

$('btn-cancel-room').addEventListener('click', async () => {
  try {
    $('btn-cancel-room').textContent = 'CANCELLING...';
    $('btn-cancel-room').disabled = true;
    await ws.cancelRoom(gameState.roomUid);
  } catch (e) {
    $('btn-cancel-room').textContent = 'CANCEL ROOM';
    $('btn-cancel-room').disabled = false;
  }
});

$('btn-leave-lobby').addEventListener('click', async () => {
  try { await ws.leaveRoom(gameState.roomUid); } catch {}
  showMenu();
});

$('hud-bet-btn').addEventListener('click', () => {
  if (predictionPanel.classList.contains('show')) closePrediction();
  else openPrediction();
});

$('pred-close').addEventListener('click', closePrediction);

$('btn-back-menu').addEventListener('click', () => {
  clearGameObjects();
  showMenu();
});

$('btn-back-app').addEventListener('click', () => {
  window.location.href = '/game';
});

// ═══════════════════════════════════════════════════════════════════════════════
//  RENDER LOOP
// ═══════════════════════════════════════════════════════════════════════════════

function animate() {
  requestAnimationFrame(animate);

  if (racingActive && gameState.serverState) {
    const now = performance.now() / 1000;
    const delta = lastTrafficTime ? Math.min(now - lastTrafficTime, 0.1) : 0.016;
    lastTrafficTime = now;
    const serverObstacles = Object.values(gameState.obstacle3DMap);
    const myPlayer = gameState.serverState.players?.find(p => p.playerId === CFG.playerAddress);
    const mySpeed = (myPlayer?.speed ?? gameState.serverState.players?.[0]?.speed ?? 50) * 0.3; // scale to m/s range
    updateTraffic(delta, mySpeed, camera.position.z, null, serverObstacles);
    checkClientCollisions();
  }

  renderer.render(scene, camera);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  showScreen('loading');

  await loadAssets(loadingBar, loadingText);
  initTrack();
  initWebSocket();

  await new Promise((r) => setTimeout(r, 500));

  animate();

  // ── Spectate mode: ?spectate=roomUid ──
  const spectateRoomUid = new URLSearchParams(window.location.search).get('spectate');
  if (spectateRoomUid) {
    gameState.isSpectator = true;
    gameState.roomUid = spectateRoomUid;
    ws.emit('SPECTATE_JOIN', { roomUid: spectateRoomUid }, (res) => {
      if (res?.success) {
        showScreen('game');
        racingActive = true;
        setupRacingWS();
        if (spectatorBadge) spectatorBadge.classList.add('show');
      } else {
        loadingText.textContent = 'Failed to join spectator session.';
      }
    });
    return;
  }

  const mode = localStorage.getItem('game_mode');
  if (mode === 'vs_ai') {
    showScreen('menu');
    gameState.currentScreen = 'menu';
    await createRoomVsAI();
  } else {
    showMenu();
  }
}

init().catch((e) => {
  console.error('Init error:', e);
  loadingText.textContent = `Error: ${e.message}`;
});
