/**
 * watch.js — Endless Race Live Spectator
 *
 * Loads 3D engine, connects to Socket.io, shows session list,
 * then renders the watched player's game state in real-time.
 */

import * as THREE from 'three';
import {
  WEB3, CONFIG, scene, camera, renderer, clock, dirLight,
  loadAssets, createCarMesh, createProceduralCar,
  trackPieces, actualTrackLength, initTrack, recycleTrack,
} from './engine3d.js';

// ─── DOM ────────────────────────────────────────────────────────────────────
const loadingScreen  = document.getElementById('loading-screen');
const loadingBar     = document.getElementById('loading-bar');
const loadingText    = document.getElementById('loading-text');
const sessionScreen  = document.getElementById('session-screen');
const sessionsList   = document.getElementById('sessions-list');
const noSessions     = document.getElementById('no-sessions');
const refreshBtn     = document.getElementById('refresh-btn');
const endedScreen    = document.getElementById('ended-screen');
const backToListBtn  = document.getElementById('back-to-list-btn');
const hud            = document.getElementById('hud');
const hudScore       = document.getElementById('hud-score');
const hudSpeed       = document.getElementById('hud-speed');
const hudDistance    = document.getElementById('hud-distance');
const watchBadge     = document.getElementById('watch-badge');
const watchPlayerName = document.getElementById('watch-player-name');

// ─── State ───────────────────────────────────────────────────────────────────
let watchSocket = null;
let currentSessionId = null;
let watchedPlayerCar = null;
const spectatorObstacles = {}; // id -> THREE.Object3D
let animating = false;

// ─── Resolve backend URL (fallback to same-host port 3000) ───────────────────
function resolveBackendUrl() {
  if (WEB3.backendUrl) return WEB3.backendUrl;
  // Fallback: same hostname, port 3000
  return `${window.location.protocol}//${window.location.hostname}:3000/api`;
}

// ─── Socket ──────────────────────────────────────────────────────────────────
function connectSocket() {
  if (!WEB3.authToken) {
    // Show login warning in session list
    noSessions.innerHTML = 'Please <a href="/" style="color:#fb923c">login</a> to watch live sessions.';
    noSessions.style.display = 'block';
    return;
  }
  const backendUrl = resolveBackendUrl();
  const baseUrl = backendUrl.replace('/api', '');
  watchSocket = window.io(baseUrl, {
    auth: { token: WEB3.authToken },
    transports: ['websocket', 'polling'],
  });

  watchSocket.on('connect', () => {
    console.log('[Watch] Socket connected');
    // Join the endless lobby to receive session updates
    watchSocket.emit('ENDLESS_LOBBY_JOIN', {}, () => {});
  });

  watchSocket.on('ENDLESS_SESSION_STARTED', (data) => {
    // If we're on the session list, add the new card
    if (sessionScreen.classList.contains('show')) {
      fetchAndShowSessions();
    }
  });

  watchSocket.on('ENDLESS_SESSION_ENDED', (data) => {
    if (data.sessionId === currentSessionId) {
      showEnded();
    } else if (sessionScreen.classList.contains('show')) {
      fetchAndShowSessions();
    }
  });

  watchSocket.on('ENDLESS_STATE', (data) => {
    applyState(data);
  });

  watchSocket.on('connect_error', (e) => console.warn('[Watch] Socket error:', e.message));
}

// ─── Session List ─────────────────────────────────────────────────────────────
async function fetchAndShowSessions() {
  if (!WEB3.authToken) return;
  const backendUrl = resolveBackendUrl();
  const headers = { 'Authorization': `Bearer ${WEB3.authToken}` };

  const [endlessRes, multiRes] = await Promise.allSettled([
    fetch(`${backendUrl}/game/endless/sessions`, { headers }).then(r => r.json()),
    fetch(`${backendUrl}/game/rooms/live`, { headers }).then(r => r.json()),
  ]);

  const endlessSessions = (endlessRes.status === 'fulfilled' ? endlessRes.value.data : null) || [];
  const multiRooms = (multiRes.status === 'fulfilled' ? multiRes.value.data : null) || [];

  renderSessionList(endlessSessions, multiRooms);
}

function renderSessionList(endlessSessions, multiRooms) {
  for (const card of sessionsList.querySelectorAll('.session-card')) card.remove();

  const totalCount = (endlessSessions?.length || 0) + (multiRooms?.length || 0);
  if (totalCount === 0) {
    noSessions.style.display = 'block';
    return;
  }
  noSessions.style.display = 'none';

  // ── Endless sessions ──
  for (const s of (endlessSessions || [])) {
    const card = document.createElement('div');
    card.className = 'session-card';
    const shortAddr = s.playerAddress
      ? `${s.playerAddress.slice(0, 6)}...${s.playerAddress.slice(-4)}`
      : '???';
    const name = s.username || shortAddr;
    const elapsed = Math.floor((Date.now() - s.startedAt) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    const timeStr = `${mins}m ${secs}s`;
    card.innerHTML = `
      <div>
        <div class="player-name">🏁 ${name} <span style="font-size:0.7rem;color:rgba(255,255,255,0.35);margin-left:6px;">ENDLESS</span></div>
        <div class="session-stats">Score: ${s.score.toLocaleString()} &nbsp;·&nbsp; ${Math.round(s.distance)}m &nbsp;·&nbsp; ${s.speed} km/h &nbsp;·&nbsp; ${timeStr}</div>
      </div>
      <div class="watch-badge">WATCH</div>
    `;
    card.addEventListener('click', () => startWatching(s.sessionId, name));
    sessionsList.appendChild(card);
  }

  // ── Multiplayer rooms ──
  for (const r of (multiRooms || [])) {
    if (!['STARTED', 'RACING', 'BETTING'].includes(r.status)) continue;
    const card = document.createElement('div');
    card.className = 'session-card';
    const playerNames = (r.players || [])
      .map(p => p.user?.username || p.playerAddress?.slice(0, 6) + '...')
      .join(' vs ');
    const mode = r.gameMode?.replace('_', ' ') || 'RACE';
    card.innerHTML = `
      <div>
        <div class="player-name">🏎 ${playerNames || r.roomUid?.slice(0, 12)} <span style="font-size:0.7rem;color:rgba(255,255,255,0.35);margin-left:6px;">${mode}</span></div>
        <div class="session-stats">${r.status} &nbsp;·&nbsp; ${r.players?.length || 0} players</div>
      </div>
      <div class="watch-badge">WATCH</div>
    `;
    card.addEventListener('click', () => {
      window.location.href = `multiplayer.html?spectate=${encodeURIComponent(r.roomUid)}`;
    });
    sessionsList.appendChild(card);
  }
}

// ─── Start Watching ───────────────────────────────────────────────────────────
function startWatching(sessionId, playerName) {
  currentSessionId = sessionId;

  // Show 3D scene
  sessionScreen.classList.remove('show');
  hud.classList.add('show');
  watchBadge.classList.add('show');
  watchPlayerName.textContent = playerName;
  watchPlayerName.classList.add('show');

  // Reset track
  const step = actualTrackLength - 0.5;
  for (let i = 0; i < trackPieces.length; i++) {
    trackPieces[i].position.z = actualTrackLength / 2 - i * step;
  }

  // Create watched player's car
  if (!watchedPlayerCar) {
    watchedPlayerCar = createCarMesh(0x00e676, 'carTex1');
    watchedPlayerCar.position.set(CONFIG.lanes[1], 0.01, 0);
    scene.add(watchedPlayerCar);
  }

  // Join the session room, get last state
  watchSocket.emit('ENDLESS_SPECTATE', { sessionId }, (res) => {
    if (res?.lastState) applyState(res.lastState);
  });

  if (!animating) {
    animating = true;
    animate();
  }
}

// ─── Apply State from Socket ──────────────────────────────────────────────────
function applyState(data) {
  if (!watchedPlayerCar) return;

  // Move player car
  watchedPlayerCar.position.x = data.playerX;
  watchedPlayerCar.position.y = 0.01;

  // Camera follows laterally
  camera.position.x += (data.playerX * 0.4 - camera.position.x) * 0.3;

  // Light follows player
  dirLight.position.set(data.playerX + 5, 15, 5);
  dirLight.target.position.set(data.playerX, 0, -15);

  // Sync track pieces
  if (data.trackZ && data.trackZ.length === trackPieces.length) {
    for (let i = 0; i < trackPieces.length; i++) {
      trackPieces[i].position.z = data.trackZ[i];
    }
  }

  // Update HUD
  hudScore.textContent = (data.score || 0).toLocaleString();
  hudSpeed.textContent = Math.round((data.speed || 0) * 3.6);
  hudDistance.textContent = Math.round(data.distance || 0) + 'm';

  // Sync obstacles
  const received = new Set();
  for (const obs of (data.obstacles || [])) {
    received.add(obs.id);
    if (!spectatorObstacles[obs.id]) {
      // Create a simple mesh for this obstacle
      let mesh;
      if (obs.isTraffic) {
        mesh = createProceduralCar();
        if (obs.isOncoming) mesh.rotation.y = Math.PI;
      } else {
        // Simple colored box for static obstacles
        const geo = new THREE.BoxGeometry(1.2, 1.4, 1.2);
        const mat = new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: 0.7 });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = 0.7;
        mesh.castShadow = true;
      }
      const group = new THREE.Group();
      group.add(mesh);
      scene.add(group);
      spectatorObstacles[obs.id] = group;
    }
    spectatorObstacles[obs.id].position.set(obs.x, 0, obs.z);
  }

  // Remove obstacles no longer in view
  for (const id of Object.keys(spectatorObstacles)) {
    if (!received.has(Number(id))) {
      scene.remove(spectatorObstacles[id]);
      delete spectatorObstacles[id];
    }
  }
}

// ─── Session Ended ────────────────────────────────────────────────────────────
function showEnded() {
  hud.classList.remove('show');
  watchBadge.classList.remove('show');
  watchPlayerName.classList.remove('show');
  endedScreen.classList.add('show');
  currentSessionId = null;

  // Clean up obstacles
  for (const mesh of Object.values(spectatorObstacles)) scene.remove(mesh);
  for (const k of Object.keys(spectatorObstacles)) delete spectatorObstacles[k];
  if (watchedPlayerCar) {
    scene.remove(watchedPlayerCar);
    watchedPlayerCar = null;
  }
}

// ─── Render Loop ──────────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

// ─── Button Handlers ──────────────────────────────────────────────────────────
refreshBtn.addEventListener('click', fetchAndShowSessions);
backToListBtn.addEventListener('click', () => {
  endedScreen.classList.remove('show');
  sessionScreen.classList.add('show');
  fetchAndShowSessions();
});

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  await loadAssets(loadingBar, loadingText);

  initTrack();

  loadingScreen.classList.add('hidden');
  setTimeout(() => {
    loadingScreen.style.display = 'none';
    sessionScreen.classList.add('show');
  }, 600);

  connectSocket();
  fetchAndShowSessions();

  // Start render loop immediately (shows track in background)
  animate();
}

init();
