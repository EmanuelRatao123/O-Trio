export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';

export type CharacterId = 'emanuel' | 'pedro_henrique' | 'pedro_antonio';

export type SchedulePeriod =
  | 'chegada'
  | 'aulas_manha'
  | 'recreio'
  | 'almoco'
  | 'aulas_tarde'
  | 'saida'
  | 'pos_aula';

export type WeatherKind = 'ensolarado' | 'nublado' | 'chuvoso' | 'tempestade';

export type AttentionLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

export type ReputationCategory =
  | 'popular'
  | 'bagunceiro'
  | 'fugitivo'
  | 'atleta'
  | 'explorador'
  | 'misterioso';

export type ZoneId =
  | 'entrada'
  | 'salas_terreo'
  | 'salas_superior'
  | 'administracao'
  | 'ciencias_tech'
  | 'biblioteca'
  | 'cantina'
  | 'esportes'
  | 'patio'
  | 'servico'
  | 'secretos'
  | 'bairro';

export interface CharacterProfile {
  id: CharacterId;
  name: string;
  species: string;
  title: string;
  personality: string;
  description: string;
  abilityName: string;
  abilityDescription: string;
  abilityCooldown: number;
  abilityDuration: number;
  walkSpeed: number;
  runSpeed: number;
  sprintMultiplier: number;
  jumpForce: number;
  accentColor: string;
  badgeColor: string;
  stats: {
    velocidade: number;
    agilidade: number;
    carisma: number;
    exploracao: number;
  };
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'material' | 'esporte' | 'comida' | 'colecionavel' | 'secreto' | 'engracado';
  description: string;
  quantity: number;
  icon: string;
  consumable?: boolean;
  throwable?: boolean;
}

export interface SandboxChallenge {
  id: string;
  title: string;
  category: 'Exploracao' | 'Social' | 'Esportes' | 'Escola' | 'Caos';
  targetCount: number;
  progress: number;
  completed: boolean;
  rewardReputation: ReputationCategory;
}

export interface ZoneDefinition {
  id: ZoneId;
  label: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY?: number;
  maxY?: number;
  color: string;
  isSecret?: boolean;
}

export interface ColliderBox {
  id: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  isDoor?: boolean;
  doorOpen?: boolean;
  tag?: string;
}

export interface RampBox {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  startY: number;
  endY: number;
  axis: 'x' | 'z';
  direction: 1 | -1;
}

export interface FloorPlate {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  y: number;
}

export type GraphicsPreset = 'baixo' | 'medio' | 'alto' | 'ultra';

export interface GameSettings {
  graphicsQuality: GraphicsPreset;
  resolutionScale: number;
  shadowsEnabled: boolean;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  ambientVolume: number;
  cameraSensitivity: number;
  mobileSensitivity: number;
  firstPersonDefault: boolean;
  showMobileControls: 'auto' | 'always' | 'never';
}

export interface ReputationScores {
  popular: number;
  bagunceiro: number;
  fugitivo: number;
  atleta: number;
  explorador: number;
  misterioso: number;
}

export interface SaveData {
  version: number;
  selectedCharacter: CharacterId;
  playerPosition: { x: number; y: number; z: number };
  schoolMinutes: number;
  weather: WeatherKind;
  inventory: InventoryItem[];
  equippedItemId: string | null;
  collectiblesFound: string[];
  discoveredZones: ZoneId[];
  reputation: ReputationScores;
  goalsScored: number;
  npcGoalsScored: number;
  chaosEventsTriggered: number;
  combosDiscovered: number;
  challenges: SandboxChallenge[];
  settings: GameSettings;
  savedAt: number;
}

export interface HudSnapshot {
  phase: GamePhase;
  character: CharacterId;
  stamina: number;
  maxStamina: number;
  abilityCooldownRemaining: number;
  abilityActive: boolean;
  isGliding: boolean;
  firstPerson: boolean;
  schoolMinutes: number;
  schedulePeriod: SchedulePeriod;
  scheduleLabel: string;
  weather: WeatherKind;
  currentZone: ZoneId;
  currentZoneLabel: string;
  attentionValue: number;
  attentionLevel: AttentionLevel;
  reputation: ReputationScores;
  dominantTitle: string;
  interactionPrompt: string | null;
  interactionTargetId: string | null;
  dialogueSpeaker: string | null;
  dialogueText: string | null;
  announcement: string | null;
  inventory: InventoryItem[];
  equippedItemId: string | null;
  collectiblesFound: string[];
  totalCollectibles: number;
  discoveredZones: ZoneId[];
  goalsScored: number;
  npcGoalsScored: number;
  chaosEventsTriggered: number;
  combosDiscovered: number;
  challenges: SandboxChallenge[];
  playerX: number;
  playerY: number;
  playerZ: number;
  playerYaw: number;
  npcMarkers: Array<{ x: number; z: number; role: 'student' | 'teacher' | 'staff'; alert: boolean }>;
  activeComputerTitle: string | null;
}
