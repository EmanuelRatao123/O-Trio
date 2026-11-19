import type {
  AttentionLevel,
  CharacterId,
  CharacterProfile,
  ColliderBox,
  FloorPlate,
  GameSettings,
  InventoryItem,
  RampBox,
  ReputationCategory,
  ReputationScores,
  SandboxChallenge,
  SaveData,
  SchedulePeriod,
  WeatherKind,
  ZoneDefinition,
  ZoneId,
} from './types';

export const SAVE_STORAGE_KEY = 'rt_o_trio_save_v1';
export const TOTAL_COLLECTIBLES = 18;

export const CHARACTER_PROFILES: Record<CharacterId, CharacterProfile> = {
  emanuel: {
    id: 'emanuel',
    name: 'Emanuel',
    species: 'Rato Antropomórfico',
    title: 'O Velocista dos Corredores',
    personality: 'Energético, curioso, impulsivo e muito rápido',
    description:
      'Ágil e imprevisível, Emanuel conhece cada atalho entre os armários e escapa de qualquer inspetor num piscar de olhos.',
    abilityName: 'SUPER SPRINT',
    abilityDescription:
      'Dispara em velocidade máxima pelos corredores e pelo pátio com rastro de poeira e impulso extra nos saltos.',
    abilityCooldown: 5.5,
    abilityDuration: 2.8,
    walkSpeed: 6.2,
    runSpeed: 10.6,
    sprintMultiplier: 1.72,
    jumpForce: 10.6,
    accentColor: '#38BDF8',
    badgeColor: '#0284C7',
    stats: {
      velocidade: 96,
      agilidade: 94,
      carisma: 74,
      exploracao: 88,
    },
  },
  pedro_henrique: {
    id: 'pedro_henrique',
    name: 'Pedro Henrique',
    species: 'Pato Antropomórfico',
    title: 'O Rei da Bagunça Sonora',
    personality: 'Cômico, barulhento, dramático e imprevisível',
    description:
      'Dono do grasnado mais temido da coordenação, Pedro Henrique transforma qualquer aula silenciosa num espetáculo caótico.',
    abilityName: 'QUACK DO CAOS',
    abilityDescription:
      'Solta um grasnado supersônico que assusta alunos, distrai professores e faz bolas e cadeiras vibrarem ao redor.',
    abilityCooldown: 4.5,
    abilityDuration: 1.2,
    walkSpeed: 5.4,
    runSpeed: 8.9,
    sprintMultiplier: 1.38,
    jumpForce: 10.1,
    accentColor: '#FACC15',
    badgeColor: '#D97706',
    stats: {
      velocidade: 76,
      agilidade: 80,
      carisma: 98,
      exploracao: 79,
    },
  },
  pedro_antonio: {
    id: 'pedro_antonio',
    name: 'Pedro Antonio',
    species: 'Águia-Harpia',
    title: 'O Explorador das Alturas',
    personality: 'Observador, confiante, aventureiro e destemido',
    description:
      'Com asas poderosas e crista inconfundível, Pedro Antonio alcança telhados, arquibancadas e passagens secretas no alto da escola.',
    abilityName: 'PLANAR NO CÉU',
    abilityDescription:
      'Abre as grandes asas no ar após saltar de pontos altos, controlando a descida e cruzando o pátio inteiro.',
    abilityCooldown: 1.0,
    abilityDuration: 4.5,
    walkSpeed: 5.8,
    runSpeed: 9.4,
    sprintMultiplier: 1.45,
    jumpForce: 11.4,
    accentColor: '#34D399',
    badgeColor: '#059669',
    stats: {
      velocidade: 84,
      agilidade: 92,
      carisma: 82,
      exploracao: 99,
    },
  },
};

export const DEFAULT_SETTINGS: GameSettings = {
  graphicsQuality: 'alto',
  resolutionScale: 1,
  shadowsEnabled: true,
  masterVolume: 0.75,
  musicVolume: 0.45,
  sfxVolume: 0.85,
  ambientVolume: 0.55,
  cameraSensitivity: 1.0,
  mobileSensitivity: 1.1,
  firstPersonDefault: false,
  showMobileControls: 'auto',
};

export const WORLD_ZONES: ZoneDefinition[] = [
  { id: 'entrada', label: 'Entrada Principal', minX: -24, maxX: 24, minZ: 34, maxZ: 56, color: '#F59E0B' },
  { id: 'patio', label: 'Pátio Central', minX: -30, maxX: 30, minZ: 4, maxZ: 34, color: '#10B981' },
  { id: 'salas_terreo', label: 'Prédio das Salas (Térreo)', minX: -48, maxX: 16, minZ: -32, maxZ: 4, maxY: 4.5, color: '#3B82F6' },
  { id: 'salas_superior', label: 'Prédio das Salas (2º Andar)', minX: -48, maxX: 16, minZ: -32, maxZ: 4, minY: 4.5, maxY: 10.5, color: '#6366F1' },
  { id: 'administracao', label: 'Administração & Diretoria', minX: 16, maxX: 46, minZ: -12, maxZ: 12, color: '#EC4899' },
  { id: 'ciencias_tech', label: 'Ciências & Informática', minX: 16, maxX: 46, minZ: -34, maxZ: -12, color: '#06B6D4' },
  { id: 'biblioteca', label: 'Biblioteca Central', minX: -48, maxX: -24, minZ: 4, maxZ: 30, color: '#8B5CF6' },
  { id: 'cantina', label: 'Cantina & Refeitório', minX: 30, maxX: 54, minZ: 12, maxZ: 36, color: '#F97316' },
  { id: 'esportes', label: 'Complexo Esportivo', minX: -62, maxX: -24, minZ: -64, maxZ: -32, color: '#22C55E' },
  { id: 'servico', label: 'Área de Serviço', minX: 46, maxX: 62, minZ: -28, maxZ: 8, color: '#64748B' },
  { id: 'secretos', label: 'Áreas Secretas & Terraço', minX: -48, maxX: 16, minZ: -32, maxZ: 4, minY: 10.5, color: '#E11D48', isSecret: true },
  { id: 'bairro', label: 'Bairro ao Redor', minX: -100, maxX: 100, minZ: -100, maxZ: 100, color: '#94A3B8' },
];

export function formatSchoolClock(totalMinutes: number): string {
  const normalized = ((Math.floor(totalMinutes) % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function getScheduleForMinutes(totalMinutes: number): {
  period: SchedulePeriod;
  label: string;
  announcement: string;
} {
  const m = ((Math.floor(totalMinutes) % 1440) + 1440) % 1440;
  if (m >= 420 && m < 460) {
    return {
      period: 'chegada',
      label: 'Chegada dos Alunos',
      announcement: 'Portões abertos! Alunos chegando para o turno da manhã.',
    };
  }
  if (m >= 460 && m < 580) {
    return {
      period: 'aulas_manha',
      label: 'Aulas da Manhã',
      announcement: 'Sinal tocou! Aulas da manhã em andamento nas salas.',
    };
  }
  if (m >= 580 && m < 640) {
    return {
      period: 'recreio',
      label: 'Recreio no Pátio',
      announcement: 'HORA DO RECREIO! Pátio, quadra e cantina liberados!',
    };
  }
  if (m >= 640 && m < 730) {
    return {
      period: 'almoco',
      label: 'Horário do Almoço',
      announcement: 'Almoço servido no Refeitório! Fila da merenda aberta.',
    };
  }
  if (m >= 730 && m < 960) {
    return {
      period: 'aulas_tarde',
      label: 'Aulas da Tarde',
      announcement: 'Turno da tarde! Professores chamando para as salas.',
    };
  }
  if (m >= 960 && m < 1040) {
    return {
      period: 'saida',
      label: 'Saída da Escola',
      announcement: 'Sinal de saída! Alunos indo em direção ao portão principal.',
    };
  }
  return {
    period: 'pos_aula',
    label: 'Pós-Aula & Exploração Livre',
    announcement: 'Período pós-aula: escola tranquila para segredos e futebol!',
  };
}

export function getAttentionLevel(value: number): AttentionLevel {
  if (value >= 80) return 'VERY_HIGH';
  if (value >= 50) return 'HIGH';
  if (value >= 22) return 'MEDIUM';
  return 'LOW';
}

export function getAttentionLabel(level: AttentionLevel): string {
  switch (level) {
    case 'LOW':
      return 'Tudo Tranquilo';
    case 'MEDIUM':
      return 'Olhares Curiosos';
    case 'HIGH':
      return 'Professor Investigando';
    case 'VERY_HIGH':
      return 'Alerta Geral na Escola!';
  }
}

export function decayAttention(value: number, dt: number, inSafeZone: boolean): number {
  const rate = inSafeZone ? 8.5 : 4.2;
  return Math.max(0, value - rate * dt);
}

export function addAttention(value: number, delta: number): number {
  return Math.min(100, Math.max(0, value + delta));
}

export function getDominantReputationTitle(rep: ReputationScores): string {
  const entries: Array<[ReputationCategory, number, string]> = [
    ['bagunceiro', rep.bagunceiro, 'Rei da Bagunça'],
    ['atleta', rep.atleta, 'Craque da Quadra'],
    ['explorador', rep.explorador, 'Desbravador da Escola'],
    ['popular', rep.popular, 'Queridinho do Pátio'],
    ['fugitivo', rep.fugitivo, 'Mestre das Fugas'],
    ['misterioso', rep.misterioso, 'Guardião dos Segredos'],
  ];
  entries.sort((a, b) => b[1] - a[1]);
  if (entries[0][1] < 10) return 'Calouro Recém-Chegado';
  return entries[0][2];
}

export function getZoneAtPosition(x: number, y: number, z: number): ZoneDefinition {
  // Check secret/elevated zones first
  if (y >= 9.6 && x >= -48 && x <= 16 && z >= -32 && z <= 4) {
    return WORLD_ZONES.find((zn) => zn.id === 'secretos')!;
  }
  // Secret basement/abandoned room near service/library
  if (x >= -48 && x <= -35 && z >= 23 && z <= 32) {
    return {
      id: 'secretos',
      label: 'Sala Abandonada 00',
      minX: -48,
      maxX: -35,
      minZ: 23,
      maxZ: 32,
      color: '#E11D48',
      isSecret: true,
    };
  }
  for (const zone of WORLD_ZONES) {
    if (zone.id === 'bairro' || zone.id === 'secretos') continue;
    const minY = zone.minY ?? -10;
    const maxY = zone.maxY ?? 30;
    if (x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ && y >= minY && y <= maxY) {
      return zone;
    }
  }
  return WORLD_ZONES[WORLD_ZONES.length - 1];
}

export function computeGroundHeightAt(
  x: number,
  y: number,
  z: number,
  floors: FloorPlate[],
  ramps: RampBox[],
): number {
  let highest = 0;

  for (const r of ramps) {
    if (x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ) {
      const t =
        r.axis === 'z'
          ? r.direction === 1
            ? (z - r.minZ) / Math.max(0.01, r.maxZ - r.minZ)
            : (r.maxZ - z) / Math.max(0.01, r.maxZ - r.minZ)
          : r.direction === 1
            ? (x - r.minX) / Math.max(0.01, r.maxX - r.minX)
            : (r.maxX - x) / Math.max(0.01, r.maxX - r.minX);
      const clampedT = Math.max(0, Math.min(1, t));
      const rampY = r.startY + (r.endY - r.startY) * clampedT;
      if (rampY <= y + 1.35 && rampY > highest) {
        highest = rampY;
      }
    }
  }

  for (const f of floors) {
    if (x >= f.minX && x <= f.maxX && z >= f.minZ && z <= f.maxZ) {
      if (f.y <= y + 1.15 && f.y > highest) {
        highest = f.y;
      }
    }
  }

  return highest;
}

export function resolveCircleAgainstBoxes(
  x: number,
  y: number,
  z: number,
  radius: number,
  actorHeight: number,
  boxes: ColliderBox[],
): { x: number; z: number } {
  let nx = x;
  let nz = z;

  for (let pass = 0; pass < 2; pass++) {
    for (const box of boxes) {
      if (box.isDoor && box.doorOpen) continue;
      // Vertical overlap check (skip boxes cleanly below feet or above head)
      if (y + actorHeight <= box.minY + 0.05 || y >= box.maxY - 0.15) continue;

      const closestX = Math.max(box.minX, Math.min(nx, box.maxX));
      const closestZ = Math.max(box.minZ, Math.min(nz, box.maxZ));
      const dx = nx - closestX;
      const dz = nz - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < radius * radius) {
        if (distSq > 0.00001) {
          const dist = Math.sqrt(distSq);
          const overlap = radius - dist;
          nx += (dx / dist) * overlap;
          nz += (dz / dist) * overlap;
        } else {
          // Inside box: push out along nearest edge
          const leftPen = Math.abs(nx - box.minX);
          const rightPen = Math.abs(box.maxX - nx);
          const frontPen = Math.abs(nz - box.minZ);
          const backPen = Math.abs(box.maxZ - nz);
          const minPen = Math.min(leftPen, rightPen, frontPen, backPen);
          if (minPen === leftPen) nx = box.minX - radius;
          else if (minPen === rightPen) nx = box.maxX + radius;
          else if (minPen === frontPen) nz = box.minZ - radius;
          else nz = box.maxZ + radius;
        }
      }
    }
  }

  return { x: nx, z: nz };
}

export function clampToWorldBounds(x: number, z: number): { x: number; z: number } {
  return {
    x: Math.max(-92, Math.min(92, x)),
    z: Math.max(-92, Math.min(92, z)),
  };
}

export function checkFootballGoal(
  ballX: number,
  ballY: number,
  ballZ: number,
): 'north' | 'south' | null {
  // Football field centered around (-43, -48), width ~24 (X: -55..-31), length ~28 (Z: -62..-34)
  if (ballY > 2.7) return null;
  if (ballX >= -46.8 && ballX <= -39.2) {
    if (ballZ <= -61.8 && ballZ >= -64.5) return 'north';
    if (ballZ >= -34.2 && ballZ <= -31.5) return 'south';
  }
  return null;
}

// Combinatorial Sandbox Matrix:
// 12 Zones × 8 Verbs × 15 Object/NPC Archetypes × 3 Characters × 7 Schedule Phases × 4 Weathers
// = 120,960 unique emergent situational combos!
const COMBO_VERBS = [
  'Explorar',
  'Chutar',
  'Distrair',
  'Sentar',
  'Coletar',
  'Ativar',
  'Conversar',
  'Escalar',
];

export function computeCombinatorialSpaceSize(): number {
  return 12 * COMBO_VERBS.length * 15 * 3 * 7 * 4; // 120,960 combinations
}

export function buildComboSignature(
  zone: ZoneId,
  verb: string,
  targetKey: string,
  character: CharacterId,
  period: SchedulePeriod,
): string {
  return `${zone}:${verb}:${targetKey}:${character}:${period}`;
}

export function createInitialChallenges(): SandboxChallenge[] {
  return [
    {
      id: 'ch_explore_zones',
      title: 'Explorar 6 áreas diferentes da escola',
      category: 'Exploracao',
      targetCount: 6,
      progress: 1,
      completed: false,
      rewardReputation: 'explorador',
    },
    {
      id: 'ch_score_goals',
      title: 'Marcar 3 gols no campo de futebol',
      category: 'Esportes',
      targetCount: 3,
      progress: 0,
      completed: false,
      rewardReputation: 'atleta',
    },
    {
      id: 'ch_chaos_pranks',
      title: 'Causar 5 travessuras sem ser pego',
      category: 'Caos',
      targetCount: 5,
      progress: 0,
      completed: false,
      rewardReputation: 'bagunceiro',
    },
    {
      id: 'ch_social_talk',
      title: 'Conversar com 6 alunos ou professores',
      category: 'Social',
      targetCount: 6,
      progress: 0,
      completed: false,
      rewardReputation: 'popular',
    },
    {
      id: 'ch_collect_secrets',
      title: 'Encontrar 4 itens colecionáveis escondidos',
      category: 'Escola',
      targetCount: 4,
      progress: 0,
      completed: false,
      rewardReputation: 'misterioso',
    },
  ];
}

export function addInventoryItem(
  list: InventoryItem[],
  item: Omit<InventoryItem, 'quantity'>,
  amount = 1,
): InventoryItem[] {
  const existing = list.find((i) => i.id === item.id);
  if (existing) {
    return list.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + amount } : i));
  }
  if (list.length >= 12) {
    return list;
  }
  return [...list, { ...item, quantity: amount }];
}

export function consumeInventoryItem(list: InventoryItem[], itemId: string): InventoryItem[] {
  return list
    .map((i) => (i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i))
    .filter((i) => i.quantity > 0);
}

export function createDefaultSaveData(): SaveData {
  return {
    version: 1,
    selectedCharacter: 'emanuel',
    playerPosition: { x: 0, y: 0, z: 22 },
    schoolMinutes: 575, // Starts right before Recreio (09:35) so the school is buzzing!
    weather: 'ensolarado',
    inventory: [
      {
        id: 'mochila_trio',
        name: 'Caderno do Trio',
        category: 'material',
        description: 'Anotações secretas de planos de recreio e desenhos do Pedro Henrique.',
        quantity: 1,
        icon: 'book',
      },
      {
        id: 'coxinha_lanche',
        name: 'Coxinha Dourada',
        category: 'comida',
        description: 'Salgado clássico da cantina. Dá energia e alegria instantânea!',
        quantity: 2,
        icon: 'food',
        consumable: true,
      },
    ],
    equippedItemId: 'mochila_trio',
    collectiblesFound: [],
    discoveredZones: ['patio'],
    reputation: {
      popular: 5,
      bagunceiro: 5,
      fugitivo: 0,
      atleta: 5,
      explorador: 5,
      misterioso: 0,
    },
    goalsScored: 0,
    npcGoalsScored: 0,
    chaosEventsTriggered: 0,
    combosDiscovered: 0,
    challenges: createInitialChallenges(),
    settings: { ...DEFAULT_SETTINGS },
    savedAt: Date.now(),
  };
}

export function parseSaveData(raw: string | null): SaveData | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    if (!parsed || parsed.version !== 1 || !parsed.selectedCharacter) return null;
    const base = createDefaultSaveData();
    return {
      ...base,
      ...parsed,
      reputation: { ...base.reputation, ...(parsed.reputation ?? {}) },
      settings: { ...base.settings, ...(parsed.settings ?? {}) },
      inventory: Array.isArray(parsed.inventory) ? parsed.inventory : base.inventory,
      collectiblesFound: Array.isArray(parsed.collectiblesFound) ? parsed.collectiblesFound : [],
      discoveredZones: Array.isArray(parsed.discoveredZones) ? parsed.discoveredZones : ['patio'],
      challenges: Array.isArray(parsed.challenges) && parsed.challenges.length > 0 ? parsed.challenges : base.challenges,
    };
  } catch {
    return null;
  }
}
