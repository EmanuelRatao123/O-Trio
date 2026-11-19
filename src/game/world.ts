import * as THREE from 'three';
import type { ColliderBox, FloorPlate, RampBox } from './types';
import type { MaterialLibrary } from './materials';

export type InteractableKind =
  | 'door'
  | 'secret_shelf'
  | 'chair'
  | 'food'
  | 'book'
  | 'computer'
  | 'fountain'
  | 'collectible'
  | 'bell'
  | 'basketball';

export interface WorldInteractable {
  id: string;
  kind: InteractableKind;
  label: string;
  prompt: string;
  position: THREE.Vector3;
  radius: number;
  mesh: THREE.Object3D;
  colliderId?: string;
  isOpen?: boolean;
  baseRotY?: number;
  collected?: boolean;
  consumed?: boolean;
  extra?: string;
}

export interface WorldData {
  root: THREE.Group;
  colliders: ColliderBox[];
  floors: FloorPlate[];
  ramps: RampBox[];
  interactables: WorldInteractable[];
  ceilingFans: THREE.Object3D[];
  fountainStreams: THREE.Mesh[];
  scoreboardDigits: { home: THREE.Mesh; away: THREE.Mesh };
  treesInstanced: THREE.InstancedMesh;
  raycastTargets: THREE.Object3D[];
}

interface PropTransform {
  x: number;
  y: number;
  z: number;
  ry?: number;
  sx?: number;
  sy?: number;
  sz?: number;
  color?: number;
}

export function buildSchoolWorld(mats: MaterialLibrary): WorldData {
  const root = new THREE.Group();
  const colliders: ColliderBox[] = [];
  const floors: FloorPlate[] = [];
  const ramps: RampBox[] = [];
  const interactables: WorldInteractable[] = [];
  const ceilingFans: THREE.Object3D[] = [];
  const fountainStreams: THREE.Mesh[] = [];
  const raycastTargets: THREE.Object3D[] = [];

  // Instanced prop collectors
  const deskTransforms: PropTransform[] = [];
  const chairTransforms: PropTransform[] = [];
  const lockerTransforms: PropTransform[] = [];
  const shelfTransforms: PropTransform[] = [];
  const benchTransforms: PropTransform[] = [];
  const treeTransforms: PropTransform[] = [];
  const lampTransforms: PropTransform[] = [];
  const windowTransforms: PropTransform[] = [];

  let cid = 0;
  const addBox = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    opts?: { collide?: boolean; castShadow?: boolean; receiveShadow?: boolean; tag?: string; raycast?: boolean },
  ): THREE.Mesh => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = opts?.castShadow ?? true;
    mesh.receiveShadow = opts?.receiveShadow ?? true;
    root.add(mesh);
    if (opts?.collide !== false) {
      colliders.push({
        id: `c_${cid++}`,
        minX: x - w / 2,
        maxX: x + w / 2,
        minY: y,
        maxY: y + h,
        minZ: z - d / 2,
        maxZ: z + d / 2,
        tag: opts?.tag,
      });
    }
    if (opts?.raycast) {
      raycastTargets.push(mesh);
    }
    return mesh;
  };

  const addFloor = (x: number, y: number, z: number, w: number, d: number, mat: THREE.Material, thickness = 0.2) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, thickness, d), mat);
    mesh.position.set(x, y - thickness / 2 + 0.01, z);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    root.add(mesh);
    if (y > 0.05) {
      floors.push({
        id: `fl_${cid++}`,
        minX: x - w / 2,
        maxX: x + w / 2,
        minZ: z - d / 2,
        maxZ: z + d / 2,
        y,
      });
    }
    return mesh;
  };

  const addDoor = (
    x: number,
    y: number,
    z: number,
    rotY: number,
    label: string,
    w = 2.0,
    h = 2.9,
  ) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, z);
    pivot.rotation.y = rotY;
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.14), mats.woodDark);
    leaf.position.set(w / 2, h / 2, 0);
    leaf.castShadow = true;
    leaf.receiveShadow = true;
    pivot.add(leaf);
    // Brass handle
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.24), mats.metalChrome);
    handle.position.set(w - 0.22, 1.25, 0);
    pivot.add(handle);
    root.add(pivot);

    // Collider centered on closed door
    const cos = Math.abs(Math.cos(rotY));
    const sin = Math.abs(Math.sin(rotY));
    const cx = x + (Math.cos(rotY) * w) / 2;
    const cz = z - (Math.sin(rotY) * w) / 2;
    const halfX = (w * cos + 0.2 * sin) / 2;
    const halfZ = (w * sin + 0.2 * cos) / 2;
    const doorColId = `door_${cid++}`;
    colliders.push({
      id: doorColId,
      minX: cx - halfX,
      maxX: cx + halfX,
      minY: y,
      maxY: y + h,
      minZ: cz - halfZ,
      maxZ: cz + halfZ,
      isDoor: true,
      doorOpen: false,
    });

    interactables.push({
      id: `int_${doorColId}`,
      kind: 'door',
      label,
      prompt: `Abrir ${label}`,
      position: new THREE.Vector3(cx, y + 1.2, cz),
      radius: 2.8,
      mesh: pivot,
      colliderId: doorColId,
      isOpen: false,
      baseRotY: rotY,
    });
  };

  const addStaircase = (
    minX: number,
    maxX: number,
    minZ: number,
    maxZ: number,
    startY: number,
    endY: number,
    axis: 'x' | 'z',
    direction: 1 | -1,
    steps = 14,
  ) => {
    ramps.push({
      id: `ramp_${cid++}`,
      minX,
      maxX,
      minZ,
      maxZ,
      startY,
      endY,
      axis,
      direction,
    });
    const w = maxX - minX;
    const d = maxZ - minZ;
    const totalH = endY - startY;
    for (let i = 0; i < steps; i++) {
      const t = (i + 0.5) / steps;
      const stepH = totalH / steps;
      const sy = startY + (i + 0.5) * stepH;
      if (axis === 'z') {
        const zPos = direction === 1 ? minZ + t * d : maxZ - t * d;
        const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(w, stepH, d / steps + 0.04), mats.concreteTrim);
        stepMesh.position.set((minX + maxX) / 2, sy, zPos);
        stepMesh.receiveShadow = true;
        stepMesh.castShadow = true;
        root.add(stepMesh);
      } else {
        const xPos = direction === 1 ? minX + t * w : maxX - t * w;
        const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(w / steps + 0.04, stepH, d), mats.concreteTrim);
        stepMesh.position.set(xPos, sy, (minZ + maxZ) / 2);
        stepMesh.receiveShadow = true;
        stepMesh.castShadow = true;
        root.add(stepMesh);
      }
    }
  };

  const addCeilingFan = (x: number, y: number, z: number) => {
    const fan = new THREE.Group();
    fan.position.set(x, y, z);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.25, 8), mats.metalDark);
    fan.add(hub);
    for (let i = 0; i < 3; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.04, 0.18), mats.woodDesk);
      blade.rotation.y = (i * Math.PI * 2) / 3;
      blade.position.set(Math.cos(blade.rotation.y) * 0.65, -0.05, -Math.sin(blade.rotation.y) * 0.65);
      fan.add(blade);
    }
    root.add(fan);
    ceilingFans.push(fan);
  };

  const addCollectible = (id: string, name: string, x: number, y: number, z: number, color: number, extra: string) => {
    const group = new THREE.Group();
    group.position.set(x, y + 0.45, z);
    const gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.32, 0),
      new THREE.MeshStandardMaterial({ color, roughness: 0.2, metalness: 0.65, emissive: color, emissiveIntensity: 0.25 }),
    );
    gem.castShadow = true;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.45, 0.04, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.3, metalness: 0.7 }),
    );
    ring.rotation.x = Math.PI / 2;
    group.add(gem, ring);
    root.add(group);
    interactables.push({
      id,
      kind: 'collectible',
      label: name,
      prompt: `Coletar ${name}`,
      position: new THREE.Vector3(x, y + 0.45, z),
      radius: 2.2,
      mesh: group,
      collected: false,
      extra,
    });
  };

  const addFoodItem = (id: string, name: string, x: number, y: number, z: number) => {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.05, 10), mats.paper);
    const snack = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.28, 8), mats.foodGold);
    snack.position.y = 0.15;
    group.add(plate, snack);
    root.add(group);
    interactables.push({
      id,
      kind: 'food',
      label: name,
      prompt: `Pegar ${name}`,
      position: new THREE.Vector3(x, y, z),
      radius: 2.1,
      mesh: group,
      consumed: false,
    });
  };

  // =========================================================================
  // 1. BASE TERRAIN & NEIGHBORHOOD STREETS (240m x 240m, no void!)
  // =========================================================================
  const groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), mats.grass);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.y = 0;
  groundMesh.receiveShadow = true;
  root.add(groundMesh);

  // Main street in front of school (Z: 56..68) + cross avenue (X: 66..78)
  addFloor(0, 0.02, 62, 220, 12, mats.asphalt, 0.04);
  addFloor(74, 0.02, 0, 12, 200, mats.asphalt, 0.04);
  // Sidewalks
  addFloor(0, 0.05, 53, 150, 6, mats.courtyardPaver, 0.08);
  addFloor(0, 0.05, 70, 190, 4, mats.courtyardPaver, 0.08);

  // Crosswalk stripes in front of main gate
  for (let i = -3; i <= 3; i++) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.03, 5.5), mats.paper);
    stripe.position.set(i * 2.2, 0.04, 62);
    stripe.receiveShadow = true;
    root.add(stripe);
  }

  // =========================================================================
  // 2. ZONE A & H: SCHOOL PERIMETER, MAIN GATE & COURTYARD (PÁTIO)
  // =========================================================================
  // Perimeter walls around school campus (leaving wide main gate at X: -6..6, Z: 48)
  addBox(-34, 0, 48, 56, 2.4, 0.5, mats.brickWall, { raycast: true }); // Front-left wall
  addBox(34, 0, 48, 56, 2.4, 0.5, mats.brickWall, { raycast: true }); // Front-right wall
  addBox(-64, 0, -8, 0.5, 2.4, 112, mats.brickWall, { raycast: true }); // West campus fence
  addBox(64, 0, -8, 0.5, 2.4, 112, mats.brickWall, { raycast: true }); // East campus fence
  addBox(0, 0, -65, 128, 2.4, 0.5, mats.brickWall, { raycast: true }); // North campus fence

  // Grand School Gate Archway & Sign ("E.E. PROF. TRIO VOXEL")
  addBox(-6.5, 0, 48, 1.2, 4.8, 1.2, mats.concreteTrim);
  addBox(6.5, 0, 48, 1.2, 4.8, 1.2, mats.concreteTrim);
  addBox(0, 4.2, 48, 14.5, 1.4, 1.1, mats.metalGate, { collide: false });
  const signMesh = new THREE.Mesh(new THREE.BoxGeometry(11.6, 1.8, 0.35), mats.schoolSign);
  signMesh.position.set(0, 5.4, 48.1);
  signMesh.castShadow = true;
  root.add(signMesh);

  // Security Booth (Guarita) at (-9.5, 44.5)
  addBox(-9.5, 0, 44.5, 4.0, 2.8, 3.6, mats.plasterWall, { raycast: true });
  addBox(-9.5, 2.8, 44.5, 4.6, 0.35, 4.2, mats.roofTerracotta);

  // Courtyard Paved Floor (Pátio Central: X: -30..30, Z: 4..48)
  addFloor(0, 0.03, 26, 60, 44, mats.courtyardPaver, 0.05);

  // Covered Recreation Awning (Pátio Coberto: X: -12..12, Z: 10..20)
  for (const px of [-10.5, 10.5]) {
    for (const pz of [11, 19]) {
      addBox(px, 0, pz, 0.5, 4.2, 0.5, mats.metalDark);
    }
  }
  addBox(0, 4.2, 15, 23, 0.35, 10, mats.plasticBlue, { collide: false });

  // Courtyard Monument / Flagpole + School Bell!
  addBox(-16, 0, 28, 2.8, 0.7, 2.8, mats.concreteTrim);
  addBox(-16, 0.7, 28, 0.25, 8.5, 0.25, mats.metalChrome);
  // Brazilian-inspired green/gold pennant
  addBox(-14.8, 7.6, 28, 2.1, 1.3, 0.08, mats.fabricGreen, { collide: false });
  addBox(-14.8, 8.0, 28, 1.1, 0.6, 0.1, mats.plasticYellow, { collide: false });

  // Interactive School Bell on Courtyard Pillar
  const bellMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 0.38, 12), mats.plasticYellow);
  bellMesh.position.set(-5.2, 2.4, 4.5);
  root.add(bellMesh);
  interactables.push({
    id: 'school_bell',
    kind: 'bell',
    label: 'Sinal da Escola',
    prompt: 'Tocar Sinal da Escola!',
    position: new THREE.Vector3(-5.2, 1.5, 4.5),
    radius: 2.5,
    mesh: bellMesh,
  });

  // Drinking Fountain in Courtyard
  const fountainMesh = addBox(14, 0, 12, 1.4, 1.0, 0.8, mats.metalChrome);
  const streamMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.07, 0.45, 8),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.75 }),
  );
  streamMesh.position.set(14, 1.25, 12);
  streamMesh.visible = false;
  root.add(streamMesh);
  fountainStreams.push(streamMesh);
  interactables.push({
    id: 'fountain_patio',
    kind: 'fountain',
    label: 'Bebedouro do Pátio',
    prompt: 'Beber Água no Bebedouro',
    position: new THREE.Vector3(14, 1.0, 12),
    radius: 2.4,
    mesh: fountainMesh,
    extra: '0',
  });

  // Playground Slide & Swings (X: 18..28, Z: 18..28)
  addBox(22, 0, 23, 2.2, 2.2, 2.2, mats.plasticRed);
  const slideRamp = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.16, 4.2), mats.plasticYellow);
  slideRamp.position.set(22, 1.1, 25.6);
  slideRamp.rotation.x = 0.52;
  slideRamp.castShadow = true;
  root.add(slideRamp);

  // Courtyard Benches & Recycling Bins
  for (const bx of [-18, -8, 8, 18]) {
    benchTransforms.push({ x: bx, y: 0, z: 32, ry: 0 });
  }
  const binColors = [mats.plasticBlue, mats.plasticRed, mats.fabricGreen, mats.plasticYellow];
  binColors.forEach((bMat, idx) => {
    addBox(12 + idx * 1.1, 0, 6.2, 0.75, 1.05, 0.75, bMat);
  });

  // =========================================================================
  // 3. ZONE B: 2-STORY CLASSROOM BUILDING (20 DISTINCT CLASSROOMS!) + ROOFTOP
  // Building footprint: X: -48..16 (64m wide), Z: -32..4 (36m deep)
  // South row of 5 rooms: Z: -8..4 (12m deep) -> Split into 5 rooms of 12.8m? Better: 10 rooms per floor!
  // Let's make 10 distinct classrooms on Ground Floor + 10 on Upper Floor = 20 classrooms!
  // X spans -48..16 (64m): 5 bays of 12.8m width? Wait: center bay X: -6..6 is Grand Foyer + Stairs!
  // So 5 bays per row: Bay0(-48..-35.2), Bay1(-35.2..-22.4), Bay2(-22.4..-9.6), [Stairs/Corridor], Bay3(-9.6..3.2), Bay4(3.2..16).
  // Actually cleaner: 5 bays of 12.8m on North row (Z: -32..-18) and 5 bays on South row (Z: -10..4),
  // with wide central corridor Z: -18..-10 (8m wide!), and central Foyer opening at X: -4..4, Z: 4!
  // =========================================================================
  addFloor(-16, 0.04, -14, 64, 36, mats.ceramicFloor, 0.08);
  // 2nd Floor slab at Y = 5.0 (leaving stairwells open at X: -9..-3, Z: -17..-11 and X: 3..9, Z: -17..-11)
  addFloor(-16, 5.0, -25, 64, 14, mats.ceramicFloor, 0.25); // North wing 2nd floor
  addFloor(-16, 5.0, -3, 64, 14, mats.ceramicFloor, 0.25); // South wing 2nd floor
  // Corridor bridges on 2nd floor around stairwells
  addFloor(-28.5, 5.0, -14, 39, 8, mats.ceramicFloor, 0.25);
  addFloor(12.5, 5.0, -14, 7, 8, mats.ceramicFloor, 0.25);
  addFloor(0, 5.0, -14, 6, 8, mats.ceramicFloor, 0.25);

  // Double Grand Staircases in central corridor (Ground Y=0 -> Floor 2 Y=5.0)
  addStaircase(-9, -3.5, -17, -11, 0, 5.0, 'x', -1, 14);
  addStaircase(3.5, 9, -17, -11, 0, 5.0, 'x', 1, 14);

  // Rooftop slab at Y = 10.0 (Terraço!) + Roof Access Staircase (X: 9..15, Z: -17..-11, Y: 5.0 -> 10.0)
  addFloor(-16, 10.0, -25, 64, 14, mats.concreteTrim, 0.25);
  addFloor(-16, 10.0, -3, 64, 14, mats.concreteTrim, 0.25);
  addFloor(-20, 10.0, -14, 56, 8, mats.concreteTrim, 0.25);
  addStaircase(9, 15, -17, -11, 5.0, 10.0, 'x', 1, 14);

  // Rooftop Parapet Walls & Water Tank Landmark ("CAIXA D'ÁGUA")
  addBox(-16, 10.0, 4, 64, 1.1, 0.4, mats.plasterWall);
  addBox(-16, 10.0, -32, 64, 1.1, 0.4, mats.plasterWall);
  addBox(-48, 10.0, -14, 0.4, 1.1, 36, mats.plasterWall);
  addBox(16, 10.0, -14, 0.4, 1.1, 36, mats.plasterWall);
  // Iconic Brazilian rooftop water tank + clock tower!
  addBox(0, 10.0, 1.2, 6.2, 5.2, 4.2, mats.plasterWall);
  addBox(0, 15.2, 1.2, 7.0, 0.6, 5.0, mats.roofTerracotta);
  const clockRim = new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.42, 0.16, 18), mats.metalDark);
  clockRim.rotation.x = Math.PI / 2;
  clockRim.position.set(0, 12.8, 3.3);
  const clockFace = new THREE.Mesh(new THREE.CylinderGeometry(1.24, 1.24, 0.2, 18), mats.paper);
  clockFace.rotation.x = Math.PI / 2;
  clockFace.position.set(0, 12.8, 3.34);
  const hourHand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.72, 0.08), mats.metalDark);
  hourHand.position.set(0.22, 12.96, 3.45);
  hourHand.rotation.z = -0.65;
  const minHand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.98, 0.08), mats.plasticRed);
  minHand.position.set(-0.24, 13.1, 3.46);
  minHand.rotation.z = 0.55;
  root.add(clockRim, clockFace, hourHand, minHand);
  // Blue rooftop water tank
  addBox(-36, 10.0, -24, 5.2, 3.8, 5.2, mats.plasticBlue);

  // Exterior Building Walls (Ground + 2nd Floor) with Main Entrance Doorway (X: -3..3, Z: 4)
  // Front wall Z = 4
  addBox(-25.5, 0, 4, 45, 10, 0.5, mats.plasterWall, { raycast: true });
  addBox(9.5, 0, 4, 13, 10, 0.5, mats.plasterWall, { raycast: true });
  addBox(0, 4.0, 4, 6, 6.0, 0.5, mats.plasterWall, { raycast: true }); // Header above grand entrance
  // Back wall Z = -32
  addBox(-16, 0, -32, 64, 10, 0.5, mats.plasterWall, { raycast: true });
  // West wall X = -48 (with doorway to library/sports)
  addBox(-48, 0, -23, 0.5, 10, 18, mats.plasterWall, { raycast: true });
  addBox(-48, 0, -2, 0.5, 10, 12, mats.plasterWall, { raycast: true });
  addBox(-48, 3.5, -11, 0.5, 6.5, 6, mats.plasterWall, { raycast: true });
  // East wall X = 16 (connects to Admin & Sciences)
  addBox(16, 0, -25, 0.5, 10, 14, mats.plasterWall, { raycast: true });
  addBox(16, 0, -3, 0.5, 10, 14, mats.plasterWall, { raycast: true });
  addBox(16, 3.5, -14, 0.5, 6.5, 8, mats.plasterWall, { raycast: true });

  // Windows along front facade
  for (let wx = -42; wx <= 12; wx += 6) {
    if (Math.abs(wx) < 5) continue;
    windowTransforms.push({ x: wx, y: 2.3, z: 4.28 });
    windowTransforms.push({ x: wx, y: 7.3, z: 4.28 });
  }

  // Generate 20 Individually Designed Classrooms (10 per floor!)
  const classroomThemes = [
    '101 · Matemática',
    '102 · Português',
    '103 · História',
    '104 · Geografia',
    '105 · Biologia',
    '106 · Química',
    '107 · Física',
    '108 · Inglês',
    '109 · Educação Moral',
    '110 · Reforço',
    '201 · Artes Visuais',
    '202 · Música & Coral',
    '203 · Literatura',
    '204 · Sociologia',
    '205 · Robótica',
    '206 · Redação',
    '207 · Filosofia',
    '208 · Geometria',
    '209 · Teatro Escolar',
    '210 · Clube do Xadrez',
  ];

  const bayCentersX = [-41.6, -28.8, -16.0, -3.2, 9.6]; // 5 bays of 12.8m width
  for (let floorIdx = 0; floorIdx < 2; floorIdx++) {
    const baseY = floorIdx * 5.0;
    for (let row = 0; row < 2; row++) {
      // row 0 = North Wing (Z: -32..-18), row 1 = South Wing (Z: -10..4)
      const roomZ = row === 0 ? -25 : -3;
      const corridorWallZ = row === 0 ? -18 : -10;

      for (let b = 0; b < 5; b++) {
        const roomIdx = floorIdx * 10 + row * 5 + b;
        const theme = classroomThemes[roomIdx];
        const rx = bayCentersX[b];

        // Skip doorway blocking front foyer on ground floor bay 3 (X: -3.2, row 1)
        const isFrontFoyer = floorIdx === 0 && row === 1 && b === 3;

        // Partition wall between bays
        if (b > 0) {
          const wallX = rx - 6.4;
          addBox(wallX, baseY, roomZ, 0.3, 4.8, 13.6, mats.plasterWall, { raycast: true });
        }

        // Corridor wall with doorway gap
        if (!isFrontFoyer) {
          addBox(rx - 3.6, baseY, corridorWallZ, 5.4, 4.8, 0.3, mats.plasterWall, { raycast: true });
          addBox(rx + 3.6, baseY, corridorWallZ, 5.4, 4.8, 0.3, mats.plasterWall, { raycast: true });
          addBox(rx, baseY + 3.0, corridorWallZ, 2.2, 1.8, 0.3, mats.plasterWall, { raycast: true });
          addDoor(rx - 1.0, baseY, corridorWallZ, 0, theme);
        }

        // Chalkboard on far/side wall
        const boardZ = row === 0 ? -31.5 : -0.5;
        if (!isFrontFoyer) {
          const board = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.8, 0.12), mats.chalkboard);
          board.position.set(rx, baseY + 2.2, boardZ);
          root.add(board);

          // Teacher desk
          deskTransforms.push({ x: rx - 2.6, y: baseY, z: row === 0 ? -29.2 : 1.2, ry: 0, sx: 1.35, sz: 1.15 });
          chairTransforms.push({ x: rx - 2.6, y: baseY, z: row === 0 ? -30.1 : 2.1, ry: row === 0 ? 0 : Math.PI });

          // Distinct student desk layouts per classroom!
          const layoutPattern = roomIdx % 3;
          const dir = row === 0 ? Math.PI : 0;
          if (layoutPattern === 0) {
            // Classic 2x3 rows
            for (let dr = 0; dr < 2; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                const dx = rx + dc * 2.5;
                const dz = roomZ + (dr === 0 ? -1.2 : 2.0);
                deskTransforms.push({ x: dx, y: baseY, z: dz, ry: dir });
                chairTransforms.push({ x: dx, y: baseY, z: dz + (row === 0 ? 0.85 : -0.85), ry: dir });
              }
            }
          } else if (layoutPattern === 1) {
            // Circle/U-shape discussion layout
            for (const dxOff of [-3.2, 3.2]) {
              for (const dzOff of [-1.6, 1.6]) {
                deskTransforms.push({ x: rx + dxOff, y: baseY, z: roomZ + dzOff, ry: dir });
                chairTransforms.push({
                  x: rx + dxOff + (dxOff > 0 ? 0.85 : -0.85),
                  y: baseY,
                  z: roomZ + dzOff,
                  ry: dxOff > 0 ? -Math.PI / 2 : Math.PI / 2,
                });
              }
            }
          } else {
            // Workshop / group tables
            for (const gx of [-2.4, 2.4]) {
              deskTransforms.push({ x: rx + gx, y: baseY, z: roomZ, ry: 0, sx: 1.4, sz: 1.4 });
              chairTransforms.push({ x: rx + gx - 0.9, y: baseY, z: roomZ, ry: Math.PI / 2 });
              chairTransforms.push({ x: rx + gx + 0.9, y: baseY, z: roomZ, ry: -Math.PI / 2 });
            }
          }

          // Posters & Ceiling Fan
          const posterMats = [mats.posterScience, mats.posterSports, mats.posterRules];
          const poster = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.4, 0.05), posterMats[roomIdx % 3]);
          poster.position.set(rx + 4.2, baseY + 2.3, boardZ);
          root.add(poster);
          addCeilingFan(rx, baseY + 4.5, roomZ);
        }
      }
    }

    // Hallway Lockers along ground & upper corridors
    for (let lx = -44; lx <= -14; lx += 3) {
      lockerTransforms.push({ x: lx, y: baseY, z: -17.3, ry: 0 });
    }
  }

  // Interactive classroom chairs sample (so player can sit in classrooms!)
  const sitSpots = [
    { id: 'chair_101', label: 'Cadeira da Sala 101', x: -41.6, y: 0, z: -24.0 },
    { id: 'chair_201', label: 'Cadeira de Artes 201', x: -41.6, y: 5.0, z: -24.0 },
    { id: 'chair_patio', label: 'Banco do Pátio', x: -8, y: 0, z: 32 },
  ];
  for (const s of sitSpots) {
    const marker = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.6), mats.plasticBlue);
    marker.position.set(s.x, s.y + 0.25, s.z);
    marker.visible = false;
    root.add(marker);
    interactables.push({
      id: s.id,
      kind: 'chair',
      label: s.label,
      prompt: `Sentar em ${s.label}`,
      position: new THREE.Vector3(s.x, s.y + 0.4, s.z),
      radius: 2.0,
      mesh: marker,
    });
  }

  // =========================================================================
  // 4. ZONE C: ADMINISTRAÇÃO (X: 16..46, Z: -12..12)
  // =========================================================================
  addFloor(31, 0.04, 0, 30, 24, mats.ceramicFloor, 0.08);
  addBox(31, 0, 12, 30, 4.8, 0.4, mats.plasterWall, { raycast: true });
  addBox(46, 0, 0, 0.4, 4.8, 24, mats.plasterWall, { raycast: true });
  addBox(31, 4.8, 0, 30.8, 0.5, 24.8, mats.roofTerracotta);
  // Principal desk & trophy shelf
  deskTransforms.push({ x: 38, y: 0, z: -4, ry: Math.PI / 2, sx: 1.6, sz: 1.2 });
  chairTransforms.push({ x: 40, y: 0, z: -4, ry: -Math.PI / 2 });
  shelfTransforms.push({ x: 44.5, y: 0, z: -6, ry: -Math.PI / 2 });
  addDoor(16, 0, -4, Math.PI / 2, 'Administração');

  // =========================================================================
  // 5. ZONE D: CIÊNCIAS & INFORMÁTICA (X: 16..46, Z: -34..-12)
  // =========================================================================
  addFloor(31, 0.04, -23, 30, 22, mats.ceramicFloor, 0.08);
  addBox(31, 0, -34, 30, 4.8, 0.4, mats.plasterWall, { raycast: true });
  addBox(46, 0, -23, 0.4, 4.8, 22, mats.plasterWall, { raycast: true });
  addBox(31, 4.8, -23, 30.8, 0.5, 22.8, mats.roofTerracotta);
  addDoor(16, 0, -22, Math.PI / 2, 'Lab de Informática & Ciências');

  // Computer Lab desks + Interactive PCs!
  for (let cx = 22; cx <= 38; cx += 5.5) {
    for (const cz of [-28, -18]) {
      deskTransforms.push({ x: cx, y: 0, z: cz, ry: 0 });
      const monitor = new THREE.Group();
      monitor.position.set(cx, 0.82, cz);
      const screen = new THREE.Mesh(
        new THREE.BoxGeometry(0.75, 0.52, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x0ea5e9, emissiveIntensity: 0.45, roughness: 0.2 }),
      );
      screen.position.y = 0.3;
      const stand = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.16), mats.metalDark);
      stand.position.y = 0.08;
      monitor.add(screen, stand);
      root.add(monitor);
      if (cz === -18 && (cx === 22 || cx === 33)) {
        interactables.push({
          id: `pc_${cx}`,
          kind: 'computer',
          label: 'Computador Escolar',
          prompt: 'Usar Computador (EduOS)',
          position: new THREE.Vector3(cx, 1.0, cz),
          radius: 2.4,
          mesh: monitor,
          extra: cx === 22 ? 'Portal da Escola & Notas' : 'Arquivos Secretos da Diretoria',
        });
      }
    }
  }

  // Science volcano project on display
  const volcano = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.1, 8), mats.brickWall);
  volcano.position.set(42, 0.55, -24);
  root.add(volcano);

  // =========================================================================
  // 6. ZONE E: BIBLIOTECA & SALA SECRETA 00 (X: -48..-24, Z: 4..30)
  // =========================================================================
  addFloor(-36, 0.04, 17, 24, 26, mats.woodDesk, 0.08);
  addBox(-48, 0, 17, 0.4, 4.8, 26, mats.plasterWall, { raycast: true });
  addBox(-36, 0, 30, 24, 4.8, 0.4, mats.plasterWall, { raycast: true });
  // East library wall with entrance doorway at Z: 15
  addBox(-24, 0, 9, 0.4, 4.8, 10, mats.plasterWall, { raycast: true });
  addBox(-24, 0, 24, 0.4, 4.8, 12, mats.plasterWall, { raycast: true });
  addBox(-24, 3.2, 16, 0.4, 1.6, 4, mats.plasterWall, { raycast: true });
  addDoor(-24, 0, 15, Math.PI / 2, 'Biblioteca');
  addBox(-36, 4.8, 17, 24.8, 0.5, 26.8, mats.roofTerracotta);

  // Bookshelves in library
  for (let sz = 8; sz <= 20; sz += 6) {
    shelfTransforms.push({ x: -34, y: 0, z: sz, ry: 0 });
    shelfTransforms.push({ x: -42, y: 0, z: sz, ry: 0 });
  }
  // Secret room divider wall at Z = 23 with a SLIDING SECRET BOOKSHELF!
  addBox(-30, 0, 23, 12, 4.8, 0.4, mats.plasterWall, { raycast: true });
  addBox(-44.5, 0, 23, 7, 4.8, 0.4, mats.plasterWall, { raycast: true });
  const secretShelfPivot = new THREE.Group();
  secretShelfPivot.position.set(-38.5, 0, 23);
  const shelfBody = addBox(0, 0, 0, 4.8, 3.6, 0.7, mats.woodDark, { collide: false });
  secretShelfPivot.add(shelfBody);
  // Adjust child local pos
  shelfBody.position.set(0, 1.8, 0);
  root.add(secretShelfPivot);
  const secretColId = `secret_shelf_${cid++}`;
  colliders.push({
    id: secretColId,
    minX: -41,
    maxX: -36,
    minY: 0,
    maxY: 3.6,
    minZ: 22.6,
    maxZ: 23.4,
    isDoor: true,
    doorOpen: false,
  });
  interactables.push({
    id: 'secret_bookshelf_door',
    kind: 'secret_shelf',
    label: 'Estante Misteriosa',
    prompt: 'Puxar Livro Secreto!',
    position: new THREE.Vector3(-38.5, 1.4, 23),
    radius: 2.8,
    mesh: secretShelfPivot,
    colliderId: secretColId,
    isOpen: false,
    baseRotY: 0,
  });

  // =========================================================================
  // 7. ZONE F: CANTINA & REFEITÓRIO (X: 30..54, Z: 12..36)
  // =========================================================================
  addFloor(42, 0.04, 24, 24, 24, mats.ceramicFloor, 0.08);
  addBox(54, 0, 24, 0.4, 4.5, 24, mats.plasterWall, { raycast: true });
  addBox(42, 0, 36, 24, 4.5, 0.4, mats.plasterWall, { raycast: true });
  addBox(42, 4.5, 24, 24.8, 0.5, 24.8, mats.roofTerracotta);
  // Open archway facing courtyard (X = 30)
  addBox(30, 0, 15, 0.4, 4.5, 6, mats.plasterWall, { raycast: true });
  addBox(30, 0, 33, 0.4, 4.5, 6, mats.plasterWall, { raycast: true });

  // Cafeteria Serving Counter & Kitchen Fridge
  addBox(49, 0, 24, 1.6, 1.15, 12, mats.metalChrome);
  addBox(52, 0, 18, 1.8, 2.8, 1.6, mats.metalChrome); // Fridge
  // Cafeteria Dining Tables
  for (const tx of [36, 42]) {
    for (const tz of [18, 24, 30]) {
      deskTransforms.push({ x: tx, y: 0, z: tz, ry: 0, sx: 1.6, sz: 1.2 });
      benchTransforms.push({ x: tx, y: 0, z: tz - 1.1, ry: 0 });
      benchTransforms.push({ x: tx, y: 0, z: tz + 1.1, ry: Math.PI });
    }
  }
  addFoodItem('food_coxinha_1', 'Coxinha Dourada', 48.8, 1.2, 21);
  addFoodItem('food_pao_queijo', 'Pão de Queijo Quentinho', 48.8, 1.2, 24);
  addFoodItem('food_suco', 'Suco de Maracujá', 48.8, 1.2, 27);

  // =========================================================================
  // 8. ZONE G: COMPLEXO ESPORTIVO (FOOTBALL + BASKETBALL + BLEACHERS)
  // =========================================================================
  // Football Field (X: -55..-31, Z: -62..-34)
  addFloor(-43, 0.03, -48, 24, 28, mats.footballPitch, 0.06);

  // North & South 3D Football Goals (X: -46.8..-39.2, Z: -62 and -34)
  const buildGoal = (gz: number, dirZ: number) => {
    addBox(-46.8, 0, gz, 0.22, 2.5, 0.22, mats.metalChrome);
    addBox(-39.2, 0, gz, 0.22, 2.5, 0.22, mats.metalChrome);
    addBox(-43, 2.5, gz, 7.8, 0.22, 0.22, mats.metalChrome);
    // Net frame back
    addBox(-46.8, 0, gz + dirZ * 1.4, 0.16, 2.2, 0.16, mats.metalChrome);
    addBox(-39.2, 0, gz + dirZ * 1.4, 0.16, 2.2, 0.16, mats.metalChrome);
    addBox(-43, 2.2, gz + dirZ * 1.4, 7.6, 0.16, 0.16, mats.metalChrome);
    const netMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.35, wireframe: true });
    const net = new THREE.Mesh(new THREE.BoxGeometry(7.6, 2.3, 1.4), netMat);
    net.position.set(-43, 1.2, gz + dirZ * 0.7);
    root.add(net);
  };
  buildGoal(-62, -1);
  buildGoal(-34, 1);

  // Bleachers (Arquibancada) along West side of pitch (X: -60..-56)
  for (let step = 0; step < 3; step++) {
    addBox(-57 - step * 1.2, step * 0.65, -48, 1.2, 0.65, 22, mats.concreteTrim);
  }

  // Digital Scoreboard (Placar)
  addBox(-30, 0, -61, 5.2, 4.2, 0.6, mats.metalDark);
  const homeDigit = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 1.4, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x16a34a, emissiveIntensity: 0.6 }),
  );
  homeDigit.position.set(-31.2, 2.8, -60.65);
  const awayDigit = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 1.4, 0.2),
    new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 0.6 }),
  );
  awayDigit.position.set(-28.8, 2.8, -60.65);
  root.add(homeDigit, awayDigit);

  // Basketball Court (X: -22..-4, Z: -60..-38)
  addFloor(-13, 0.03, -49, 18, 22, mats.basketballCourt, 0.06);
  for (const bz of [-59.5, -38.5]) {
    addBox(-13, 0, bz, 0.3, 3.6, 0.3, mats.metalDark);
    addBox(-13, 3.1, bz + (bz < -49 ? 0.5 : -0.5), 1.8, 1.2, 0.1, mats.paper);
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.05, 8, 16), mats.plasticRed);
    hoop.rotation.x = Math.PI / 2;
    hoop.position.set(-13, 3.0, bz + (bz < -49 ? 0.9 : -0.9));
    root.add(hoop);
  }

  // =========================================================================
  // 9. ZONE I: ÁREA DE SERVIÇO (X: 46..62, Z: -28..8)
  // =========================================================================
  addBox(54, 0, -14, 7, 3.6, 8, mats.brickWall, { raycast: true });
  addBox(54, 3.6, -14, 7.6, 0.4, 8.6, mats.roofTerracotta);
  addBox(56, 0, -2, 2.2, 1.4, 1.6, mats.fabricGreen); // Recycling dumpster

  // =========================================================================
  // 10. ZONE J: BAIRRO AO REDOR (HOUSES, PADARIA DO ZÉ, BUS STOP, PRAÇA, TREES)
  // =========================================================================
  // School Bus / Kombi parked on front avenue
  const busGroup = new THREE.Group();
  busGroup.position.set(16, 0, 58.5);
  const busBody = new THREE.Mesh(new THREE.BoxGeometry(6.8, 2.4, 2.5), mats.plasticYellow);
  busBody.position.y = 1.6;
  busBody.castShadow = true;
  const busStripe = new THREE.Mesh(new THREE.BoxGeometry(6.85, 0.45, 2.55), mats.metalGate);
  busStripe.position.y = 1.45;
  const busGlass = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.7, 2.54), mats.glassWindow);
  busGlass.position.y = 2.25;
  busGroup.add(busBody, busStripe, busGlass);
  for (const wx of [-2.0, 2.0]) {
    for (const wz of [-1.2, 1.2]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.3, 12), mats.rubberBlack);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(wx, 0.48, wz);
      busGroup.add(wheel);
    }
  }
  root.add(busGroup);
  colliders.push({ id: `bus_${cid++}`, minX: 12.6, maxX: 19.4, minY: 0, maxY: 3, minZ: 57.2, maxZ: 59.8 });

  // Bus stop shelter
  addBox(-14, 0, 53.5, 4.2, 2.6, 0.25, mats.metalGate);
  addBox(-14, 2.6, 54.4, 4.6, 0.2, 2.2, mats.plasticBlue);

  // Neighborhood Houses & Padaria do Zé across the street (Z: 72..88)
  const buildHouse = (hx: number, hz: number, w: number, h: number, d: number, wallMat: THREE.Material) => {
    addBox(hx, 0, hz, w, h, d, wallMat, { raycast: true });
    addBox(hx, h, hz, w + 0.8, 0.8, d + 0.8, mats.roofTerracotta);
    windowTransforms.push({ x: hx - 1.5, y: h * 0.55, z: hz - d / 2 - 0.05 });
    windowTransforms.push({ x: hx + 1.5, y: h * 0.55, z: hz - d / 2 - 0.05 });
  };
  buildHouse(-52, 79, 10, 4.5, 9, mats.plasterWall);
  buildHouse(-30, 80, 12, 5.2, 10, mats.brickWall); // Padaria do Zé
  buildHouse(-8, 79, 9, 4.4, 9, mats.plasterWall);
  buildHouse(48, 79, 11, 4.8, 9, mats.brickWall);
  buildHouse(-78, 12, 10, 4.6, 12, mats.plasterWall);
  buildHouse(-78, -22, 10, 4.6, 12, mats.brickWall);

  // Neighborhood Park Plaza (Praça: X: 14..36, Z: 72..88)
  addFloor(25, 0.03, 80, 22, 16, mats.courtyardPaver, 0.06);
  benchTransforms.push({ x: 20, y: 0, z: 78, ry: 0 });
  benchTransforms.push({ x: 30, y: 0, z: 78, ry: Math.PI });

  // Outer Perimeter Trees + Campus Trees
  const treeCoords: Array<[number, number]> = [
    [-26, 40],
    [-26, 30],
    [24, 40],
    [24, 28],
    [-12, 38],
    [12, 38],
    [-58, 28],
    [-58, 12],
    [-58, -12],
    [58, 28],
    [58, -32],
    [-24, -60],
    [10, -56],
    [28, -54],
    [46, -54],
    [-68, 56],
    [-46, 56],
    [36, 56],
    [60, 56],
    [25, 84],
    [18, 75],
    [33, 75],
  ];
  for (const [tx, tz] of treeCoords) {
    treeTransforms.push({ x: tx, y: 0, z: tz, sx: 0.9 + ((Math.abs(tx * 7 + tz) % 5) * 0.08) });
    colliders.push({
      id: `tree_${cid++}`,
      minX: tx - 0.5,
      maxX: tx + 0.5,
      minY: 0,
      maxY: 4,
      minZ: tz - 0.5,
      maxZ: tz + 0.5,
    });
  }
  // Distant border trees for natural horizon
  for (let angle = 0; angle < 24; angle++) {
    const a = (angle / 24) * Math.PI * 2;
    const tx = Math.cos(a) * 96;
    const tz = Math.sin(a) * 96;
    treeTransforms.push({ x: tx, y: 0, z: tz, sx: 1.2 + (angle % 3) * 0.15 });
  }

  // Streetlights along avenue
  for (let lx = -54; lx <= 54; lx += 18) {
    lampTransforms.push({ x: lx, y: 0, z: 55.5 });
  }

  // =========================================================================
  // COLLECTIBLES & SECRET NOTES (18 Total across all zones!)
  // =========================================================================
  const collectiblesSpec: Array<[string, string, number, number, number, number, string]> = [
    ['col_01', 'Distintivo do Pátio', 0, 0.2, 15, 0xfacc15, 'Encontrado sob a cobertura do pátio!'],
    ['col_02', 'Troféu da Diretoria', 42, 0.8, -6, 0xf59e0b, 'Premiação dourada de 1998!'],
    ['col_03', 'Diário Secreto 00', -42, 0.2, 27.5, 0xf43f5e, 'Escondido na Sala Abandonada 00!'],
    ['col_04', 'Caixa d\'Água Dourada', -36, 13.9, -24, 0x38bdf8, 'No topo da caixa d\'água da escola!'],
    ['col_05', 'Medalha da Arquibancada', -59.4, 2.0, -48, 0x22c55e, 'Na fila mais alta da arquibancada!'],
    ['col_06', 'Chuteira Lendária', -43, 0.1, -63.2, 0x10b981, 'Atrás da trave norte do campo!'],
    ['col_07', 'Microchip do Lab', 36, 0.8, -28, 0x06b6d4, 'Prototipo de informática do Pedro Antonio!'],
    ['col_08', 'Coxinha de Ouro', 51.5, 1.2, 15, 0xfbbf24, 'Relíquia secreta da Cantina!'],
    ['col_09', 'Pena da Harpia', 0, 10.1, -18, 0x34d399, 'Planando até o terraço do prédio!'],
    ['col_10', 'Bilhete do Emanuel', -41.6, 5.1, -25, 0x60a5fa, 'Escondido na sala de Artes 201!'],
    ['col_11', 'Apito do Inspetor', -9.5, 0.2, 42, 0xf97316, 'Perdido na guarita da entrada!'],
    ['col_12', 'Pão de Queijo Místico', -30, 0.2, 74, 0xfde047, 'Na frente da Padaria do Zé!'],
    ['col_13', 'Estrela da Praça', 25, 0.2, 80, 0xa855f7, 'No centro da praça do bairro!'],
    ['col_14', 'Livro Proibido', -44, 0.2, 10, 0x8b5cf6, 'Na estante mais funda da Biblioteca!'],
    ['col_15', 'Chave da Manutenção', 54, 0.2, -20, 0x94a3b8, 'Atrás da área de serviço!'],
    ['col_16', 'Bola de Basquete Ouro', -13, 0.2, -49, 0xfb923c, 'No círculo central da quadra!'],
    ['col_17', 'Relógio da Torre', 0, 10.1, 1.2, 0xeab308, 'Na torre do relógio da escola!'],
    ['col_18', 'Coroa do Recreio', 22, 2.3, 23, 0xec4899, 'No topo do escorregador!'],
  ];
  for (const [id, name, x, y, z, color, extra] of collectiblesSpec) {
    addCollectible(id, name, x, y, z, color, extra);
  }

  // =========================================================================
  // INSTANCED MESHES (HIGH PERFORMANCE!)
  // =========================================================================
  const buildInstanced = (geo: THREE.BufferGeometry, mat: THREE.Material, list: PropTransform[], castShadow = true) => {
    if (list.length === 0) return null;
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    im.castShadow = castShadow;
    im.receiveShadow = true;
    const dummy = new THREE.Object3D();
    list.forEach((t, i) => {
      dummy.position.set(t.x, t.y, t.z);
      dummy.rotation.set(0, t.ry ?? 0, 0);
      dummy.scale.set(t.sx ?? 1, t.sy ?? 1, t.sz ?? 1);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
      if (t.color !== undefined) {
        im.setColorAt(i, new THREE.Color(t.color));
      }
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.computeBoundingSphere();
    root.add(im);
    return im;
  };

  // Desks (merged box top + frame)
  const deskGeo = new THREE.BoxGeometry(1.3, 0.78, 0.85);
  deskGeo.translate(0, 0.39, 0);
  buildInstanced(deskGeo, mats.woodDesk, deskTransforms);

  // Chairs
  const chairGeo = new THREE.BoxGeometry(0.58, 0.48, 0.58);
  chairGeo.translate(0, 0.24, 0);
  buildInstanced(chairGeo, mats.plasticBlue, chairTransforms);

  // Lockers
  const lockerGeo = new THREE.BoxGeometry(0.9, 2.1, 0.65);
  lockerGeo.translate(0, 1.05, 0);
  buildInstanced(lockerGeo, mats.metalGate, lockerTransforms);

  // Bookshelves
  const shelfGeo = new THREE.BoxGeometry(3.4, 2.6, 0.7);
  shelfGeo.translate(0, 1.3, 0);
  buildInstanced(shelfGeo, mats.woodDark, shelfTransforms);

  // Benches
  const benchGeo = new THREE.BoxGeometry(2.4, 0.48, 0.65);
  benchGeo.translate(0, 0.24, 0);
  buildInstanced(benchGeo, mats.woodDesk, benchTransforms);

  // Windows
  const winGeo = new THREE.BoxGeometry(2.6, 1.6, 0.14);
  buildInstanced(winGeo, mats.glassWindow, windowTransforms, false);

  // Streetlamps
  const lampPoleGeo = new THREE.CylinderGeometry(0.12, 0.16, 4.8, 8);
  lampPoleGeo.translate(0, 2.4, 0);
  buildInstanced(lampPoleGeo, mats.metalDark, lampTransforms);

  // Composite Voxel Trees (Instanced trunks + Instanced layered canopy with color tint variation)
  const trunkGeo = new THREE.CylinderGeometry(0.32, 0.44, 3.0, 8);
  trunkGeo.translate(0, 1.5, 0);
  buildInstanced(trunkGeo, mats.trunk, treeTransforms);

  const canopyGeo = new THREE.BoxGeometry(3.2, 2.5, 3.2);
  canopyGeo.translate(0, 4.0, 0);
  const foliagePalette = [0x3b8c47, 0x4ca655, 0x2e7a3e, 0x5db863];
  const coloredTrees = treeTransforms.map((t, idx) => ({
    ...t,
    color: foliagePalette[idx % foliagePalette.length],
  }));
  const treesInstanced = buildInstanced(canopyGeo, mats.foliage, coloredTrees)!;

  // Upper tiered voxel foliage crown for layered tree silhouette
  const upperCanopyGeo = new THREE.BoxGeometry(2.1, 1.4, 2.1);
  upperCanopyGeo.translate(0, 5.75, 0);
  buildInstanced(upperCanopyGeo, mats.foliage, coloredTrees);

  return {
    root,
    colliders,
    floors,
    ramps,
    interactables,
    ceilingFans,
    fountainStreams,
    scoreboardDigits: { home: homeDigit, away: awayDigit },
    treesInstanced,
    raycastTargets,
  };
}
