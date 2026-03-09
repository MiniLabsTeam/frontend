/**
 * OneChain Racing 3D — Multiplayer
 *
 * Three.js renderer that consumes the SAME WebSocket events as the 2D Phaser game.
 * Backend, room system, game engine, and blockchain verification are untouched.
 *
 * Flow: Menu → Lobby → Racing (3D) → Results
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';

// ═══════════════════════════════════════════════════════════════════════════════
//  CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CFG = {
  // Backend — read from localStorage (set by Next.js page.jsx)
  apiBaseUrl: localStorage.getItem('backend_url') || 'http://localhost:3001/api',
  token: localStorage.getItem('auth_token') || '',
  playerAddress: localStorage.getItem('wallet_address') || '',
  carUid: localStorage.getItem('game_car_uid') || '',

  // Track layout (matches backend EndlessRaceEngine)
  trackWidth: 15,
  laneCount: 3,
  laneWidth: 5,
  lanes: [-5, 0, 5], // x positions for lanes 0, 1, 2

  // 3D Track
  roadWidth: 16,
  trackLength: 80,
  trackCount: 8,

  // 3D rendering
  cameraHeight: 7,
  cameraBehind: 12,
  cameraLookAhead: 18,

  // Assets
  assetPaths: {
    car: '/asset3d/Meshes/ARCADE - FREE Racing Car.fbx',
    track: '/asset3d/Track/street_road.glb',
    cone: '/asset3d/Obstacle/cone.glb',
    cone2: '/asset3d/Obstacle/cone2.glb',
    barrier: '/asset3d/Obstacle/barrier.glb',
    chevrolet: '/asset3d/Obstacle/1956_-_chevrolet_bel_air_nomad.glb',
    skybox: '/asset3d/HDRI_SKY/EveningSkyHDRI044B_1K_HDR.exr',
    carTex1: '/asset3d/Textures/Color Variations/AFRC_Tex_Col1.png',
    carTex2: '/asset3d/Textures/Color Variations/AFRC_Tex_Col2.png',
    carTex3: '/asset3d/Textures/Color Variations/AFRC_Tex_Col3.png',
    carTex4: '/asset3d/Textures/Color Variations/AFRC_Tex_Col4.png',
    carTex5: '/asset3d/Textures/Color Variations/AFRC_Tex_Col5.png',
  },

  // Car colors per player index
  playerColors: [0x00e676, 0x2979ff, 0xffea00, 0xff6d00],

  // Obstacle type → color fallback
  obstacleColors: {
    BARRIER: 0xd63031,
    HAZARD: 0xe17055,
    SLOW_ZONE: 0xfdcb6e,
  },

  // Power-up type → color
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

function isMobile() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
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
//  THREE.JS SETUP
// ═══════════════════════════════════════════════════════════════════════════════

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x8899aa, 80, 300);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, CFG.cameraHeight, CFG.cameraBehind);
camera.lookAt(0, 1, -CFG.cameraLookAhead);

// Lighting
scene.add(new THREE.AmbientLight(0x9999bb, 1.0));
const dirLight = new THREE.DirectionalLight(0xffeedd, 2.0);
dirLight.position.set(5, 15, 5);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.left = -20;
dirLight.shadow.camera.right = 20;
dirLight.shadow.camera.top = 40;
dirLight.shadow.camera.bottom = -40;
scene.add(dirLight);
scene.add(dirLight.target);
scene.add(new THREE.HemisphereLight(0xaaccff, 0x554433, 0.8));

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ═══════════════════════════════════════════════════════════════════════════════
//  ASSET LOADING
// ═══════════════════════════════════════════════════════════════════════════════

const fbxLoader = new FBXLoader();
const gltfLoader = new GLTFLoader();
const exrLoader = new EXRLoader();
const textureLoader = new THREE.TextureLoader();

let carModelTemplate = null;
let trackModel = null;
let trackModelSize = new THREE.Vector3();
let obstacleModels = { cone: null, cone2: null, barrier: null, chevrolet: null };
let carTextures = {};

let loadedCount = 0;
const totalAssets = 12;

function updateLoading(label) {
  loadedCount++;
  const pct = Math.min(100, Math.round((loadedCount / totalAssets) * 100));
  loadingBar.style.width = pct + '%';
  loadingText.textContent = label;
}

async function loadAssets() {
  // Skybox
  try {
    const envMap = await new Promise((res, rej) => {
      exrLoader.load(CFG.assetPaths.skybox, (tex) => { tex.mapping = THREE.EquirectangularReflectionMapping; res(tex); }, undefined, rej);
    });
    scene.environment = envMap;
    scene.background = envMap;
    updateLoading('Skybox loaded');
  } catch {
    scene.background = new THREE.Color(0x667799);
    updateLoading('Fallback sky');
  }

  // Car textures
  for (let i = 1; i <= 5; i++) {
    try {
      const key = `carTex${i}`;
      carTextures[key] = await new Promise((res, rej) => { textureLoader.load(CFG.assetPaths[key], res, undefined, rej); });
      carTextures[key].colorSpace = THREE.SRGBColorSpace;
    } catch {}
    updateLoading('Texture loaded');
  }

  // Car model
  try {
    carModelTemplate = await new Promise((res, rej) => { fbxLoader.load(CFG.assetPaths.car, res, undefined, rej); });
    updateLoading('Car model loaded');
  } catch {
    updateLoading('Car placeholder');
  }

  // Track model
  try {
    const gltf = await new Promise((res, rej) => { gltfLoader.load(CFG.assetPaths.track, res, undefined, rej); });
    trackModel = gltf.scene;
    new THREE.Box3().setFromObject(trackModel).getSize(trackModelSize);
    updateLoading('Track loaded');
  } catch {
    updateLoading('Track placeholder');
  }

  // Obstacle models
  for (const name of ['cone', 'cone2', 'barrier', 'chevrolet']) {
    try {
      const gltf = await new Promise((res, rej) => { gltfLoader.load(CFG.assetPaths[name], res, undefined, rej); });
      obstacleModels[name] = gltf.scene;
    } catch {}
    updateLoading('Obstacle loaded');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  3D WORLD — TRACK
// ═══════════════════════════════════════════════════════════════════════════════

const trackPieces = [];
let actualTrackLength = CFG.trackLength;

function createTrackPiece(zPos) {
  let piece;

  if (trackModel) {
    piece = new THREE.Group();
    const clone = trackModel.clone();
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const isZLong = size.z >= size.x;
    const modelLength = isZLong ? size.z : size.x;
    const modelWidth = isZLong ? size.x : size.z;
    const scaleZ = CFG.trackLength / Math.max(modelLength, 0.001);
    const scaleX = CFG.roadWidth / Math.max(modelWidth, 0.001);
    const scaleY = Math.min(scaleX, scaleZ);
    if (isZLong) clone.scale.set(scaleX, scaleY, scaleZ);
    else { clone.rotation.y = Math.PI / 2; clone.scale.set(scaleZ, scaleY, scaleX); }
    const newBox = new THREE.Box3().setFromObject(clone);
    const newCenter = newBox.getCenter(new THREE.Vector3());
    clone.position.x -= newCenter.x;
    clone.position.z -= newCenter.z;
    clone.position.y -= newBox.min.y;
    const finalSize = new THREE.Box3().setFromObject(clone).getSize(new THREE.Vector3());
    actualTrackLength = finalSize.z;
    clone.traverse((c) => { if (c.isMesh) { c.receiveShadow = true; } });
    piece.add(clone);
  } else {
    piece = new THREE.Group();
    actualTrackLength = CFG.trackLength;
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(CFG.roadWidth, CFG.trackLength + 0.5),
      new THREE.MeshStandardMaterial({ color: 0x444450, roughness: 0.85 })
    );
    road.rotation.x = -Math.PI / 2;
    road.receiveShadow = true;
    piece.add(road);
    // Lane dashes
    const dashMat = new THREE.MeshBasicMaterial({ color: 0x888888 });
    for (let i = 0; i < CFG.lanes.length - 1; i++) {
      const lx = (CFG.lanes[i] + CFG.lanes[i + 1]) / 2;
      for (let j = -CFG.trackLength / 2; j < CFG.trackLength / 2; j += 5) {
        const d = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 2.5), dashMat);
        d.rotation.x = -Math.PI / 2;
        d.position.set(lx, 0.01, j);
        piece.add(d);
      }
    }
    // Curbs
    for (const side of [-CFG.roadWidth / 2, CFG.roadWidth / 2]) {
      const curb = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.25, CFG.trackLength + 0.5),
        new THREE.MeshStandardMaterial({ color: 0xcc3333 })
      );
      curb.position.set(side, 0.12, 0);
      piece.add(curb);
    }
  }

  // Side ground
  for (const side of [-1, 1]) {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(30, actualTrackLength + 1),
      new THREE.MeshStandardMaterial({ color: 0x2a3a2a, roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(side * (CFG.roadWidth / 2 + 15), -0.05, 0);
    ground.receiveShadow = true;
    piece.add(ground);
  }

  piece.position.z = zPos;
  scene.add(piece);
  trackPieces.push(piece);
}

function initTrack() {
  createTrackPiece(actualTrackLength / 2);
  const step = actualTrackLength - 0.5;
  for (let i = 1; i < CFG.trackCount; i++) {
    createTrackPiece(actualTrackLength / 2 - i * step);
  }
}

function recycleTrack(cameraZ) {
  const step = actualTrackLength - 0.5;
  for (const p of trackPieces) {
    if (p.position.z > cameraZ + actualTrackLength) {
      const minZ = Math.min(...trackPieces.map(t => t.position.z));
      p.position.z = minZ - step;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  3D WORLD — CAR CREATION
// ═══════════════════════════════════════════════════════════════════════════════

function createCarMesh(colorHex, textureKey) {
  const container = new THREE.Group();
  let carMesh;

  if (carModelTemplate) {
    carMesh = carModelTemplate.clone();
    const box = new THREE.Box3().setFromObject(carMesh);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const s = 3.5 / Math.max(size.x, size.y, size.z);
    carMesh.scale.setScalar(s);
    carMesh.position.sub(center.multiplyScalar(s));
    const tex = carTextures[textureKey] || carTextures.carTex1 || null;
    carMesh.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          map: tex,
          color: tex ? 0xcccccc : colorHex,
          metalness: 0.6,
          roughness: 0.35,
          envMap: scene.environment,
          envMapIntensity: 0.3,
        });
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  } else {
    // Procedural car
    carMesh = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.6, roughness: 0.35 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 3.8), bodyMat);
    body.position.y = 0.45;
    body.castShadow = true;
    carMesh.add(body);
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, opacity: 0.6, transparent: true });
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 1.8), glassMat);
    cabin.position.set(0, 1.0, -0.2);
    carMesh.add(cabin);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.08, 1.85), bodyMat);
    roof.position.set(0, 1.34, -0.2);
    carMesh.add(roof);
    // Wheels
    const wGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 12);
    const wMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    for (const [wx, wy, wz] of [[-0.9,0.3,1.1],[0.9,0.3,1.1],[-0.9,0.3,-1.1],[0.9,0.3,-1.1]]) {
      const w = new THREE.Mesh(wGeo, wMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, wy, wz);
      carMesh.add(w);
    }
    // Lights
    const hlMat = new THREE.MeshStandardMaterial({ color: 0xffffaa, emissive: 0xffffaa, emissiveIntensity: 0.5 });
    const hlGeo = new THREE.BoxGeometry(0.3, 0.2, 0.05);
    for (const xo of [-0.6, 0.6]) {
      const hl = new THREE.Mesh(hlGeo, hlMat);
      hl.position.set(xo, 0.5, -1.92);
      carMesh.add(hl);
    }
    const tlMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.4 });
    for (const xo of [-0.6, 0.6]) {
      const tl = new THREE.Mesh(hlGeo, tlMat);
      tl.position.set(xo, 0.5, 1.92);
      carMesh.add(tl);
    }
  }

  container.add(carMesh);
  return container;
}

// Name tag above car
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

// ═══════════════════════════════════════════════════════════════════════════════
//  3D WORLD — OBSTACLE CREATION
// ═══════════════════════════════════════════════════════════════════════════════

function createObstacle3D(type, size) {
  const group = new THREE.Group();
  const color = CFG.obstacleColors[type] || 0xe17055;

  // Map backend obstacle types to 3D models
  let model = null;
  if (type === 'BARRIER' && obstacleModels.barrier) model = obstacleModels.barrier;
  else if (type === 'HAZARD' && obstacleModels.cone) model = obstacleModels.cone;
  else if (type === 'SLOW_ZONE' && obstacleModels.cone2) model = obstacleModels.cone2;

  if (model) {
    const clone = model.clone();
    clone.updateMatrixWorld(true);
    group.add(clone);
    group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(group);
    const s = box.getSize(new THREE.Vector3());
    const targetH = (size?.z || 2) * 0.5;
    const scale = targetH / Math.max(s.y, 0.001);
    group.scale.setScalar(scale);
    group.updateMatrixWorld(true);
    const nb = new THREE.Box3().setFromObject(group);
    const nc = nb.getCenter(new THREE.Vector3());
    group.position.x -= nc.x;
    group.position.z -= nc.z;
    group.position.y -= nb.min.y;
    // Clamp
    const fs = new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3());
    const maxA = 5.0;
    const fm = Math.max(fs.x, fs.y, fs.z);
    if (fm > maxA) group.scale.multiplyScalar(maxA / fm);
    clone.traverse((c) => { if (c.isMesh) c.castShadow = true; });
  } else {
    // Fallback box
    const geo = new THREE.BoxGeometry(
      (size?.x || 2) * 0.5,
      (size?.z || 2) * 0.5,
      (size?.z || 2) * 0.5
    );
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = (size?.z || 2) * 0.25;
    mesh.castShadow = true;
    group.add(mesh);
  }

  return group;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  3D WORLD — POWER-UP CREATION
// ═══════════════════════════════════════════════════════════════════════════════

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

  // From GAME_STATE WebSocket events
  serverState: null,

  // 3D objects map
  playerCars: {},       // { playerId: THREE.Group }
  obstacle3DMap: {},    // { obstacleId: THREE.Group }
  powerUp3DMap: {},     // { powerUpId: THREE.Group }

  // Tracking camera focus
  myPlayerZ: 0,
  myPlayerX: 0,
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

    // Check balance for PvP
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
    // Balance check
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

// Expose to onclick handlers
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

  // Buttons
  $('btn-ready').style.display = vsAI ? 'inline-block' : 'none';
  $('btn-cancel-room').style.display = (!vsAI && isHost) ? 'inline-block' : 'none';

  setupLobbyWS();

  // Fetch initial state
  ws.getRoomState(roomUid).then((room) => {
    $('lobby-mode').textContent = `${room.gameMode} | ${room.currentPlayers}/${room.maxPlayers} Players`;
    $('lobby-status').textContent = room.status;
    renderLobbyPlayers(room.players || []);
  }).catch(() => {});

  // AI auto-ready
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
  // Clean up old listeners
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

function startRacing(roomUid) {
  gameState.currentScreen = 'game';
  gameState.roomUid = roomUid;
  showScreen('game');

  // Clear previous 3D objects
  clearGameObjects();

  racingActive = true;
  setupRacingWS();
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
    // Convert backend coords to 3D world coords
    // Backend: x is lane position, z is distance forward
    // 3D: x = same, z = negative of backend z (forward is -z in Three.js if camera looks -z)
    // We'll use z = -backend.z so that farther distance = more negative z
    car3D.position.x = player.position.x;
    car3D.position.y = 0.01;
    car3D.position.z = -player.position.z;

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
        const mesh = createObstacle3D(obs.type, obs.size);
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
      // Spin animation
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
    const targetCamX = focusPlayer.position.x * 0.5;
    const targetCamZ = -focusPlayer.position.z + CFG.cameraBehind;
    camera.position.x += (targetCamX - camera.position.x) * 0.08;
    camera.position.y = CFG.cameraHeight;
    camera.position.z += (targetCamZ - camera.position.z) * 0.08;

    const lookTarget = new THREE.Vector3(
      focusPlayer.position.x * 0.3,
      1,
      -focusPlayer.position.z - CFG.cameraLookAhead
    );
    camera.lookAt(lookTarget);

    // Move directional light with player
    dirLight.position.set(focusPlayer.position.x + 5, 15, -focusPlayer.position.z + 5);
    dirLight.target.position.set(focusPlayer.position.x, 0, -focusPlayer.position.z);
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
  gameState.currentScreen = 'result';
  showScreen('result');

  ws.off('GAME_STATE');
  ws.off('GAME_END');
  if (gameState.isSpectator) {
    ws.spectateLeave(gameState.roomUid).catch(() => {});
    spectatorBadge.classList.remove('show');
  }

  // Fetch result
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

  // Betting window
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

// Mobile controls
$('btn-left').addEventListener('pointerdown', (e) => { e.preventDefault(); sendLeft(); });
$('btn-right').addEventListener('pointerdown', (e) => { e.preventDefault(); sendRight(); });

// Touch swipe
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
  try {
    await ws.leaveRoom(gameState.roomUid);
  } catch {}
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
  renderer.render(scene, camera);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  showScreen('loading');

  // Load 3D assets
  await loadAssets();

  // Build track
  initTrack();

  // Initialize WebSocket
  initWebSocket();

  // Wait a moment for WS to connect
  await new Promise((r) => setTimeout(r, 500));

  // Start render loop
  animate();

  // Check if launched from game page with a specific mode
  const mode = localStorage.getItem('game_mode');
  if (mode === 'vs_ai') {
    // Auto-create AI room
    showScreen('menu');
    gameState.currentScreen = 'menu';
    await createRoomVsAI();
  } else {
    // Show menu (for multiplayer / general)
    showMenu();
  }
}

init().catch((e) => {
  console.error('Init error:', e);
  loadingText.textContent = `Error: ${e.message}`;
});
