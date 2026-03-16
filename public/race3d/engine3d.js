/**
 * engine3d.js — Shared 3D Racing Engine
 *
 * Contains all shared Three.js setup, asset loading, track, car, obstacle,
 * and traffic systems used by both game.js (endless) and multiplayer.js.
 */

import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';

// ─── Web3 Integration ────────────────────────────────────────────────────────
export const WEB3 = {
  walletAddress: localStorage.getItem('wallet_address') || '',
  backendUrl: localStorage.getItem('backend_url') || '',
  authToken: localStorage.getItem('auth_token') || '',
  carData: (() => {
    try { return JSON.parse(localStorage.getItem('game_car_data') || '{}'); }
    catch { return {}; }
  })(),
};

export function applyCarStats(carData) {
  const speed = carData.baseSpeed || 50;
  const accel = carData.baseAcceleration || 50;
  const handling = carData.baseHandling || 50;
  return {
    startSpeed: 30 + (speed / 100) * 20,
    maxSpeed: 80 + (speed / 100) * 40,
    speedIncrement: 0.15 + (accel / 100) * 0.25,
    laneChangeSpeed: 6 + (handling / 100) * 6,
  };
}

const carMods = applyCarStats(WEB3.carData);

// ─── Config ──────────────────────────────────────────────────────────────────
export const CONFIG = {
  lanes: [-4.5, -1.5, 1.5, 4.5],
  roadWidth: 18,
  trackLength: 80,
  trackCount: 8,
  startSpeed: carMods.startSpeed,
  maxSpeed: carMods.maxSpeed,
  speedIncrement: carMods.speedIncrement,
  obstacleInterval: 1.5,
  minObstacleInterval: 0.5,
  spawnDistance: 180,
  despawnDistance: 20,
  laneChangeSpeed: carMods.laneChangeSpeed,
};

// ─── Asset Paths ─────────────────────────────────────────────────────────────
export const assetPaths = {
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

// ─── Three.js Core ───────────────────────────────────────────────────────────
export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
renderer.setClearColor(0xc8a882, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

export const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x8899aa, 80, 300);

export const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 6, 10);
camera.lookAt(0, 1, -20);

export const clock = new THREE.Clock();

// ─── Lighting ────────────────────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0x9999bb, 1.0);
scene.add(ambientLight);

export const dirLight = new THREE.DirectionalLight(0xffeedd, 2.0);
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

// ─── Loaders ─────────────────────────────────────────────────────────────────
const fbxLoader = new FBXLoader();
const gltfLoader = new GLTFLoader();
const exrLoader = new EXRLoader();
const textureLoader = new THREE.TextureLoader();

// ─── Shared Asset State ──────────────────────────────────────────────────────
export let carModelTemplate = null;
export let trackModel = null;
export let trackModelSize = new THREE.Vector3();
export const obstacleModels = { cone: null, cone2: null, barrier: null, chevrolet: null };
export const carTextures = {};

// ─── Loading Progress ────────────────────────────────────────────────────────
let loadedCount = 0;
const totalAssets = 12;

export function updateLoadingProgress(label, loadingBarEl, loadingTextEl) {
  loadedCount++;
  const pct = Math.min(100, Math.round((loadedCount / totalAssets) * 100));
  if (loadingBarEl) loadingBarEl.style.width = pct + '%';
  if (loadingTextEl) loadingTextEl.textContent = label;
}

// ─── Load All Assets ─────────────────────────────────────────────────────────
export async function loadAssets(loadingBarEl, loadingTextEl) {
  const progress = (label) => updateLoadingProgress(label, loadingBarEl, loadingTextEl);

  // Skybox
  try {
    const envMap = await new Promise((resolve, reject) => {
      exrLoader.load(assetPaths.skybox, (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        resolve(texture);
      }, undefined, reject);
    });
    scene.environment = envMap;
    scene.background = envMap;
    progress('Skybox loaded');
  } catch (e) {
    console.warn('EXR skybox failed, using gradient fallback', e);
    scene.background = new THREE.Color(0x667799);
    progress('Using fallback sky');
  }

  // Car textures
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
    progress('Texture loaded');
  }

  // Env + Emission
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

  // Car model
  try {
    carModelTemplate = await new Promise((resolve, reject) => {
      fbxLoader.load(assetPaths.car, resolve, undefined, reject);
    });
    const box = new THREE.Box3().setFromObject(carModelTemplate);
    const size = box.getSize(new THREE.Vector3());
    console.log('Car model size:', size);
    progress('Car model loaded');
  } catch (e) {
    console.error('Car model failed', e);
    progress('Car placeholder');
  }

  // Track model
  try {
    const gltf = await new Promise((resolve, reject) => {
      gltfLoader.load(assetPaths.track, resolve, undefined, reject);
    });
    trackModel = gltf.scene;
    const box = new THREE.Box3().setFromObject(trackModel);
    box.getSize(trackModelSize);
    console.log('Track model size:', trackModelSize);
    progress('Track loaded');
  } catch (e) {
    console.error('Track model failed', e);
    progress('Track placeholder');
  }

  // Obstacle models
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
    progress('Obstacle loaded');
  }

  console.log('All assets loaded!');
}

// ─── Track System ────────────────────────────────────────────────────────────
export const trackPieces = [];
export let actualTrackLength = CONFIG.trackLength;

export function createTrackPiece(zPos) {
  let piece;

  if (trackModel) {
    piece = new THREE.Group();
    const clone = trackModel.clone();
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const isZLong = size.z >= size.x;
    const modelLength = isZLong ? size.z : size.x;
    const modelWidth = isZLong ? size.x : size.z;
    const scaleZ = CONFIG.trackLength / Math.max(modelLength, 0.001);
    const scaleX = CONFIG.roadWidth / Math.max(modelWidth, 0.001);
    const scaleY = Math.min(scaleX, scaleZ);

    if (isZLong) {
      clone.scale.set(scaleX, scaleY, scaleZ);
    } else {
      clone.rotation.y = Math.PI / 2;
      clone.scale.set(scaleZ, scaleY, scaleX);
    }

    const newBox = new THREE.Box3().setFromObject(clone);
    const newCenter = newBox.getCenter(new THREE.Vector3());
    clone.position.x -= newCenter.x;
    clone.position.z -= newCenter.z;
    clone.position.y -= newBox.min.y;

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

    // Side ground panels
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
    // Placeholder textured road
    piece = new THREE.Group();
    actualTrackLength = CONFIG.trackLength;

    const roadGeo = new THREE.PlaneGeometry(CONFIG.roadWidth, CONFIG.trackLength + 0.5);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x444450, roughness: 0.85, metalness: 0.05 });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0;
    road.receiveShadow = true;
    piece.add(road);

    // Lane markings
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

    // Road edges
    for (const side of [-CONFIG.roadWidth / 2, CONFIG.roadWidth / 2]) {
      const curbGeo = new THREE.BoxGeometry(0.4, 0.25, CONFIG.trackLength + 0.5);
      const curbMat = new THREE.MeshStandardMaterial({ color: 0xcc3333 });
      const curb = new THREE.Mesh(curbGeo, curbMat);
      curb.position.set(side, 0.12, 0);
      curb.castShadow = true;
      piece.add(curb);
    }

    // Side ground
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

export function initTrack() {
  createTrackPiece(actualTrackLength / 2);
  const step = actualTrackLength - 0.5;
  for (let i = 1; i < CONFIG.trackCount; i++) {
    createTrackPiece(actualTrackLength / 2 - i * step);
  }
}

export function recycleTrack(referenceZ) {
  const step = actualTrackLength - 0.5;
  for (const piece of trackPieces) {
    if (piece.position.z > referenceZ + actualTrackLength) {
      const minZ = Math.min(...trackPieces.map(p => p.position.z));
      piece.position.z = minZ - step;
    }
  }
}

// ─── Car Creation ────────────────────────────────────────────────────────────
const OBSTACLE_COLORS = {
  cone: 0xff6600,
  cone2: 0xff4400,
  barrier: 0xdd2222,
  chevrolet: 0x884422,
};

export function createCarMesh(colorHex, textureKey) {
  const container = new THREE.Group();
  let carMesh;

  if (carModelTemplate) {
    carMesh = carModelTemplate.clone();
    const box = new THREE.Box3().setFromObject(carMesh);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const desiredLength = 3.5;
    const scale = desiredLength / maxDim;
    carMesh.scale.setScalar(scale);
    carMesh.position.sub(center.multiplyScalar(scale));

    const tex = carTextures[textureKey] || carTextures.carTex1 || null;
    carMesh.traverse((child) => {
      if (child.isMesh) {
        if (child.material && child.material.isMeshPhongMaterial) {
          const oldMat = child.material;
          child.material = new THREE.MeshStandardMaterial({
            map: tex || oldMat.map,
            color: oldMat.color || new THREE.Color(0xcccccc),
            metalness: 0.6,
            roughness: 0.35,
            envMap: scene.environment,
            envMapIntensity: 0.3,
          });
        } else {
          child.material = new THREE.MeshStandardMaterial({
            map: tex,
            color: tex ? new THREE.Color(0xcccccc) : new THREE.Color(colorHex),
            metalness: 0.6,
            roughness: 0.35,
            envMap: scene.environment,
            envMapIntensity: 0.3,
          });
        }
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
    // Procedural fallback car
    carMesh = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.6, roughness: 0.3 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 3.5), bodyMat);
    body.position.y = 0.5;
    body.castShadow = true;
    carMesh.add(body);

    const topGeo = new THREE.BoxGeometry(1.4, 0.5, 1.8);
    const top = new THREE.Mesh(topGeo, bodyMat);
    top.position.set(0, 1.0, -0.2);
    top.castShadow = true;
    carMesh.add(top);
  }

  carMesh.rotation.y = Math.PI;
  container.add(carMesh);
  return container;
}

// ─── Obstacle Creation ───────────────────────────────────────────────────────
export function createObstacleFromModel(modelScene, targetHeight, type) {
  const wrapper = new THREE.Group();
  const clone = modelScene.clone();

  if (type === 'chevrolet') {
    clone.rotation.y = Math.PI;
  }

  clone.updateMatrixWorld(true);
  wrapper.add(clone);
  wrapper.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(wrapper);
  const size = box.getSize(new THREE.Vector3());

  let s;
  if (type === 'chevrolet') {
    const maxDim = Math.max(size.x, size.y, size.z);
    s = 3.0 / Math.max(maxDim, 0.001);
  } else {
    const maxDim = Math.max(size.x, size.y, size.z);
    s = targetHeight / Math.max(maxDim, 0.001);
  }
  wrapper.scale.setScalar(s);
  wrapper.updateMatrixWorld(true);

  const newBox = new THREE.Box3().setFromObject(wrapper);
  const center = newBox.getCenter(new THREE.Vector3());
  wrapper.position.x -= center.x;
  wrapper.position.z -= center.z;
  wrapper.position.y -= newBox.min.y;
  wrapper.updateMatrixWorld(true);

  const finalBox = new THREE.Box3().setFromObject(wrapper);
  const finalSize = finalBox.getSize(new THREE.Vector3());
  const maxAllowed = 4.0;
  const finalMax = Math.max(finalSize.x, finalSize.y, finalSize.z);
  if (finalMax > maxAllowed) {
    wrapper.scale.multiplyScalar(maxAllowed / finalMax);
  }

  clone.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
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

export function createProceduralCar() {
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

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 3.8), bodyMat);
  body.position.y = 0.45;
  body.castShadow = true;
  group.add(body);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 1.8), glassMat);
  cabin.position.set(0, 1.0, -0.2);
  cabin.castShadow = true;
  group.add(cabin);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.08, 1.85), bodyMat);
  roof.position.set(0, 1.34, -0.2);
  group.add(roof);

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

  const tailMat = new THREE.MeshStandardMaterial({
    color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.4,
  });
  const tl1 = new THREE.Mesh(lightGeo, tailMat);
  tl1.position.set(-0.6, 0.5, 1.92);
  group.add(tl1);
  const tl2 = new THREE.Mesh(lightGeo, tailMat);
  tl2.position.set(0.6, 0.5, 1.92);
  group.add(tl2);
  group.userData.tailLightMat = tailMat;

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

// ─── Traffic System ──────────────────────────────────────────────────────────
export const trafficState = {
  cars: [],
  timer: 0,
  spawnInterval: 1.5,
  maxTraffic: 12,
  spawnDistance: 180,
  despawnDistance: 20,
  minSpawnInterval: 0.5,
};

export function isLaneClearForTraffic(trafficObs, laneIdx, checkAhead, trafficList, extraObstacles) {
  const list = trafficList || trafficState.cars;
  const laneX = CONFIG.lanes[laneIdx];
  const tz = trafficObs.position.z;
  // Check fellow traffic cars
  for (const obs of list) {
    if (obs === trafficObs) continue;
    const dz = tz - obs.position.z;
    if (dz < -2 || dz > checkAhead) continue;
    if (Math.abs(obs.position.x - laneX) < 1.8) return false;
  }
  // Check extra obstacles (e.g. server-side obstacles in multiplayer)
  if (extraObstacles) {
    for (const obs of extraObstacles) {
      const dz = tz - obs.position.z;
      if (dz < -2 || dz > checkAhead) continue;
      if (Math.abs(obs.position.x - laneX) < 1.8) return false;
    }
  }
  return true;
}

export function spawnTrafficCar(playerZ, trafficList) {
  const list = trafficList || trafficState.cars;
  if (list.length >= trafficState.maxTraffic) return;

  const laneIdx = Math.floor(Math.random() * CONFIG.lanes.length);
  const x = CONFIG.lanes[laneIdx];
  const z = playerZ - trafficState.spawnDistance;

  const container = new THREE.Group();
  let mesh;

  if (Math.random() < 0.4 && obstacleModels.chevrolet) {
    mesh = createObstacleFromModel(obstacleModels.chevrolet, 3.0, 'chevrolet');
  } else {
    mesh = createProceduralCar();
  }

  const isOncoming = Math.random() < 0.25;
  container.userData.isTraffic = true;
  container.userData.isOncoming = isOncoming;
  container.userData.lane = laneIdx;

  if (isOncoming) {
    if (mesh.children[0] && mesh.children[0].rotation) mesh.children[0].rotation.y = 0;
    else mesh.rotation.y = Math.PI;
    container.userData.speedRatio = -(0.5 + Math.random() * 0.5);
  } else {
    container.userData.speedRatio = 0.25 + Math.random() * 0.45;
    container.userData.targetX = x;
    container.userData.laneChangeTimer = 3 + Math.random() * 5;
    container.userData.braking = false;
  }

  if (mesh.userData && mesh.userData.tailLightMat) container.userData.tailLightMat = mesh.userData.tailLightMat;

  container.add(mesh);
  container.position.set(x, 0, z);
  scene.add(container);
  list.push(container);
}

export function updateTraffic(delta, playerSpeed, cameraZ, trafficList, extraObstacles) {
  const list = trafficList || trafficState.cars;
  if (!playerSpeed || playerSpeed < 1) return;

  trafficState.timer += delta;
  if (trafficState.timer >= trafficState.spawnInterval) {
    trafficState.timer = 0;
    spawnTrafficCar(cameraZ - 10, list);
    trafficState.spawnInterval = Math.max(trafficState.minSpawnInterval, trafficState.spawnInterval - 0.002);
  }

  const moveAmount = playerSpeed * delta;

  for (let i = list.length - 1; i >= 0; i--) {
    const obs = list[i];
    const ratio = obs.userData.speedRatio !== undefined ? (1 - obs.userData.speedRatio) : 1;
    obs.position.z += moveAmount * ratio;

    // Wheel rotation
    obs.traverse(child => {
      if (child.userData.isWheel) {
        child.rotation.x += playerSpeed * delta * (obs.userData.isOncoming ? -0.5 : 0.4);
      }
    });

    // Same-direction traffic AI
    if (!obs.userData.isOncoming && obs.userData.targetX !== undefined) {
      const curLane = obs.userData.lane;
      obs.userData.laneChangeTimer -= delta;
      if (obs.userData.laneChangeTimer <= 0) {
        const adj = [];
        if (curLane > 0) adj.push(curLane - 1);
        if (curLane < CONFIG.lanes.length - 1) adj.push(curLane + 1);
        if (adj.length) {
          const nextLane = adj[Math.floor(Math.random() * adj.length)];
          if (isLaneClearForTraffic(obs, nextLane, 14, list, extraObstacles)) {
            obs.userData.lane = nextLane;
            obs.userData.targetX = CONFIG.lanes[nextLane];
          }
        }
        obs.userData.laneChangeTimer = 3 + Math.random() * 5;
      }

      // Smooth lateral movement
      const dx = obs.userData.targetX - obs.position.x;
      obs.position.x += dx * Math.min(1, 1.5 * delta);
      if (obs.children[0]) {
        obs.children[0].rotation.y += (-dx * 0.15 - obs.children[0].rotation.y) * 5 * delta;
      }
    }

    // Brake light effect
    if (obs.userData.tailLightMat) {
      const targetIntensity = obs.userData.braking ? 1.8 : 0.4;
      obs.userData.tailLightMat.emissiveIntensity +=
        (targetIntensity - obs.userData.tailLightMat.emissiveIntensity) * 8 * delta;
    }

    // Despawn
    if (obs.position.z > cameraZ + trafficState.despawnDistance) {
      scene.remove(obs);
      list.splice(i, 1);
    }
  }
}

export function clearTraffic(trafficList) {
  const list = trafficList || trafficState.cars;
  for (const t of list) scene.remove(t);
  list.length = 0;
  trafficState.timer = 0;
  trafficState.spawnInterval = 1.5;
}

// ─── Resize Handler ──────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Utilities ───────────────────────────────────────────────────────────────
export function isMobile() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}
