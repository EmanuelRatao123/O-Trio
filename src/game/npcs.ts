import * as THREE from 'three';
import { resolveCircleAgainstBoxes } from './rules';
import type { ColliderBox, SchedulePeriod } from './types';

export type NpcRole = 'student' | 'teacher' | 'staff';
export type NpcPersonality =
  | 'Tímido'
  | 'Falante'
  | 'Engraçado'
  | 'Competitivo'
  | 'Curioso'
  | 'Professor Rígido'
  | 'Professor Amigável'
  | 'Funcionário';

export interface NpcActor {
  id: string;
  name: string;
  role: NpcRole;
  personality: NpcPersonality;
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  target: THREE.Vector3;
  yaw: number;
  speed: number;
  gaitPhase: number;
  waitTimer: number;
  stuckTimer: number;
  lastProgressPos: THREE.Vector3;
  stunTimer: number;
  alertTimer: number;
  footballer?: boolean;
  assignedRoom: THREE.Vector3;
  lastTalkTime: number;
}

const FIRST_NAMES = [
  'Lucas', 'Mariana', 'Gabriel', 'Julia', 'Matheus', 'Beatriz', 'Rafael', 'Camila',
  'Bruno', 'Larissa', 'Thiago', 'Amanda', 'Felipe', 'Isabela', 'Vinícius', 'Letícia',
  'Cauã', 'Yasmin', 'Enzo', 'Valentina', 'Davi', 'Sofia', 'Gustavo', 'Lorena',
];

const TEACHER_NAMES = [
  'Prof. Carlos', 'Profa. Márcia', 'Prof. Roberto', 'Profa. Helena',
  'Inspetor Jorge', 'Tia Rosa (Cantina)', 'Seu Antônio (Portaria)', 'Diretora Cláudia',
];

const DIALOGUES_BY_PERSONALITY: Record<NpcPersonality, string[]> = {
  Tímido: [
    'Oi... você viu meu caderno de matemática?',
    'Acho que o inspetor tá olhando pra gente...',
    'Eu gosto da biblioteca porque ninguém faz quack lá!',
  ],
  Falante: [
    'Cara, você não sabe o que aconteceu na sala 102 ontem!',
    'Bora pro pátio no recreio? Hoje tem coxinha quentinha!',
    'Você viu o Pedro Antonio voando perto da caixa d’água?!',
  ],
  Engraçado: [
    'Se o pato der mais um quack na prova, eu tiro dez em comédia!',
    'Dizem que tem uma sala secreta atrás da estante da biblioteca!',
    'O Emanuel corre mais rápido que o ônibus da saída!',
  ],
  Competitivo: [
    'Ninguém ganha do nosso time na quadra de futebol!',
    'Quer apostar corrida até o portão? Duvido me alcançar!',
    'Tô treinando pra fazer 5 gols hoje no recreio!',
  ],
  Curioso: [
    'Será que dá pra subir até o terraço da escola?',
    'Ouvi um barulho estranho perto da Sala Abandonada 00...',
    'Já testou os computadores do laboratório de informática?',
  ],
  'Professor Rígido': [
    'Comportamento exemplar nos corredores, por favor!',
    'Sem correr dentro do prédio! Andando devagar!',
    'Se continuar essa bagunça, vou chamar a Diretoria!',
  ],
  'Professor Amigável': [
    'Bom dia! Prontos para aprender coisas incríveis hoje?',
    'Aproveitem o recreio com responsabilidade e alegria!',
    'Adoro ver vocês explorando a feira de ciências!',
  ],
  Funcionário: [
    'Acabei de passar pano no corredor, cuidado pra não escorregar!',
    'A cantina tá servindo pão de queijo fresquinho!',
    'Portão principal fecha só depois da saída da tarde.',
  ],
};

function createProceduralNpcMesh(
  seed: number,
  role: NpcRole,
  contactShadowMat: THREE.Material,
): {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
} {
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = 0.65;
  root.add(body);

  const skinPalette = [0xf5d0b5, 0xe0ac82, 0xb87b52, 0x7c4b2c, 0xfde2cc];
  const hairPalette = [0x1e1b18, 0x4a2c18, 0xd97706, 0x0f172a, 0x7c2d12];
  const shirtPalette =
    role === 'teacher'
      ? [0x1e3a5f, 0x475569, 0x7c2d12, 0x065f46]
      : role === 'staff'
        ? [0xf97316, 0x0ea5e9, 0x64748b]
        : [0x2563eb, 0x16a34a, 0xeab308, 0xdc2626, 0x0891b2, 0x9333ea];

  const skinMat = new THREE.MeshStandardMaterial({ color: skinPalette[seed % skinPalette.length], roughness: 0.78 });
  const hairMat = new THREE.MeshStandardMaterial({ color: hairPalette[(seed * 3) % hairPalette.length], roughness: 0.85 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirtPalette[(seed * 7) % shirtPalette.length], roughness: 0.7 });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: role === 'teacher' ? 0x1e293b : 0x1d4ed8,
    roughness: 0.85,
  });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.66, 0.34), shirtMat);
  torso.position.y = 0.33;
  torso.castShadow = true;
  body.add(torso);

  // Backpack for some students
  if (role === 'student' && seed % 2 === 0) {
    const bag = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.44, 0.18),
      new THREE.MeshStandardMaterial({ color: hairPalette[(seed + 2) % hairPalette.length], roughness: 0.75 }),
    );
    bag.position.set(0, 0.34, -0.24);
    body.add(bag);
  }

  const head = new THREE.Group();
  head.position.set(0, 0.7, 0);
  body.add(head);

  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), skinMat);
  skull.position.y = 0.21;
  skull.castShadow = true;
  head.add(skull);

  // Varied voxel hairstyle
  const hairTop = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, seed % 3 === 0 ? 0.18 : 0.12, 0.45),
    hairMat,
  );
  hairTop.position.set(0, 0.44, -0.01);
  head.add(hairTop);
  if (seed % 4 === 1) {
    const backHair = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.32, 0.14), hairMat);
    backHair.position.set(0, 0.24, -0.2);
    head.add(backHair);
  }

  // Eyes
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 });
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.04), eyeMat);
    eye.position.set(s * 0.1, 0.23, 0.21);
    head.add(eye);
  }

  // Arms & Legs
  const armGeo = new THREE.BoxGeometry(0.14, 0.52, 0.15);
  armGeo.translate(0, -0.24, 0);
  const leftArm = new THREE.Mesh(armGeo, shirtMat);
  leftArm.position.set(-0.35, 0.6, 0);
  leftArm.castShadow = true;
  const rightArm = new THREE.Mesh(armGeo, shirtMat);
  rightArm.position.set(0.35, 0.6, 0);
  rightArm.castShadow = true;
  body.add(leftArm, rightArm);

  const legGeo = new THREE.BoxGeometry(0.18, 0.62, 0.2);
  legGeo.translate(0, -0.31, 0);
  const leftLeg = new THREE.Mesh(legGeo, pantsMat);
  leftLeg.position.set(-0.14, 0.65, 0);
  leftLeg.castShadow = true;
  const rightLeg = new THREE.Mesh(legGeo, pantsMat);
  rightLeg.position.set(0.14, 0.65, 0);
  rightLeg.castShadow = true;
  root.add(leftLeg, rightLeg);

  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.45, 14), contactShadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  root.add(shadow);

  return { root, body, head, leftArm, rightArm, leftLeg, rightLeg };
}

export class NpcPopulation {
  public actors: NpcActor[] = [];
  private root = new THREE.Group();

  constructor(scene: THREE.Scene, contactShadowMat: THREE.Material) {
    scene.add(this.root);
    this.spawnInitialPopulation(contactShadowMat);
  }

  private spawnInitialPopulation(contactShadowMat: THREE.Material) {
    const studentPersonalities: NpcPersonality[] = [
      'Tímido', 'Falante', 'Engraçado', 'Competitivo', 'Curioso',
    ];
    const classroomSpots = [
      new THREE.Vector3(-41.6, 0, -24),
      new THREE.Vector3(-28.8, 0, -24),
      new THREE.Vector3(-16.0, 0, -24),
      new THREE.Vector3(-3.2, 0, -24),
      new THREE.Vector3(9.6, 0, -24),
      new THREE.Vector3(-41.6, 0, -4),
      new THREE.Vector3(-28.8, 0, -4),
      new THREE.Vector3(-16.0, 0, -4),
      new THREE.Vector3(9.6, 0, -4),
    ];

    // 26 Students (including 4 dedicated footballers!)
    for (let i = 0; i < 26; i++) {
      const isFootballer = i < 4;
      const startPos = isFootballer
        ? new THREE.Vector3(-43 + (i - 1.5) * 4.5, 0, -48 + (i % 2 === 0 ? -6 : 6))
        : new THREE.Vector3(
            ((i * 17) % 44) - 22,
            0,
            10 + ((i * 11) % 24),
          );
      const rig = createProceduralNpcMesh(i + 1, 'student', contactShadowMat);
      rig.root.position.copy(startPos);
      this.root.add(rig.root);

      this.actors.push({
        id: `npc_stu_${i}`,
        name: FIRST_NAMES[i % FIRST_NAMES.length],
        role: 'student',
        personality: isFootballer ? 'Competitivo' : studentPersonalities[i % studentPersonalities.length],
        ...rig,
        position: startPos.clone(),
        velocity: new THREE.Vector3(),
        target: startPos.clone(),
        yaw: 0,
        speed: 2.7 + (i % 4) * 0.35,
        gaitPhase: i * 0.7,
        waitTimer: (i % 5) * 0.4,
        stuckTimer: 0,
        lastProgressPos: startPos.clone(),
        stunTimer: 0,
        alertTimer: 0,
        footballer: isFootballer,
        assignedRoom: classroomSpots[i % classroomSpots.length],
        lastTalkTime: -10,
      });
    }

    // 8 Teachers & School Staff
    const staffPositions = [
      new THREE.Vector3(-14, 0, -14), // Corridor teacher
      new THREE.Vector3(24, 0, -20), // Lab teacher
      new THREE.Vector3(-34, 0, 14), // Library teacher
      new THREE.Vector3(6, 0, 20), // Courtyard inspector
      new THREE.Vector3(-4, 0, 38), // Gate inspector
      new THREE.Vector3(46, 0, 24), // Tia Rosa (Cantina)
      new THREE.Vector3(-8, 0, 46), // Seu Antônio (Portaria)
      new THREE.Vector3(36, 0, -2), // Diretora Cláudia
    ];

    for (let i = 0; i < TEACHER_NAMES.length; i++) {
      const role: NpcRole = i >= 5 ? 'staff' : 'teacher';
      const personality: NpcPersonality =
        role === 'staff' ? 'Funcionário' : i % 2 === 0 ? 'Professor Rígido' : 'Professor Amigável';
      const pos = staffPositions[i].clone();
      const rig = createProceduralNpcMesh(100 + i, role, contactShadowMat);
      rig.root.position.copy(pos);
      this.root.add(rig.root);

      this.actors.push({
        id: `npc_staff_${i}`,
        name: TEACHER_NAMES[i],
        role,
        personality,
        ...rig,
        position: pos.clone(),
        velocity: new THREE.Vector3(),
        target: pos.clone(),
        yaw: 0,
        speed: role === 'teacher' ? 3.2 : 2.3,
        gaitPhase: 0,
        waitTimer: 1.0,
        stuckTimer: 0,
        lastProgressPos: pos.clone(),
        stunTimer: 0,
        alertTimer: 0,
        assignedRoom: pos.clone(),
        lastTalkTime: -10,
      });
    }
  }

  public pickScheduleTarget(actor: NpcActor, period: SchedulePeriod): THREE.Vector3 {
    if (actor.footballer) {
      return new THREE.Vector3(
        -43 + (Math.random() - 0.5) * 18,
        0,
        -48 + (Math.random() - 0.5) * 20,
      );
    }
    if (actor.role === 'staff') {
      return new THREE.Vector3(
        actor.assignedRoom.x + (Math.random() - 0.5) * 8,
        0,
        actor.assignedRoom.z + (Math.random() - 0.5) * 8,
      );
    }

    switch (period) {
      case 'chegada':
      case 'saida':
        return new THREE.Vector3((Math.random() - 0.5) * 18, 0, 34 + Math.random() * 14);
      case 'aulas_manha':
      case 'aulas_tarde':
        return new THREE.Vector3(
          actor.assignedRoom.x + (Math.random() - 0.5) * 6,
          0,
          actor.assignedRoom.z + (Math.random() - 0.5) * 6,
        );
      case 'almoco':
        return new THREE.Vector3(34 + Math.random() * 14, 0, 15 + Math.random() * 16);
      case 'recreio':
      case 'pos_aula':
      default:
        if (Math.random() < 0.25) {
          return new THREE.Vector3(-43 + (Math.random() - 0.5) * 16, 0, -48 + (Math.random() - 0.5) * 16);
        }
        return new THREE.Vector3((Math.random() - 0.5) * 42, 0, 8 + Math.random() * 24);
    }
  }

  public applyChaosBlast(origin: THREE.Vector3, radius: number, isQuack: boolean): number {
    let affected = 0;
    for (const actor of this.actors) {
      const dist = actor.position.distanceTo(origin);
      if (dist <= radius) {
        affected++;
        actor.alertTimer = 5.0;
        if (isQuack && actor.role === 'student') {
          actor.stunTimer = 1.1;
          const away = actor.position.clone().sub(origin);
          away.y = 0;
          if (away.lengthSq() < 0.01) away.set(1, 0, 0);
          away.normalize().multiplyScalar(5.5);
          actor.velocity.copy(away);
        } else if (actor.role === 'teacher') {
          actor.target.copy(origin);
          actor.waitTimer = 0;
        }
      }
    }
    return affected;
  }

  public getDialogueFor(actor: NpcActor, attentionHigh: boolean): string {
    if (attentionHigh && actor.role === 'teacher') {
      return 'Ei! Pare aí mesmo! O que vocês três estão aprontando?!';
    }
    const pool = DIALOGUES_BY_PERSONALITY[actor.personality];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    period: SchedulePeriod,
    attentionHigh: boolean,
    colliders: ColliderBox[],
    ballPos: THREE.Vector3,
  ): void {
    for (const actor of this.actors) {
      const distToPlayer = actor.position.distanceTo(playerPos);

      // Comedic stun recovery
      if (actor.stunTimer > 0) {
        actor.stunTimer = Math.max(0, actor.stunTimer - dt);
        actor.position.addScaledVector(actor.velocity, dt);
        actor.velocity.multiplyScalar(Math.exp(-6 * dt));
        const resolved = resolveCircleAgainstBoxes(actor.position.x, 0, actor.position.z, 0.42, 1.7, colliders);
        actor.position.x = resolved.x;
        actor.position.z = resolved.z;
        actor.root.position.copy(actor.position);
        actor.body.rotation.z = Math.sin(actor.stunTimer * 18) * 0.28;
        continue;
      }

      actor.body.rotation.z = THREE.MathUtils.lerp(actor.body.rotation.z, 0, 1 - Math.exp(-10 * dt));
      actor.alertTimer = Math.max(0, actor.alertTimer - dt);

      // LOD: Distant NPCs update smoothly with simplified check
      if (distToPlayer > 75 && !actor.footballer) {
        continue;
      }

      // Teachers chase player when attention is high and within range
      if (actor.role === 'teacher' && attentionHigh && distToPlayer < 24) {
        actor.target.copy(playerPos);
        actor.waitTimer = 0;
      } else if (actor.footballer) {
        // Footballers chase the ball when nearby
        if (actor.position.distanceTo(ballPos) < 18) {
          actor.target.copy(ballPos);
        }
      }

      if (actor.waitTimer > 0) {
        actor.waitTimer -= dt;
        actor.leftLeg.rotation.x = THREE.MathUtils.lerp(actor.leftLeg.rotation.x, 0, 10 * dt);
        actor.rightLeg.rotation.x = THREE.MathUtils.lerp(actor.rightLeg.rotation.x, 0, 10 * dt);
        actor.leftArm.rotation.x = THREE.MathUtils.lerp(actor.leftArm.rotation.x, 0, 10 * dt);
        actor.rightArm.rotation.x = THREE.MathUtils.lerp(actor.rightArm.rotation.x, 0, 10 * dt);
        continue;
      }

      const dx = actor.target.x - actor.position.x;
      const dz = actor.target.z - actor.position.z;
      const distSq = dx * dx + dz * dz;

      if (distSq < 1.8) {
        actor.waitTimer = actor.footballer ? 0.2 : 1.5 + Math.random() * 2.5;
        actor.target.copy(this.pickScheduleTarget(actor, period));
        actor.stuckTimer = 0;
        continue;
      }

      const dist = Math.sqrt(distSq);
      const moveSpeed =
        actor.role === 'teacher' && attentionHigh && distToPlayer < 24
          ? actor.speed * 1.45
          : actor.footballer
            ? actor.speed * 1.35
            : actor.speed;

      const stepX = (dx / dist) * moveSpeed * dt;
      const stepZ = (dz / dist) * moveSpeed * dt;
      actor.position.x += stepX;
      actor.position.z += stepZ;

      const resolved = resolveCircleAgainstBoxes(actor.position.x, 0, actor.position.z, 0.42, 1.7, colliders);
      actor.position.x = resolved.x;
      actor.position.z = resolved.z;

      // Anti-stuck watchdog
      if (actor.position.distanceToSquared(actor.lastProgressPos) < 0.04 * dt) {
        actor.stuckTimer += dt;
        if (actor.stuckTimer > 1.6) {
          actor.target.copy(this.pickScheduleTarget(actor, period));
          actor.stuckTimer = 0;
        }
      } else {
        actor.stuckTimer = 0;
        actor.lastProgressPos.copy(actor.position);
      }

      // Smooth rotation & walk gait
      const targetYaw = Math.atan2(dx, dz);
      let diff = targetYaw - actor.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      actor.yaw += diff * Math.min(1, 8 * dt);

      actor.root.position.copy(actor.position);
      actor.root.rotation.y = actor.yaw;

      actor.gaitPhase += moveSpeed * dt * 1.55;
      const swing = Math.sin(actor.gaitPhase) * 0.55;
      actor.leftLeg.rotation.x = swing;
      actor.rightLeg.rotation.x = -swing;
      actor.leftArm.rotation.x = -swing * 0.7;
      actor.rightArm.rotation.x = swing * 0.7;
    }
  }
}
