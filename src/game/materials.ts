import * as THREE from 'three';
import type { TextureBundle } from './textures';

export interface MaterialLibrary {
  ceramicFloor: THREE.MeshStandardMaterial;
  courtyardPaver: THREE.MeshStandardMaterial;
  plasterWall: THREE.MeshStandardMaterial;
  brickWall: THREE.MeshStandardMaterial;
  roofTerracotta: THREE.MeshStandardMaterial;
  concreteTrim: THREE.MeshStandardMaterial;
  woodDesk: THREE.MeshStandardMaterial;
  woodDark: THREE.MeshStandardMaterial;
  metalChrome: THREE.MeshStandardMaterial;
  metalDark: THREE.MeshStandardMaterial;
  metalGate: THREE.MeshStandardMaterial;
  glassWindow: THREE.MeshStandardMaterial;
  plasticBlue: THREE.MeshStandardMaterial;
  plasticYellow: THREE.MeshStandardMaterial;
  plasticRed: THREE.MeshStandardMaterial;
  fabricGreen: THREE.MeshStandardMaterial;
  grass: THREE.MeshStandardMaterial;
  footballPitch: THREE.MeshStandardMaterial;
  basketballCourt: THREE.MeshStandardMaterial;
  asphalt: THREE.MeshStandardMaterial;
  chalkboard: THREE.MeshStandardMaterial;
  schoolSign: THREE.MeshStandardMaterial;
  posterScience: THREE.MeshStandardMaterial;
  posterSports: THREE.MeshStandardMaterial;
  posterRules: THREE.MeshStandardMaterial;
  foliage: THREE.MeshStandardMaterial;
  trunk: THREE.MeshStandardMaterial;
  foodGold: THREE.MeshStandardMaterial;
  paper: THREE.MeshStandardMaterial;
  rubberBlack: THREE.MeshStandardMaterial;
  contactShadow: THREE.MeshBasicMaterial;
  dispose: () => void;
}

export function createMaterialLibrary(tex: TextureBundle): MaterialLibrary {
  const created: THREE.Material[] = [];
  const track = <T extends THREE.Material>(m: T): T => {
    created.push(m);
    return m;
  };

  return {
    ceramicFloor: track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: tex.ceramicFloor,
        bumpMap: tex.microBump,
        bumpScale: 0.015,
        roughness: 0.38,
        metalness: 0.04,
      }),
    ),
    courtyardPaver: track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: tex.courtyardPaver,
        bumpMap: tex.microBump,
        bumpScale: 0.03,
        roughness: 0.85,
        metalness: 0.0,
      }),
    ),
    plasterWall: track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: tex.plasterWall,
        bumpMap: tex.microBump,
        bumpScale: 0.02,
        roughness: 0.86,
        metalness: 0.0,
      }),
    ),
    brickWall: track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: tex.brickWall,
        bumpMap: tex.microBump,
        bumpScale: 0.04,
        roughness: 0.9,
        metalness: 0.0,
      }),
    ),
    roofTerracotta: track(
      new THREE.MeshStandardMaterial({
        color: 0xb85233,
        bumpMap: tex.microBump,
        bumpScale: 0.03,
        roughness: 0.82,
        metalness: 0.02,
      }),
    ),
    concreteTrim: track(
      new THREE.MeshStandardMaterial({
        color: 0xd4cdc0,
        roughness: 0.88,
        metalness: 0.0,
      }),
    ),
    woodDesk: track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: tex.wood,
        roughness: 0.65,
        metalness: 0.0,
      }),
    ),
    woodDark: track(
      new THREE.MeshStandardMaterial({
        color: 0x6b4423,
        roughness: 0.72,
        metalness: 0.0,
      }),
    ),
    metalChrome: track(
      new THREE.MeshStandardMaterial({
        color: 0xdbe4ee,
        roughness: 0.22,
        metalness: 0.85,
      }),
    ),
    metalDark: track(
      new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.4,
        metalness: 0.72,
      }),
    ),
    metalGate: track(
      new THREE.MeshStandardMaterial({
        color: 0x1e3a5f,
        roughness: 0.35,
        metalness: 0.65,
      }),
    ),
    glassWindow: track(
      new THREE.MeshStandardMaterial({
        color: 0x93c5fd,
        roughness: 0.1,
        metalness: 0.15,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
      }),
    ),
    plasticBlue: track(
      new THREE.MeshStandardMaterial({
        color: 0x2563eb,
        roughness: 0.36,
        metalness: 0.05,
      }),
    ),
    plasticYellow: track(
      new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        roughness: 0.34,
        metalness: 0.05,
      }),
    ),
    plasticRed: track(
      new THREE.MeshStandardMaterial({
        color: 0xdc2626,
        roughness: 0.36,
        metalness: 0.05,
      }),
    ),
    fabricGreen: track(
      new THREE.MeshStandardMaterial({
        color: 0x15803d,
        roughness: 0.92,
        metalness: 0.0,
      }),
    ),
    grass: track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: tex.grass,
        roughness: 0.94,
        metalness: 0.0,
      }),
    ),
    footballPitch: track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: tex.footballPitch,
        roughness: 0.88,
        metalness: 0.0,
      }),
    ),
    basketballCourt: track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: tex.basketballCourt,
        roughness: 0.72,
        metalness: 0.0,
      }),
    ),
    asphalt: track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: tex.asphalt,
        roughness: 0.9,
        metalness: 0.0,
      }),
    ),
    chalkboard: track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: tex.chalkboard,
        roughness: 0.85,
        metalness: 0.0,
      }),
    ),
    schoolSign: track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: tex.schoolSign,
        roughness: 0.45,
        metalness: 0.1,
      }),
    ),
    posterScience: track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: tex.posterScience,
        roughness: 0.65,
      }),
    ),
    posterSports: track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: tex.posterSports,
        roughness: 0.65,
      }),
    ),
    posterRules: track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: tex.posterRules,
        roughness: 0.65,
      }),
    ),
    foliage: track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.84,
        metalness: 0.0,
      }),
    ),
    trunk: track(
      new THREE.MeshStandardMaterial({
        color: 0x6d4c3d,
        roughness: 0.92,
        metalness: 0.0,
      }),
    ),
    foodGold: track(
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        roughness: 0.55,
        metalness: 0.02,
      }),
    ),
    paper: track(
      new THREE.MeshStandardMaterial({
        color: 0xfefce8,
        roughness: 0.82,
        metalness: 0.0,
      }),
    ),
    rubberBlack: track(
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.78,
        metalness: 0.05,
      }),
    ),
    contactShadow: track(
      new THREE.MeshBasicMaterial({
        map: tex.contactShadow,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
      }),
    ),
    dispose: () => {
      created.forEach((m) => m.dispose());
    },
  };
}
