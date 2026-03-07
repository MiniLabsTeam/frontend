import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';

// ─── Config ─────────────────────────────────────────────────────────────────
const CONFIG = {
  lanes: [-4.5, -1.5, 1.5, 4.5],    // 4 lane positions (x)
  roadWidth: 18,                      // total road width (wider road)
  trackLength: 80,                    // length of one track piece (Z)
  trackCount: 8,                      // number of track pieces to recycle
  startSpeed: 35,                     // starting speed (units/sec)
  maxSpeed: 100,                      // max speed
  speedIncrement: 0.25,              // speed increase per second
  obstacleInterval: 1.5,             // seconds between obstacle spawns
  minObstacleInterval: 0.5,          // minimum spawn interval
  spawnDistance: 180,                 // how far ahead to spawn obstacles
  despawnDistance: 20,                // how far behind to remove obstacles
  laneChangeSpeed: 8,                // smooth lane change speed
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
const restartBtn = document.getElementById('restart-btn');
const mobileControls = document.getElementById('mobile-controls');
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');

// ─── Three.js Setup ─────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
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
let obstacleModels = { cone: null, cone2: null, barrier: null, truck: null, chevrolet: null };
let carTextures = {};

const assetPaths = {
  car: '/asset3d/Meshes/ARCADE - FREE Racing Car.fbx',
  track: '/asset3d/Track/street_road.glb',
  cone: '/asset3d/Obstacle/cone.glb',
  cone2: '/asset3d/Obstacle/cone2.glb',
  barrier: '/asset3d/Obstacle/barrier.glb',
  truck: '/asset3d/Obstacle/old_car.glb',
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
const totalAssets = 13;

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
  for (const name of ['cone', 'cone2', 'barrier', 'truck', 'chevrolet']) {
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
  truck: 0x3366aa,
  chevrolet: 0x884422,
};

function createObstacleFromModel(modelScene, targetHeight, type) {
  const wrapper = new THREE.Group();
  const clone = modelScene.clone();

  // Rotate car-type obstacles to face road direction
  if (type === 'truck' || type === 'chevrolet') {
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
  if (type === 'truck' || type === 'chevrolet') {
    // Scale car-type obstacles by height so proportions stay correct
    const modelHeight = Math.max(size.y, 0.001);
    s = targetHeight / modelHeight;
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
  // old_car GLB replaced with procedural car (truck type handled below)
  available.push({ model: null, type: 'truck', height: 0 });
  if (obstacleModels.chevrolet) available.push({ model: obstacleModels.chevrolet, type: 'chevrolet', height: 1.4 });

  let mesh;
  const pick = available[Math.floor(Math.random() * available.length)];

  if (pick.type === 'truck') {
    // Procedural car obstacle — reliable size & orientation
    mesh = createProceduralCar();
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

  const container = new THREE.Group();
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

  // Remove obstacles that passed the player or are too close on spawn
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obs = obstacles[i];
    if (obs.position.z > CONFIG.despawnDistance) {
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
}

function isMobile() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// ─── Update Loop ────────────────────────────────────────────────────────────
function update(delta) {
  if (!state.running) return;

  // Increase speed
  state.speed = Math.min(CONFIG.maxSpeed, state.speed + CONFIG.speedIncrement * delta);
  const moveAmount = state.speed * delta;
  state.distance += moveAmount;
  state.score = Math.round(state.distance * 2 + state.speed * 0.5);

  // Move track toward player (positive Z)
  for (const piece of trackPieces) {
    piece.position.z += moveAmount;
  }

  // Move obstacles toward player
  for (const obs of obstacles) {
    obs.position.z += moveAmount;
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

// ─── Init ───────────────────────────────────────────────────────────────────
async function init() {
  await loadAssets();

  createPlayerCar();
  // Face the car forward (toward -Z)
  if (playerCar && playerCar.children[0]) {
    playerCar.children[0].rotation.y = Math.PI;
  }
  initTrack();

  // Hide loading, show start
  loadingScreen.classList.add('hidden');
  setTimeout(() => {
    loadingScreen.style.display = 'none';
    startScreen.classList.add('show');
  }, 800);

  animate();
}

init();
