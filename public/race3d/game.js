import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';

// ─── Web3 Integration: Read localStorage ────────────────────────────────────
const WEB3 = {
  walletAddress: localStorage.getItem('wallet_address') || '',
  backendUrl: localStorage.getItem('backend_url') || '',
  authToken: localStorage.getItem('auth_token') || '',
  carData: (() => {
    try { return JSON.parse(localStorage.getItem('game_car_data') || '{}'); }
    catch { return {}; }
  })(),
};

// Map car stats (0-100) to gameplay modifiers
function applyCarStats(carData) {
  const speed = carData.baseSpeed || 50;
  const accel = carData.baseAcceleration || 50;
  const handling = carData.baseHandling || 50;
  return {
    startSpeed: 30 + (speed / 100) * 20,          // 30-50
    maxSpeed: 80 + (speed / 100) * 40,             // 80-120
    speedIncrement: 0.15 + (accel / 100) * 0.25,   // 0.15-0.40
    laneChangeSpeed: 6 + (handling / 100) * 6,      // 6-12
  };
}
const carMods = applyCarStats(WEB3.carData);

// ─── Config ─────────────────────────────────────────────────────────────────
const CONFIG = {
  lanes: [-4.5, -1.5, 1.5, 4.5],    // 4 lane positions (x)
  roadWidth: 18,                      // total road width (wider road)
  trackLength: 80,                    // length of one track piece (Z)
  trackCount: 8,                      // number of track pieces to recycle
  startSpeed: carMods.startSpeed,     // affected by car baseSpeed
  maxSpeed: carMods.maxSpeed,         // affected by car baseSpeed
  speedIncrement: carMods.speedIncrement, // affected by car baseAcceleration
  obstacleInterval: 1.5,             // seconds between obstacle spawns
  minObstacleInterval: 0.5,          // minimum spawn interval
  spawnDistance: 180,                 // how far ahead to spawn obstacles
  despawnDistance: 20,                // how far behind to remove obstacles
  laneChangeSpeed: carMods.laneChangeSpeed, // affected by car baseHandling
};

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

// ─── Three.js Setup ─────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
renderer.setClearColor(0xc8a882, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
// Lighter fog that matches the sky, not pitch black
scene.fog = new THREE.Fog(0x8899aa, 80, 300);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 6, 10);
camera.lookAt(0, 1, -20);

const clock = new THREE.Clock();

// ─── Lighting ───────────────────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0x9999bb, 1.0);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffeedd, 2.0);
dirLight.position.set(5, 15, 5);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.left = -20;
dirLight.shadow.camera.right = 20;
dirLight.shadow.camera.top = 40;
dirLight.shadow.camera.bottom = -40;
dirLight.shadow.camera.near = 1;
dirLight.shadow.camera.far = 60;
scene.add(dirLight);
scene.add(dirLight.target);

const hemiLight = new THREE.HemisphereLight(0xaaccff, 0x554433, 0.8);
scene.add(hemiLight);

// ─── Asset Loading ──────────────────────────────────────────────────────────
const fbxLoader = new FBXLoader();
const gltfLoader = new GLTFLoader();
const exrLoader = new EXRLoader();
const textureLoader = new THREE.TextureLoader();

let carModel = null;
let trackModel = null;
let trackModelSize = new THREE.Vector3();
let obstacleModels = { cone: null, cone2: null, barrier: null, chevrolet: null };
let carTextures = {};

const assetPaths = {
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
  carEnv: '/asset3d/Textures/AFRC_Env_Mat.png',
  carEmission: '/asset3d/Textures/AFRC_Tex_Emission.png',
};

let loadedCount = 0;
const totalAssets = 12;

function updateLoadingProgress(label) {
  loadedCount++;
  const pct = Math.min(100, Math.round((loadedCount / totalAssets) * 100));
  loadingBar.style.width = pct + '%';
  loadingText.textContent = label;
}

// ─── Track pieces & obstacles ───────────────────────────────────────────────
const trackPieces = [];
const obstacles = [];

// ─── Load all assets ────────────────────────────────────────────────────────
async function loadAssets() {
  // Load skybox
  try {
    const envMap = await new Promise((resolve, reject) => {
      exrLoader.load(assetPaths.skybox, (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        resolve(texture);
      }, undefined, reject);
    });
    scene.environment = envMap;
    scene.background = envMap;
    updateLoadingProgress('Skybox loaded');
  } catch (e) {
    console.warn('EXR skybox failed, using gradient fallback', e);
    scene.background = new THREE.Color(0x667799);
    updateLoadingProgress('Using fallback sky');
  }

  // Load car textures
  const texNames = ['carTex1', 'carTex2', 'carTex3', 'carTex4', 'carTex5'];
  for (const name of texNames) {
    try {
      carTextures[name] = await new Promise((resolve, reject) => {
        textureLoader.load(assetPaths[name], resolve, undefined, reject);
      });
      carTextures[name].colorSpace = THREE.SRGBColorSpace;
    } catch (e) {
      console.warn(`Failed to load ${name}`, e);
    }
    updateLoadingProgress(`Texture loaded`);
  }

  try {
    carTextures.env = await new Promise((resolve, reject) => {
      textureLoader.load(assetPaths.carEnv, resolve, undefined, reject);
    });
    carTextures.emission = await new Promise((resolve, reject) => {
      textureLoader.load(assetPaths.carEmission, resolve, undefined, reject);
    });
  } catch (e) {
    console.warn('Env/emission textures failed', e);
  }

  // Load car model
  try {
    carModel = await new Promise((resolve, reject) => {
      fbxLoader.load(assetPaths.car, resolve, undefined, reject);
    });
    const box = new THREE.Box3().setFromObject(carModel);
    const size = box.getSize(new THREE.Vector3());
    console.log('Car model size:', size);
    updateLoadingProgress('Car model loaded');
  } catch (e) {
    console.error('Car model failed', e);
    updateLoadingProgress('Car placeholder');
  }

  // Load track model
  try {
    const gltf = await new Promise((resolve, reject) => {
      gltfLoader.load(assetPaths.track, resolve, undefined, reject);
    });
    trackModel = gltf.scene;
    const box = new THREE.Box3().setFromObject(trackModel);
    box.getSize(trackModelSize);
    console.log('Track model size:', trackModelSize);
    console.log('Track model box:', box);
    updateLoadingProgress('Track loaded');
  } catch (e) {
    console.error('Track model failed', e);
    updateLoadingProgress('Track placeholder');
  }

  // Load obstacle models
  for (const name of ['cone', 'cone2', 'barrier', 'chevrolet']) {
    try {
      const gltf = await new Promise((resolve, reject) => {
        gltfLoader.load(assetPaths[name], resolve, undefined, reject);
      });
      obstacleModels[name] = gltf.scene;
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const s = box.getSize(new THREE.Vector3());
      console.log(`Obstacle ${name} size:`, s);
    } catch (e) {
      console.warn(`Obstacle ${name} failed`, e);
    }
    updateLoadingProgress(`Obstacle loaded`);
  }

  console.log('All assets loaded!');
}

// ─── Create Player Car ──────────────────────────────────────────────────────
let playerCar = null;

function createPlayerCar() {
  if (carModel) {
    playerCar = carModel.clone();
    const box = new THREE.Box3().setFromObject(playerCar);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const desiredLength = 3.5;
    const scale = desiredLength / maxDim;
    playerCar.scale.setScalar(scale);

    // Center the model on its origin
    playerCar.position.sub(center.multiplyScalar(scale));

    // Apply texture — try keeping original FBX materials first, only add color map
    playerCar.traverse((child) => {
      if (child.isMesh) {
        // If the FBX already has a material, enhance it instead of replacing
        if (child.material && child.material.isMeshPhongMaterial) {
          // Convert Phong to Standard for better PBR look
          const oldMat = child.material;
          child.material = new THREE.MeshStandardMaterial({
            map: carTextures.carTex1 || oldMat.map,
            color: oldMat.color || new THREE.Color(0xcccccc),
            metalness: 0.6,
            roughness: 0.35,
            envMap: scene.environment,
            envMapIntensity: 0.3,
          });
        } else if (carTextures.carTex1) {
          child.material = new THREE.MeshStandardMaterial({
            map: carTextures.carTex1,
            color: new THREE.Color(0xcccccc),
            metalness: 0.6,
            roughness: 0.35,
            envMap: scene.environment,
            envMapIntensity: 0.3,
          });
        }
        // Only apply emission to tail lights (emissive very subtle)
        if (carTextures.emission && child.material) {
          child.material.emissiveMap = carTextures.emission;
          child.material.emissive = new THREE.Color(0xff3300);
          child.material.emissiveIntensity = 0.15;
        }
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  } else {
    // Placeholder car
    const group = new THREE.Group();
    const bodyGeo = new THREE.BoxGeometry(1.8, 0.6, 3.5);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff6600, metalness: 0.6, roughness: 0.3 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.5;
    body.castShadow = true;
    group.add(body);

    const topGeo = new THREE.BoxGeometry(1.4, 0.5, 1.8);
    const top = new THREE.Mesh(topGeo, bodyMat);
    top.position.set(0, 1.0, -0.2);
    top.castShadow = true;
    group.add(top);

    playerCar = group;
  }

  // Wrap in a container for easy positioning
  const container = new THREE.Group();
  container.add(playerCar);
  container.position.set(CONFIG.lanes[1], 0.01, 0);
  scene.add(container);
  playerCar = container;
}

// ─── Create Track Pieces ────────────────────────────────────────────────────
// We measure actual track length after first creation so recycling is seamless
let actualTrackLength = CONFIG.trackLength;

function createTrackPiece(zPos) {
  let piece;

  if (trackModel) {
    piece = new THREE.Group();
    const clone = trackModel.clone();

    // Measure the original model
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());

    // Determine which axis is "length" (longest horizontal) and which is "width"
    const isZLong = size.z >= size.x;
    const modelLength = isZLong ? size.z : size.x;
    const modelWidth = isZLong ? size.x : size.z;

    // Scale to fit our road dimensions
    const scaleZ = CONFIG.trackLength / Math.max(modelLength, 0.001);
    const scaleX = CONFIG.roadWidth / Math.max(modelWidth, 0.001);
    const scaleY = Math.min(scaleX, scaleZ);

    if (isZLong) {
      clone.scale.set(scaleX, scaleY, scaleZ);
    } else {
      clone.rotation.y = Math.PI / 2;
      clone.scale.set(scaleZ, scaleY, scaleX);
    }

    // Re-center after scaling
    const newBox = new THREE.Box3().setFromObject(clone);
    const newCenter = newBox.getCenter(new THREE.Vector3());
    clone.position.x -= newCenter.x;
    clone.position.z -= newCenter.z;
    clone.position.y -= newBox.min.y;

    // Measure actual length after scaling for seamless tiling
    const finalBox = new THREE.Box3().setFromObject(clone);
    const finalSize = finalBox.getSize(new THREE.Vector3());
    actualTrackLength = finalSize.z;

    clone.traverse((child) => {
      if (child.isMesh) {
        child.receiveShadow = true;
        child.castShadow = false;
      }
    });

    piece.add(clone);

    // Add side ground panels to fill the black areas
    for (const side of [-1, 1]) {
      const groundGeo = new THREE.PlaneGeometry(30, actualTrackLength + 1);
      const groundMat = new THREE.MeshStandardMaterial({ color: 0x2a3a2a, roughness: 1 });
      const ground = new THREE.Mesh(groundGeo, groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.position.set(side * (CONFIG.roadWidth / 2 + 15), -0.05, 0);
      ground.receiveShadow = true;
      piece.add(ground);
    }
  } else {
    // Placeholder: textured road
    piece = new THREE.Group();
    actualTrackLength = CONFIG.trackLength;

    // Main road surface — slightly longer to overlap and prevent gaps
    const roadGeo = new THREE.PlaneGeometry(CONFIG.roadWidth, CONFIG.trackLength + 0.5);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x444450,
      roughness: 0.85,
      metalness: 0.05,
    });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0;
    road.receiveShadow = true;
    piece.add(road);

    // Lane markings (dashed white lines)
    const dashMat = new THREE.MeshBasicMaterial({ color: 0x888888 });
    for (let i = 0; i < CONFIG.lanes.length - 1; i++) {
      const laneX = (CONFIG.lanes[i] + CONFIG.lanes[i + 1]) / 2;
      for (let j = -CONFIG.trackLength / 2; j < CONFIG.trackLength / 2; j += 5) {
        const dashGeo = new THREE.PlaneGeometry(0.12, 2.5);
        const dash = new THREE.Mesh(dashGeo, dashMat);
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(laneX, 0.01, j);
        piece.add(dash);
      }
    }

    // Road edges (red-white curbs)
    for (const side of [-CONFIG.roadWidth / 2, CONFIG.roadWidth / 2]) {
      const curbGeo = new THREE.BoxGeometry(0.4, 0.25, CONFIG.trackLength + 0.5);
      const curbMat = new THREE.MeshStandardMaterial({ color: 0xcc3333 });
      const curb = new THREE.Mesh(curbGeo, curbMat);
      curb.position.set(side, 0.12, 0);
      curb.castShadow = true;
      piece.add(curb);
    }

    // Side ground (grass/dirt)
    for (const side of [-1, 1]) {
      const groundGeo = new THREE.PlaneGeometry(30, CONFIG.trackLength + 0.5);
      const groundMat = new THREE.MeshStandardMaterial({ color: 0x2a3a2a, roughness: 1 });
      const ground = new THREE.Mesh(groundGeo, groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.position.set(side * (CONFIG.roadWidth / 2 + 15), -0.05, 0);
      ground.receiveShadow = true;
      piece.add(ground);
    }
  }

  piece.position.z = zPos;
  scene.add(piece);
  trackPieces.push(piece);
  return piece;
}

function initTrack() {
  // Create first piece to determine actualTrackLength
  createTrackPiece(actualTrackLength / 2);
  // Use a small overlap (0.5 units) to prevent seam gaps
  const step = actualTrackLength - 0.5;
  for (let i = 1; i < CONFIG.trackCount; i++) {
    createTrackPiece(actualTrackLength / 2 - i * step);
  }
}

function recycleTrack() {
  const step = actualTrackLength - 0.5;
  for (const piece of trackPieces) {
    if (piece.position.z > camera.position.z + actualTrackLength) {
      const minZ = Math.min(...trackPieces.map(p => p.position.z));
      piece.position.z = minZ - step;
    }
  }
}

// ─── Obstacles ──────────────────────────────────────────────────────────────
// Color palette for obstacles that have no texture
const OBSTACLE_COLORS = {
  cone: 0xff6600,
  cone2: 0xff4400,
  barrier: 0xdd2222,
  chevrolet: 0x884422,
};

function createObstacleFromModel(modelScene, targetHeight, type) {
  const wrapper = new THREE.Group();
  const clone = modelScene.clone();

  // Rotate car-type obstacles to face road direction
  if (type === 'chevrolet') {
    clone.rotation.y = Math.PI;
  }

  // Force update transforms so Box3 measures correctly
  clone.updateMatrixWorld(true);

  wrapper.add(clone);
  wrapper.updateMatrixWorld(true);

  // Measure after rotation
  const box = new THREE.Box3().setFromObject(wrapper);
  const size = box.getSize(new THREE.Vector3());
  console.log(`Obstacle ${type} raw size:`, size);

  // For truck/car type: scale based on HEIGHT (y) so it looks car-sized
  // For small obstacles: scale based on maxDim as before
  let s;
  if (type === 'chevrolet') {
    // Scale so car fits within a lane — use max dimension as reference, target 3 units
    const maxDim = Math.max(size.x, size.y, size.z);
    s = 3.0 / Math.max(maxDim, 0.001);
  } else {
    const maxDim = Math.max(size.x, size.y, size.z);
    s = targetHeight / Math.max(maxDim, 0.001);
  }
  wrapper.scale.setScalar(s);

  wrapper.updateMatrixWorld(true);

  // Re-center horizontally and put bottom at y=0
  const newBox = new THREE.Box3().setFromObject(wrapper);
  const center = newBox.getCenter(new THREE.Vector3());
  wrapper.position.x -= center.x;
  wrapper.position.z -= center.z;
  wrapper.position.y -= newBox.min.y;

  wrapper.updateMatrixWorld(true);

  // Final safety: clamp ALL dimensions to reasonable size (max 4 units any axis)
  const finalBox = new THREE.Box3().setFromObject(wrapper);
  const finalSize = finalBox.getSize(new THREE.Vector3());
  console.log(`Obstacle ${type} final size:`, finalSize);

  const maxAllowed = 4.0;
  const finalMax = Math.max(finalSize.x, finalSize.y, finalSize.z);
  if (finalMax > maxAllowed) {
    const clampScale = maxAllowed / finalMax;
    wrapper.scale.multiplyScalar(clampScale);
    console.warn(`Obstacle ${type} clamped from ${finalMax} to ${maxAllowed}`);
  }

  clone.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      // Fix materials that are missing textures (appear white/gray)
      const mat = child.material;
      if (mat) {
        const isDefault = !mat.map && (!mat.color || mat.color.getHex() === 0xffffff);
        if (isDefault) {
          child.material = new THREE.MeshStandardMaterial({
            color: OBSTACLE_COLORS[type] || 0x888888,
            metalness: 0.3,
            roughness: 0.6,
            envMap: scene.environment,
            envMapIntensity: 0.2,
          });
        }
      }
    }
  });
  return wrapper;
}

function createProceduralCar() {
  const group = new THREE.Group();
  const colors = [0xcc2222, 0x2255aa, 0x22aa44, 0xcccc22, 0x8833aa, 0xff6600];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const bodyMat = new THREE.MeshStandardMaterial({
    color, metalness: 0.6, roughness: 0.35,
    envMap: scene.environment, envMapIntensity: 0.3,
  });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x88ccff, metalness: 0.1, roughness: 0.1, opacity: 0.6, transparent: true,
  });

  // Body (lower part)
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 3.8), bodyMat);
  body.position.y = 0.45;
  body.castShadow = true;
  group.add(body);

  // Cabin (upper part)
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 1.8), glassMat);
  cabin.position.set(0, 1.0, -0.2);
  cabin.castShadow = true;
  group.add(cabin);

  // Roof
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.08, 1.85), bodyMat);
  roof.position.set(0, 1.34, -0.2);
  group.add(roof);

  // Wheels (4)
  const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 12);
  const wheelPositions = [
    [-0.9, 0.3, 1.1], [0.9, 0.3, 1.1],
    [-0.9, 0.3, -1.1], [0.9, 0.3, -1.1],
  ];
  for (const [wx, wy, wz] of wheelPositions) {
    const wheel = new THREE.Mesh(wheelGeo, darkMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, wy, wz);
    wheel.castShadow = true;
    wheel.userData.isWheel = true;
    group.add(wheel);
  }

  // Headlights
  const lightGeo = new THREE.BoxGeometry(0.3, 0.2, 0.05);
  const lightMat = new THREE.MeshStandardMaterial({
    color: 0xffffaa, emissive: 0xffffaa, emissiveIntensity: 0.5,
  });
  const hl1 = new THREE.Mesh(lightGeo, lightMat);
  hl1.position.set(-0.6, 0.5, -1.92);
  group.add(hl1);
  const hl2 = new THREE.Mesh(lightGeo, lightMat);
  hl2.position.set(0.6, 0.5, -1.92);
  group.add(hl2);

  // Tail lights
  const tailMat = new THREE.MeshStandardMaterial({
    color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.4,
  });
  const tl1 = new THREE.Mesh(lightGeo, tailMat);
  tl1.position.set(-0.6, 0.5, 1.92);
  group.add(tl1);
  const tl2 = new THREE.Mesh(lightGeo, tailMat);
  tl2.position.set(0.6, 0.5, 1.92);
  group.add(tl2);
  // Store for brake light effect
  group.userData.tailLightMat = tailMat;

  // Bumpers
  const bumperGeo = new THREE.BoxGeometry(1.9, 0.15, 0.15);
  const bumperMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8 });
  const fb = new THREE.Mesh(bumperGeo, bumperMat);
  fb.position.set(0, 0.2, -1.95);
  group.add(fb);
  const rb = new THREE.Mesh(bumperGeo, bumperMat);
  rb.position.set(0, 0.2, 1.95);
  group.add(rb);

  return group;
}

function spawnObstacle(excludeLane) {
  let lane;
  if (excludeLane !== undefined) {
    // Pick a different lane than the excluded one
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
  // Procedural car obstacle
  available.push({ model: null, type: 'procedural_car', height: 0 });
  if (obstacleModels.chevrolet) available.push({ model: obstacleModels.chevrolet, type: 'chevrolet', height: 3.0 });

  let mesh;
  const pick = available[Math.floor(Math.random() * available.length)];

  const container = new THREE.Group();

  if (pick.type === 'procedural_car' || pick.type === 'chevrolet') {
    if (pick.type === 'chevrolet') {
      mesh = createObstacleFromModel(pick.model, pick.height, 'chevrolet');
      // createObstacleFromModel already rotated clone.y = PI (faces -Z = same direction)
    } else {
      mesh = createProceduralCar();
    }

    // 28% chance oncoming, 72% same-direction slower traffic
    const isOncoming = Math.random() < 0.28;
    container.userData.isTraffic = true;
    container.userData.isOncoming = isOncoming;

    if (isOncoming) {
      if (pick.type === 'chevrolet') {
        // Undo the PI rotation so it faces +Z (toward player)
        if (mesh.children[0]) mesh.children[0].rotation.y = 0;
      } else {
        mesh.rotation.y = Math.PI; // procedural: front at -Z, flip to face +Z
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
    // Fallback cone
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

  // Safety check: don't spawn if too close to player (within 30 units)
  if (Math.abs(z) < 30) {
    return lane;
  }

  // Check no existing obstacle is too close (within 8 units on same lane)
  const tooClose = obstacles.some(o =>
    o.userData.lane === lane && Math.abs(o.position.z - z) < 8
  );
  if (tooClose) {
    return lane;
  }

  scene.add(container);
  obstacles.push(container);
  return lane;
}

// Returns true if the given lane has no obstacles blocking it ahead of trafficObs
function isLaneClearForTraffic(trafficObs, laneIdx, checkAhead) {
  const laneX = CONFIG.lanes[laneIdx];
  const tz = trafficObs.position.z;
  for (const obs of obstacles) {
    if (obs === trafficObs || !obs.userData.active) continue;
    const dz = tz - obs.position.z; // positive = obs is ahead (lower Z)
    if (dz < -2 || dz > checkAhead) continue;
    if (Math.abs(obs.position.x - laneX) < 1.8) return false;
  }
  return true;
}

function updateObstacles(delta) {
  state.obstacleTimer += delta;

  // Grace period: no spawning in the first 50 meters
  if (state.distance < 50) return;

  if (state.obstacleTimer >= state.obstacleInterval) {
    state.obstacleTimer = 0;
    const firstLane = spawnObstacle();
    // 35% chance to spawn a second obstacle in a DIFFERENT lane
    if (Math.random() < 0.35) {
      spawnObstacle(firstLane);
    }
    // Gradually increase difficulty
    state.obstacleInterval = Math.max(
      CONFIG.minObstacleInterval,
      state.obstacleInterval - 0.003
    );
  }

  // Remove obstacles that passed the player — count as dodged
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
  // Shrink hitbox for forgiving collisions
  const shrink = 0.4;
  playerBox.min.x += shrink;
  playerBox.max.x -= shrink;
  playerBox.min.z += shrink;
  playerBox.max.z -= shrink;

  for (const obs of obstacles) {
    if (!obs.userData.active) continue;
    // Only check collision for obstacles near the player (within 8 units on Z)
    if (Math.abs(obs.position.z) > 8) continue;
    const obsBox = new THREE.Box3().setFromObject(obs);

    // Safety: skip if obstacle bounding box is unreasonably large (broken model)
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
window.addEventListener('keydown', (e) => {
  if (!state.running) return;
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') moveLeft();
  if (e.code === 'ArrowRight' || e.code === 'KeyD') moveRight();
});

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

// Mobile controls
btnLeft.addEventListener('pointerdown', (e) => { e.preventDefault(); if (state.running) moveLeft(); });
btnRight.addEventListener('pointerdown', (e) => { e.preventDefault(); if (state.running) moveRight(); });

// Touch swipe
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

  // Remove all obstacles
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

  // Submit score to backend
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

function isMobile() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// ─── Update Loop ────────────────────────────────────────────────────────────
function update(delta) {
  if (!state.running) return;

  // Track time
  state.gameTime += delta;

  // Increase speed
  state.speed = Math.min(CONFIG.maxSpeed, state.speed + CONFIG.speedIncrement * delta);
  if (state.speed > state.maxSpeedReached) state.maxSpeedReached = state.speed;
  const moveAmount = state.speed * delta;
  state.distance += moveAmount;
  state.score = Math.round(state.distance * 2 + state.speed * 0.5);

  // Move track toward player (positive Z)
  for (const piece of trackPieces) {
    piece.position.z += moveAmount;
  }

  // Move obstacles toward player (traffic cars use their own speed ratio)
  for (const obs of obstacles) {
    const ratio = (obs.userData.speedRatio !== undefined)
      ? (1 - obs.userData.speedRatio)
      : 1;
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
        // Check for obstacles ahead every 0.25s
        obs.userData.avoidTimer -= delta;
        if (obs.userData.avoidTimer <= 0) {
          obs.userData.avoidTimer = 0.25;
          const curLane = obs.userData.lane;
          const laneBlocked = !isLaneClearForTraffic(obs, curLane, 14);
          obs.userData.braking = laneBlocked;

          if (laneBlocked) {
            // Try adjacent lanes
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
            // Periodic random lane change when clear
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

        // Brake light intensity (smooth transition)
        if (obs.userData.tailLightMat) {
          const targetIntensity = obs.userData.braking ? 1.8 : 0.4;
          obs.userData.tailLightMat.emissiveIntensity +=
            (targetIntensity - obs.userData.tailLightMat.emissiveIntensity) * 8 * delta;
        }

        // Smooth lateral movement to target lane
        const dx = obs.userData.targetX - obs.position.x;
        obs.position.x += dx * Math.min(1, 1.5 * delta);
        // Car body lean while changing lanes
        if (obs.children[0]) {
          obs.children[0].rotation.y += (-dx * 0.15 - obs.children[0].rotation.y) * 5 * delta;
        }
      }
    }
  }

  // Recycle track pieces
  recycleTrack();

  // Spawn obstacles
  updateObstacles(delta);

  // Smooth lane change for player
  const prevX = state.playerX;
  state.playerX += (state.targetX - state.playerX) * Math.min(1, CONFIG.laneChangeSpeed * delta);
  if (playerCar) {
    playerCar.position.x = state.playerX;
    // Car steers on Y-axis (yaw) like a real car turning
    const lateralSpeed = state.playerX - prevX;
    const steerAngle = -lateralSpeed * 0.8; // negative = turn toward movement
    playerCar.rotation.y += (steerAngle - playerCar.rotation.y) * 8 * delta;
    // Keep car grounded on road
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

  // Near-miss scoring: +50 pts when player barely dodges a static obstacle
  if (state.nearMissCooldown > 0) state.nearMissCooldown -= delta;
  if (state.nearMissCooldown <= 0) {
    for (const obs of obstacles) {
      if (!obs.userData.active || obs.userData.isTraffic) continue;
      const dx = Math.abs(obs.position.x - state.playerX);
      const dz = obs.position.z; // positive = obstacle just passed player
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

// ─── Resize ─────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Button Handlers ────────────────────────────────────────────────────────
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
backBtn.addEventListener('click', () => {
  window.location.href = '/game';
});

// ─── Init ───────────────────────────────────────────────────────────────────
async function init() {
  // Show Web3 info on start screen
  if (WEB3.carData.name) {
    startCarName.textContent = WEB3.carData.name;
  }
  if (WEB3.walletAddress) {
    const addr = WEB3.walletAddress;
    startWallet.textContent = `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

  await loadAssets();

  createPlayerCar();
  // Face the car forward (toward -Z)
  if (playerCar && playerCar.children[0]) {
    playerCar.children[0].rotation.y = Math.PI;
  }
  initTrack();

  // Log Web3 connection status
  console.log('Web3 Integration:', {
    wallet: WEB3.walletAddress ? 'connected' : 'not connected',
    car: WEB3.carData.name || 'none',
    backend: WEB3.backendUrl || 'none',
    carStats: WEB3.carData,
    gameConfig: { startSpeed: CONFIG.startSpeed.toFixed(1), maxSpeed: CONFIG.maxSpeed.toFixed(1), accel: CONFIG.speedIncrement.toFixed(3) },
  });

  // Hide loading, show start
  loadingScreen.classList.add('hidden');
  setTimeout(() => {
    loadingScreen.style.display = 'none';
    startScreen.classList.add('show');
  }, 800);

  animate();
}

init();
