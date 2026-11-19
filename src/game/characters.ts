import * as THREE from 'three';
import type { CharacterId } from './types';

export type AnimState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'sprint'
  | 'jump'
  | 'fall'
  | 'glide'
  | 'land'
  | 'quack'
  | 'interact'
  | 'sit'
  | 'celebrate';

export interface CharacterRig {
  id: CharacterId;
  root: THREE.Group;
  visualRoot: THREE.Group; // For squash & stretch and banking
  bodyGroup: THREE.Group;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftWing?: THREE.Group;
  rightWing?: THREE.Group;
  upperBeak?: THREE.Group;
  lowerBeak?: THREE.Group;
  tailSegments?: THREE.Group[];
  crestLeft?: THREE.Mesh;
  crestRight?: THREE.Mesh;
  eyelids?: THREE.Mesh[];
  contactShadow: THREE.Mesh;
  // Runtime animation state
  gaitPhase: number;
  idleTime: number;
  squashY: number;
  squashXZ: number;
  abilityTimer: number;
  interactTimer: number;
  blinkTimer: number;
  eyeHeight: number;
}

function makeMat(color: number, roughness = 0.78, metalness = 0.04): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function addPart(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  castShadow = true,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function createEmanuelRig(contactShadowMat: THREE.Material): CharacterRig {
  const root = new THREE.Group();
  const visualRoot = new THREE.Group();
  root.add(visualRoot);

  const furMat = makeMat(0x7d8594, 0.88, 0.02);
  const bellyMat = makeMat(0xcbd5e1, 0.9, 0.0);
  const earInnerMat = makeMat(0xf4a5b8, 0.68, 0.0);
  const noseMat = makeMat(0xf472b6, 0.4, 0.08);
  const vestMat = makeMat(0x0284c7, 0.68, 0.05);
  const stripeMat = makeMat(0xfacc15, 0.5, 0.05);
  const shoeMat = makeMat(0xef4444, 0.45, 0.05);
  const soleMat = makeMat(0xf8fafc, 0.7, 0.0);
  const eyeMat = makeMat(0x0f172a, 0.15, 0.1);
  const eyeGlintMat = makeMat(0xffffff, 0.1, 0.0);
  const whiskerMat = makeMat(0xe2e8f0, 0.5, 0.0);
  const tailMat = makeMat(0xe598a9, 0.65, 0.0);

  // Body pivot around hip height
  const bodyGroup = new THREE.Group();
  bodyGroup.position.set(0, 0.58, 0);
  visualRoot.add(bodyGroup);

  // Primary torso + school vest + belly
  addPart(bodyGroup, new THREE.BoxGeometry(0.56, 0.62, 0.42), furMat, 0, 0.28, 0);
  addPart(bodyGroup, new THREE.BoxGeometry(0.6, 0.46, 0.45), vestMat, 0, 0.32, 0);
  addPart(bodyGroup, new THREE.BoxGeometry(0.36, 0.42, 0.06), bellyMat, 0, 0.28, 0.22);
  addPart(bodyGroup, new THREE.BoxGeometry(0.62, 0.07, 0.47), stripeMat, 0, 0.16, 0);

  // School backpack
  addPart(bodyGroup, new THREE.BoxGeometry(0.42, 0.42, 0.22), makeMat(0x1e3a8a, 0.72), 0, 0.34, -0.28);
  addPart(bodyGroup, new THREE.BoxGeometry(0.32, 0.18, 0.06), stripeMat, 0, 0.28, -0.39);

  // Articulated 4-segment tail
  const tailSegments: THREE.Group[] = [];
  let tailParent: THREE.Object3D = bodyGroup;
  for (let i = 0; i < 4; i++) {
    const segGroup = new THREE.Group();
    if (i === 0) {
      segGroup.position.set(0, 0.08, -0.22);
      segGroup.rotation.x = -0.35;
    } else {
      segGroup.position.set(0, 0, -0.24);
    }
    const radius = 0.065 - i * 0.011;
    addPart(segGroup, new THREE.BoxGeometry(radius * 2, radius * 2, 0.26), tailMat, 0, 0, -0.12);
    tailParent.add(segGroup);
    tailSegments.push(segGroup);
    tailParent = segGroup;
  }

  // Head
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.66, 0.04);
  bodyGroup.add(headGroup);

  addPart(headGroup, new THREE.BoxGeometry(0.54, 0.44, 0.48), furMat, 0, 0.22, 0);
  // Tapered muzzle + nose + buck tooth
  addPart(headGroup, new THREE.BoxGeometry(0.34, 0.24, 0.26), furMat, 0, 0.16, 0.31);
  addPart(headGroup, new THREE.BoxGeometry(0.24, 0.14, 0.14), bellyMat, 0, 0.11, 0.36);
  addPart(headGroup, new THREE.BoxGeometry(0.12, 0.1, 0.08), noseMat, 0, 0.21, 0.46);
  addPart(headGroup, new THREE.BoxGeometry(0.08, 0.05, 0.03), soleMat, 0, 0.07, 0.42);

  // Ears (large expressive rat ears)
  for (const side of [-1, 1]) {
    addPart(headGroup, new THREE.BoxGeometry(0.24, 0.26, 0.08), furMat, side * 0.27, 0.45, -0.05);
    addPart(headGroup, new THREE.BoxGeometry(0.15, 0.17, 0.09), earInnerMat, side * 0.27, 0.45, -0.04);
    // Eyes + glint
    addPart(headGroup, new THREE.BoxGeometry(0.1, 0.12, 0.06), eyeMat, side * 0.15, 0.28, 0.23);
    addPart(headGroup, new THREE.BoxGeometry(0.04, 0.04, 0.07), eyeGlintMat, side * 0.17, 0.31, 0.235);
    // Whiskers
    addPart(headGroup, new THREE.BoxGeometry(0.22, 0.02, 0.02), whiskerMat, side * 0.22, 0.16, 0.38);
    addPart(headGroup, new THREE.BoxGeometry(0.2, 0.02, 0.02), whiskerMat, side * 0.21, 0.11, 0.37);
  }

  // Arms
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.36, 0.52, 0);
  bodyGroup.add(leftArm);
  addPart(leftArm, new THREE.BoxGeometry(0.15, 0.4, 0.16), furMat, 0, -0.18, 0);
  addPart(leftArm, new THREE.BoxGeometry(0.14, 0.12, 0.16), earInnerMat, 0, -0.39, 0.02);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.36, 0.52, 0);
  bodyGroup.add(rightArm);
  addPart(rightArm, new THREE.BoxGeometry(0.15, 0.4, 0.16), furMat, 0, -0.18, 0);
  addPart(rightArm, new THREE.BoxGeometry(0.14, 0.12, 0.16), earInnerMat, 0, -0.39, 0.02);

  // Legs + Sneakers
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.17, 0.58, 0);
  visualRoot.add(leftLeg);
  addPart(leftLeg, new THREE.BoxGeometry(0.18, 0.4, 0.2), furMat, 0, -0.2, 0);
  addPart(leftLeg, new THREE.BoxGeometry(0.21, 0.16, 0.3), shoeMat, 0, -0.46, 0.05);
  addPart(leftLeg, new THREE.BoxGeometry(0.22, 0.05, 0.31), soleMat, 0, -0.55, 0.05);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.17, 0.58, 0);
  visualRoot.add(rightLeg);
  addPart(rightLeg, new THREE.BoxGeometry(0.18, 0.4, 0.2), furMat, 0, -0.2, 0);
  addPart(rightLeg, new THREE.BoxGeometry(0.21, 0.16, 0.3), shoeMat, 0, -0.46, 0.05);
  addPart(rightLeg, new THREE.BoxGeometry(0.22, 0.05, 0.31), soleMat, 0, -0.55, 0.05);

  const contactShadow = new THREE.Mesh(new THREE.CircleGeometry(0.55, 20), contactShadowMat);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.02;
  root.add(contactShadow);

  return {
    id: 'emanuel',
    root,
    visualRoot,
    bodyGroup,
    headGroup,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    tailSegments,
    contactShadow,
    gaitPhase: 0,
    idleTime: 0,
    squashY: 1,
    squashXZ: 1,
    abilityTimer: 0,
    interactTimer: 0,
    blinkTimer: 0,
    eyeHeight: 1.48,
  };
}

function createPedroHenriqueRig(contactShadowMat: THREE.Material): CharacterRig {
  const root = new THREE.Group();
  const visualRoot = new THREE.Group();
  root.add(visualRoot);

  const featherMat = makeMat(0xf8fafc, 0.85, 0.0);
  const creamMat = makeMat(0xe2e8f0, 0.88, 0.0);
  const beakMat = makeMat(0xf59e0b, 0.35, 0.08);
  const beakInnerMat = makeMat(0xbe123c, 0.6, 0.0);
  const feetMat = makeMat(0xea580c, 0.48, 0.04);
  const scarfMat = makeMat(0x1d4ed8, 0.72, 0.02);
  const capMat = makeMat(0xfacc15, 0.62, 0.04);
  const eyeMat = makeMat(0x0f172a, 0.12, 0.12);
  const glintMat = makeMat(0xffffff, 0.1, 0.0);

  const bodyGroup = new THREE.Group();
  bodyGroup.position.set(0, 0.56, 0);
  visualRoot.add(bodyGroup);

  // Plump duck body + school sash + tail tuft
  addPart(bodyGroup, new THREE.BoxGeometry(0.68, 0.66, 0.56), featherMat, 0, 0.33, 0);
  addPart(bodyGroup, new THREE.BoxGeometry(0.54, 0.44, 0.1), creamMat, 0, 0.3, 0.27);
  addPart(bodyGroup, new THREE.BoxGeometry(0.7, 0.13, 0.58), scarfMat, 0, 0.6, 0);
  // Tail feathers
  addPart(bodyGroup, new THREE.BoxGeometry(0.32, 0.22, 0.24), creamMat, 0, 0.2, -0.34);
  addPart(bodyGroup, new THREE.BoxGeometry(0.2, 0.16, 0.2), featherMat, 0, 0.3, -0.42);

  // Head
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.7, 0.03);
  bodyGroup.add(headGroup);

  addPart(headGroup, new THREE.BoxGeometry(0.56, 0.48, 0.52), featherMat, 0, 0.24, 0);
  // Comedic tuft & yellow visor cap
  addPart(headGroup, new THREE.BoxGeometry(0.46, 0.14, 0.46), capMat, 0, 0.51, -0.01);
  addPart(headGroup, new THREE.BoxGeometry(0.38, 0.05, 0.2), scarfMat, 0, 0.45, 0.3);

  // Articulated upper + lower beak for quacking!
  const upperBeak = new THREE.Group();
  upperBeak.position.set(0, 0.21, 0.26);
  headGroup.add(upperBeak);
  addPart(upperBeak, new THREE.BoxGeometry(0.38, 0.1, 0.32), beakMat, 0, 0.02, 0.14);

  const lowerBeak = new THREE.Group();
  lowerBeak.position.set(0, 0.14, 0.25);
  headGroup.add(lowerBeak);
  addPart(lowerBeak, new THREE.BoxGeometry(0.34, 0.07, 0.28), beakMat, 0, -0.02, 0.12);
  addPart(lowerBeak, new THREE.BoxGeometry(0.26, 0.03, 0.22), beakInnerMat, 0, 0.02, 0.1);

  for (const side of [-1, 1]) {
    addPart(headGroup, new THREE.BoxGeometry(0.1, 0.13, 0.06), eyeMat, side * 0.17, 0.3, 0.25);
    addPart(headGroup, new THREE.BoxGeometry(0.04, 0.04, 0.07), glintMat, side * 0.19, 0.33, 0.255);
  }

  // Articulated Wings (acting as arms + wings)
  const leftWing = new THREE.Group();
  leftWing.position.set(-0.37, 0.56, 0);
  bodyGroup.add(leftWing);
  addPart(leftWing, new THREE.BoxGeometry(0.14, 0.46, 0.34), featherMat, -0.05, -0.2, -0.02);
  addPart(leftWing, new THREE.BoxGeometry(0.12, 0.18, 0.26), creamMat, -0.06, -0.42, -0.06);

  const rightWing = new THREE.Group();
  rightWing.position.set(0.37, 0.56, 0);
  bodyGroup.add(rightWing);
  addPart(rightWing, new THREE.BoxGeometry(0.14, 0.46, 0.34), featherMat, 0.05, -0.2, -0.02);
  addPart(rightWing, new THREE.BoxGeometry(0.12, 0.18, 0.26), creamMat, 0.06, -0.42, -0.06);

  // Orange webbed feet
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.18, 0.54, 0);
  visualRoot.add(leftLeg);
  addPart(leftLeg, new THREE.BoxGeometry(0.14, 0.36, 0.14), feetMat, 0, -0.22, 0);
  addPart(leftLeg, new THREE.BoxGeometry(0.26, 0.09, 0.34), feetMat, 0, -0.48, 0.09);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.18, 0.54, 0);
  visualRoot.add(rightLeg);
  addPart(rightLeg, new THREE.BoxGeometry(0.14, 0.36, 0.14), feetMat, 0, -0.22, 0);
  addPart(rightLeg, new THREE.BoxGeometry(0.26, 0.09, 0.34), feetMat, 0, -0.48, 0.09);

  const contactShadow = new THREE.Mesh(new THREE.CircleGeometry(0.62, 20), contactShadowMat);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.02;
  root.add(contactShadow);

  return {
    id: 'pedro_henrique',
    root,
    visualRoot,
    bodyGroup,
    headGroup,
    leftArm: leftWing,
    rightArm: rightWing,
    leftWing,
    rightWing,
    upperBeak,
    lowerBeak,
    leftLeg,
    rightLeg,
    contactShadow,
    gaitPhase: 0,
    idleTime: 0,
    squashY: 1,
    squashXZ: 1,
    abilityTimer: 0,
    interactTimer: 0,
    blinkTimer: 0,
    eyeHeight: 1.54,
  };
}

function createPedroAntonioRig(contactShadowMat: THREE.Material): CharacterRig {
  const root = new THREE.Group();
  const visualRoot = new THREE.Group();
  root.add(visualRoot);

  const darkPlumage = makeMat(0x27303f, 0.8, 0.06);
  const slatePlumage = makeMat(0x64748b, 0.84, 0.02);
  const whitePlumage = makeMat(0xf1f5f9, 0.86, 0.0);
  const jacketMat = makeMat(0x065f46, 0.72, 0.04);
  const goldTrim = makeMat(0xf59e0b, 0.38, 0.25);
  const beakMat = makeMat(0x1e293b, 0.32, 0.15);
  const talonMat = makeMat(0xfbbf24, 0.45, 0.1);
  const eyeAmber = makeMat(0xf59e0b, 0.15, 0.1);
  const pupilMat = makeMat(0x090d16, 0.1, 0.1);

  const bodyGroup = new THREE.Group();
  bodyGroup.position.set(0, 0.68, 0);
  visualRoot.add(bodyGroup);

  // Broad harpy torso + chest ruff + school varsity trim
  addPart(bodyGroup, new THREE.BoxGeometry(0.64, 0.74, 0.46), darkPlumage, 0, 0.36, 0);
  addPart(bodyGroup, new THREE.BoxGeometry(0.46, 0.56, 0.12), whitePlumage, 0, 0.36, 0.22);
  addPart(bodyGroup, new THREE.BoxGeometry(0.68, 0.46, 0.48), jacketMat, 0, 0.38, -0.01);
  addPart(bodyGroup, new THREE.BoxGeometry(0.44, 0.42, 0.14), whitePlumage, 0, 0.38, 0.21);
  // Tail fan
  addPart(bodyGroup, new THREE.BoxGeometry(0.42, 0.1, 0.38), darkPlumage, 0, 0.04, -0.34);
  addPart(bodyGroup, new THREE.BoxGeometry(0.32, 0.08, 0.28), slatePlumage, 0, 0.08, -0.4);

  // Head with iconic Harpy Eagle double feather crest!
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.78, 0.04);
  bodyGroup.add(headGroup);

  addPart(headGroup, new THREE.BoxGeometry(0.5, 0.46, 0.48), slatePlumage, 0, 0.24, 0);
  addPart(headGroup, new THREE.BoxGeometry(0.56, 0.22, 0.44), whitePlumage, 0, 0.08, -0.02);

  // Harpy crest feathers
  const crestLeft = addPart(headGroup, new THREE.BoxGeometry(0.14, 0.32, 0.12), darkPlumage, -0.18, 0.54, -0.06);
  crestLeft.rotation.z = 0.28;
  crestLeft.rotation.x = -0.25;
  const crestRight = addPart(headGroup, new THREE.BoxGeometry(0.14, 0.32, 0.12), darkPlumage, 0.18, 0.54, -0.06);
  crestRight.rotation.z = -0.28;
  crestRight.rotation.x = -0.25;
  addPart(headGroup, new THREE.BoxGeometry(0.12, 0.24, 0.1), slatePlumage, 0, 0.52, -0.08);

  // Strong hooked eagle beak
  addPart(headGroup, new THREE.BoxGeometry(0.18, 0.15, 0.28), beakMat, 0, 0.22, 0.34);
  addPart(headGroup, new THREE.BoxGeometry(0.14, 0.12, 0.1), beakMat, 0, 0.14, 0.44);
  addPart(headGroup, new THREE.BoxGeometry(0.2, 0.07, 0.12), goldTrim, 0, 0.27, 0.25);

  for (const side of [-1, 1]) {
    addPart(headGroup, new THREE.BoxGeometry(0.11, 0.1, 0.06), eyeAmber, side * 0.16, 0.3, 0.23);
    addPart(headGroup, new THREE.BoxGeometry(0.05, 0.07, 0.07), pupilMat, side * 0.16, 0.3, 0.235);
    // Fierce brow ridge
    const brow = addPart(headGroup, new THREE.BoxGeometry(0.15, 0.05, 0.08), darkPlumage, side * 0.16, 0.36, 0.24);
    brow.rotation.z = side * -0.18;
  }

  // Broad multi-part Harpy Wings (pivoted at shoulders so they fold down or spread wide when gliding!)
  const leftWing = new THREE.Group();
  leftWing.position.set(-0.36, 0.62, 0);
  bodyGroup.add(leftWing);
  addPart(leftWing, new THREE.BoxGeometry(0.18, 0.58, 0.38), darkPlumage, -0.08, -0.24, -0.04);
  addPart(leftWing, new THREE.BoxGeometry(0.12, 0.48, 0.32), slatePlumage, -0.11, -0.52, -0.1);
  addPart(leftWing, new THREE.BoxGeometry(0.08, 0.32, 0.24), whitePlumage, -0.12, -0.68, -0.14);

  const rightWing = new THREE.Group();
  rightWing.position.set(0.36, 0.62, 0);
  bodyGroup.add(rightWing);
  addPart(rightWing, new THREE.BoxGeometry(0.18, 0.58, 0.38), darkPlumage, 0.08, -0.24, -0.04);
  addPart(rightWing, new THREE.BoxGeometry(0.12, 0.48, 0.32), slatePlumage, 0.11, -0.52, -0.1);
  addPart(rightWing, new THREE.BoxGeometry(0.08, 0.32, 0.24), whitePlumage, 0.12, -0.68, -0.14);

  // Taloned Legs
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.18, 0.68, 0);
  visualRoot.add(leftLeg);
  addPart(leftLeg, new THREE.BoxGeometry(0.22, 0.36, 0.22), whitePlumage, 0, -0.18, 0);
  addPart(leftLeg, new THREE.BoxGeometry(0.14, 0.24, 0.14), talonMat, 0, -0.44, 0);
  addPart(leftLeg, new THREE.BoxGeometry(0.24, 0.09, 0.3), talonMat, 0, -0.62, 0.06);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.18, 0.68, 0);
  visualRoot.add(rightLeg);
  addPart(rightLeg, new THREE.BoxGeometry(0.22, 0.36, 0.22), whitePlumage, 0, -0.18, 0);
  addPart(rightLeg, new THREE.BoxGeometry(0.14, 0.24, 0.14), talonMat, 0, -0.44, 0);
  addPart(rightLeg, new THREE.BoxGeometry(0.24, 0.09, 0.3), talonMat, 0, -0.62, 0.06);

  const contactShadow = new THREE.Mesh(new THREE.CircleGeometry(0.62, 20), contactShadowMat);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.02;
  root.add(contactShadow);

  return {
    id: 'pedro_antonio',
    root,
    visualRoot,
    bodyGroup,
    headGroup,
    leftArm: leftWing,
    rightArm: rightWing,
    leftWing,
    rightWing,
    crestLeft,
    crestRight,
    leftLeg,
    rightLeg,
    contactShadow,
    gaitPhase: 0,
    idleTime: 0,
    squashY: 1,
    squashXZ: 1,
    abilityTimer: 0,
    interactTimer: 0,
    blinkTimer: 0,
    eyeHeight: 1.72,
  };
}

export function createCharacterRig(id: CharacterId, contactShadowMat: THREE.Material): CharacterRig {
  switch (id) {
    case 'emanuel':
      return createEmanuelRig(contactShadowMat);
    case 'pedro_henrique':
      return createPedroHenriqueRig(contactShadowMat);
    case 'pedro_antonio':
      return createPedroAntonioRig(contactShadowMat);
  }
}

function damp(current: number, target: number, lambda: number, dt: number): number {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));
}

export function triggerRigSquash(rig: CharacterRig, scaleY: number, scaleXZ: number): void {
  rig.squashY = scaleY;
  rig.squashXZ = scaleXZ;
}

export function updateCharacterAnimation(
  rig: CharacterRig,
  state: AnimState,
  horizontalSpeed: number,
  dt: number,
): void {
  rig.idleTime += dt;
  rig.abilityTimer = Math.max(0, rig.abilityTimer - dt);
  rig.interactTimer = Math.max(0, rig.interactTimer - dt);

  // Recover squash-and-stretch smoothly
  rig.squashY = damp(rig.squashY, 1, 12, dt);
  rig.squashXZ = damp(rig.squashXZ, 1, 12, dt);
  rig.visualRoot.scale.set(rig.squashXZ, rig.squashY, rig.squashXZ);

  // Sync stride phase to actual horizontal speed so feet never skate
  if (horizontalSpeed > 0.25 && (state === 'walk' || state === 'run' || state === 'sprint')) {
    rig.gaitPhase += horizontalSpeed * dt * 1.45;
  }

  const baseBodyY = rig.id === 'pedro_antonio' ? 0.68 : rig.id === 'pedro_henrique' ? 0.56 : 0.58;
  const strideAmp =
    state === 'sprint' ? 0.85 : state === 'run' ? 0.66 : state === 'walk' ? 0.42 : 0;
  const sinGait = Math.sin(rig.gaitPhase);
  const cosGait = Math.cos(rig.gaitPhase);

  let targetBodyY = baseBodyY + Math.sin(rig.idleTime * 3.1) * 0.025;
  let targetBodyPitch = 0;
  let targetBodyRoll = 0;
  let targetHeadPitch = Math.sin(rig.idleTime * 1.9) * 0.03;
  let targetHeadYaw = Math.sin(rig.idleTime * 0.85) * 0.08;
  let targetLeftLeg = 0;
  let targetRightLeg = 0;
  let targetLeftArmX = 0;
  let targetRightArmX = 0;
  let targetLeftWingZ = 0;
  let targetRightWingZ = 0;

  if (state === 'walk' || state === 'run' || state === 'sprint') {
    targetLeftLeg = sinGait * strideAmp;
    targetRightLeg = -sinGait * strideAmp;
    targetLeftArmX = -sinGait * strideAmp * 0.78;
    targetRightArmX = sinGait * strideAmp * 0.78;
    targetBodyY = baseBodyY + Math.abs(cosGait) * (state === 'sprint' ? 0.11 : 0.06);
    targetBodyPitch = state === 'sprint' ? 0.26 : state === 'run' ? 0.14 : 0.05;
    if (rig.id === 'pedro_henrique') {
      // Comedic duck waddle
      targetBodyRoll = sinGait * 0.14;
      targetLeftWingZ = -0.18 - Math.abs(sinGait) * 0.22;
      targetRightWingZ = 0.18 + Math.abs(sinGait) * 0.22;
    }
  } else if (state === 'jump' || state === 'fall') {
    targetLeftLeg = 0.35;
    targetRightLeg = -0.25;
    targetLeftArmX = -0.65;
    targetRightArmX = -0.65;
    targetBodyPitch = state === 'jump' ? -0.1 : 0.12;
    if (rig.leftWing && rig.rightWing) {
      targetLeftWingZ = -0.85;
      targetRightWingZ = 0.85;
    }
  } else if (state === 'glide') {
    // Pedro Antonio majestic wingspan glide
    targetBodyPitch = 0.22;
    targetLeftLeg = -0.45;
    targetRightLeg = -0.45;
    targetLeftWingZ = -1.42 + Math.sin(rig.idleTime * 4.5) * 0.12;
    targetRightWingZ = 1.42 - Math.sin(rig.idleTime * 4.5) * 0.12;
    targetHeadPitch = -0.12;
  } else if (state === 'sit') {
    targetBodyY = baseBodyY - 0.28;
    targetLeftLeg = -1.35;
    targetRightLeg = -1.35;
    targetLeftArmX = -0.4;
    targetRightArmX = -0.4;
  } else if (state === 'celebrate') {
    targetBodyY = baseBodyY + Math.abs(Math.sin(rig.idleTime * 8)) * 0.22;
    targetLeftArmX = -2.4 + Math.sin(rig.idleTime * 10) * 0.35;
    targetRightArmX = -2.4 - Math.sin(rig.idleTime * 10) * 0.35;
    if (rig.leftWing && rig.rightWing) {
      targetLeftWingZ = -1.1 + Math.sin(rig.idleTime * 12) * 0.4;
      targetRightWingZ = 1.1 - Math.sin(rig.idleTime * 12) * 0.4;
    }
  }

  if (rig.interactTimer > 0) {
    targetRightArmX = -1.35;
    targetBodyPitch += 0.15;
  }

  // Quack beak animation for Pedro Henrique
  if (rig.upperBeak && rig.lowerBeak) {
    const quackOpen =
      state === 'quack' || rig.abilityTimer > 0
        ? 0.45 + Math.abs(Math.sin(rig.idleTime * 28)) * 0.35
        : 0.02 + Math.max(0, Math.sin(rig.idleTime * 2.5)) * 0.03;
    rig.upperBeak.rotation.x = damp(rig.upperBeak.rotation.x, -quackOpen * 0.45, 22, dt);
    rig.lowerBeak.rotation.x = damp(rig.lowerBeak.rotation.x, quackOpen, 22, dt);
    if (rig.abilityTimer > 0) {
      targetLeftWingZ = -1.15;
      targetRightWingZ = 1.15;
      targetHeadPitch = -0.25;
    }
  }

  // Articulated tail physics for Emanuel
  if (rig.tailSegments) {
    const speedFactor = Math.min(1.5, horizontalSpeed / 8);
    rig.tailSegments.forEach((seg, idx) => {
      const wave = Math.sin(rig.idleTime * (4 + speedFactor * 6) - idx * 0.7) * (0.14 + speedFactor * 0.18);
      seg.rotation.y = damp(seg.rotation.y, wave, 14, dt);
      const lift = state === 'sprint' ? -0.08 : -0.15 + Math.cos(rig.idleTime * 3 - idx) * 0.06;
      seg.rotation.x = damp(seg.rotation.x, idx === 0 ? -0.35 + lift : lift, 12, dt);
    });
  }

  // Harpy crest subtle reaction
  if (rig.crestLeft && rig.crestRight) {
    const alertFlare = state === 'glide' || rig.abilityTimer > 0 ? 0.25 : 0;
    rig.crestLeft.rotation.z = damp(rig.crestLeft.rotation.z, 0.28 + alertFlare, 10, dt);
    rig.crestRight.rotation.z = damp(rig.crestRight.rotation.z, -0.28 - alertFlare, 10, dt);
  }

  // Smooth exponential damping across all joints
  const k = 15;
  rig.bodyGroup.position.y = damp(rig.bodyGroup.position.y, targetBodyY, k, dt);
  rig.bodyGroup.rotation.x = damp(rig.bodyGroup.rotation.x, targetBodyPitch, k, dt);
  rig.bodyGroup.rotation.z = damp(rig.bodyGroup.rotation.z, targetBodyRoll, k, dt);
  rig.headGroup.rotation.x = damp(rig.headGroup.rotation.x, targetHeadPitch, k, dt);
  rig.headGroup.rotation.y = damp(rig.headGroup.rotation.y, targetHeadYaw, 10, dt);
  rig.leftLeg.rotation.x = damp(rig.leftLeg.rotation.x, targetLeftLeg, k, dt);
  rig.rightLeg.rotation.x = damp(rig.rightLeg.rotation.x, targetRightLeg, k, dt);
  rig.leftArm.rotation.x = damp(rig.leftArm.rotation.x, targetLeftArmX, k, dt);
  rig.rightArm.rotation.x = damp(rig.rightArm.rotation.x, targetRightArmX, k, dt);

  if (rig.leftWing && rig.rightWing) {
    rig.leftWing.rotation.z = damp(rig.leftWing.rotation.z, targetLeftWingZ, k, dt);
    rig.rightWing.rotation.z = damp(rig.rightWing.rotation.z, targetRightWingZ, k, dt);
  }
}
