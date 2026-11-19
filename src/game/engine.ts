import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ProceduralAudio } from './audio';
import {
  createCharacterRig,
  triggerRigSquash,
  updateCharacterAnimation,
  type AnimState,
  type CharacterRig,
} from './characters';
import { SportsSystem } from './football';
import { createMaterialLibrary, type MaterialLibrary } from './materials';
import { NpcPopulation, type NpcActor } from './npcs';
import {
  addAttention,
  addInventoryItem,
  buildComboSignature,
  CHARACTER_PROFILES,
  clampToWorldBounds,
  computeGroundHeightAt,
  consumeInventoryItem,
  createDefaultSaveData,
  decayAttention,
  getAttentionLevel,
  getDominantReputationTitle,
  getScheduleForMinutes,
  getZoneAtPosition,
  parseSaveData,
  resolveCircleAgainstBoxes,
  SAVE_STORAGE_KEY,
  TOTAL_COLLECTIBLES,
} from './rules';
import { createProceduralTextures, type TextureBundle } from './textures';
import type {
  CharacterId,
  GamePhase,
  GameSettings,
  HudSnapshot,
  ReputationCategory,
  SaveData,
  SchedulePeriod,
  WeatherKind,
} from './types';
import { buildSchoolWorld, type WorldData, type WorldInteractable } from './world';

// Pre-allocated scratch math objects (Zero GC inside render loop)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _rayOrigin = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _skyDay = new THREE.Color(0x7ec8f2);
const _skySunset = new THREE.Color(0xf59e6b);
const _skyNight = new THREE.Color(0x14223b);
const _skyRain = new THREE.Color(0x64748b);
const _sunColorDay = new THREE.Color(0xfff4d6);
const _sunColorSunset = new THREE.Color(0xff9b54);
const _sunColorNight = new THREE.Color(0x6e8cc8);

interface PooledParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
}

export class GameEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private textures: TextureBundle;
  private materials: MaterialLibrary;
  private world: WorldData;
  private npcs: NpcPopulation;
  private sports: SportsSystem;
  private audio: ProceduralAudio;

  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private rimLight: THREE.DirectionalLight;

  private playerRigs: Record<CharacterId, CharacterRig>;
  private activeRig: CharacterRig;
  private phase: GamePhase = 'title';
  private saveState: SaveData;

  // Physics & movement
  private playerPos = new THREE.Vector3(0, 0, 22);
  private playerVel = new THREE.Vector3(0, 0, 0);
  private playerYaw = Math.PI; // Facing -Z toward school building
  private onGround = true;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private footstepDist = 0;
  private isSitting = false;
  private sittingPos = new THREE.Vector3();

  // Ability & stamina
  private stamina = 100;
  private maxStamina = 100;
  private abilityCooldown = 0;
  private abilityActiveTimer = 0;
  private isGliding = false;

  // Camera
  private camYaw = 0;
  private camPitch = 0.26;
  private camDist = 7.4;
  private camPos = new THREE.Vector3(0, 5, 32);
  private camLook = new THREE.Vector3(0, 2, 18);
  private camTrauma = 0;
  private firstPerson = false;
  private raycaster = new THREE.Raycaster();
  private titleTourTime = 0;

  // Simulation state
  private attentionValue = 0;
  private lastPeriod: SchedulePeriod = 'recreio';
  private announcementText: string | null = null;
  private announcementTimer = 0;
  private dialogueSpeaker: string | null = null;
  private dialogueText: string | null = null;
  private dialogueTimer = 0;
  private activeComputerTitle: string | null = null;
  private hitstopTimer = 0;
  private weatherTimer = 95;
  private autoSaveTimer = 0;
  private hudSyncTimer = 0;
  private seenCombos = new Set<string>();

  // Pooled particles & rain
  private particlePool: PooledParticle[] = [];
  private particleCursor = 0;
  private particleMesh: THREE.InstancedMesh;
  private rainMesh: THREE.InstancedMesh;
  private rainDrops: Array<{ x: number; y: number; z: number; speed: number }> = [];

  // Input state
  private heldKeys = new Set<string>();
  private justPressed = new Set<string>();
  private isDraggingLook = false;
  private pointerDown = false;
  private mobileMove = { x: 0, y: 0 };
  private mobileSprint = false;

  // Loop management
  private frameId = 0;
  private lastTime = performance.now();
  private disposed = false;
  private onHudUpdate: (snapshot: HudSnapshot) => void;

  // Bound listeners
  private handleKeyDown: (e: KeyboardEvent) => void;
  private handleKeyUp: (e: KeyboardEvent) => void;
  private handleBlur: () => void;
  private handleResize: () => void;
  private handleMouseDown: (e: MouseEvent) => void;
  private handleMouseUp: () => void;
  private handleMouseMove: (e: MouseEvent) => void;
  private handleWheel: (e: WheelEvent) => void;

  constructor(container: HTMLElement, onHudUpdate: (snapshot: HudSnapshot) => void, autostart: boolean) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;

    // Load saved state or create fresh sandbox state
    const loaded = parseSaveData(localStorage.getItem(SAVE_STORAGE_KEY));
    this.saveState = loaded ?? createDefaultSaveData();
    this.playerPos.set(
      this.saveState.playerPosition.x,
      this.saveState.playerPosition.y,
      this.saveState.playerPosition.z,
    );
    this.firstPerson = this.saveState.settings.firstPersonDefault;

    // Detect software WebGL once via GPU renderer string
    this.isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: this.isSoftwareGl,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    this.applyGraphicsSettings(this.saveState.settings);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x7ec8f2);
    this.scene.fog = new THREE.FogExp2(0x7ec8f2, 0.0062);

    // Mandatory studio environment reflection map
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(
      62,
      (container.clientWidth || window.innerWidth) / Math.max(1, container.clientHeight || window.innerHeight),
      0.15,
      260,
    );

    // 3-point warm/cool outdoor studio rig
    this.hemiLight = new THREE.HemisphereLight(0x9bd7ff, 0x6b5c49, 0.72);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff4d6, 1.85);
    this.sunLight.position.set(42, 68, 36);
    this.sunLight.castShadow = !this.isSoftwareGl && this.saveState.settings.shadowsEnabled;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.near = 5;
    this.sunLight.shadow.camera.far = 160;
    const d = 48;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.rimLight = new THREE.DirectionalLight(0xa5d8ff, 0.4);
    this.rimLight.position.set(-40, 28, -45);
    this.scene.add(this.rimLight);

    // Textures, Materials, World, Characters, NPCs, Sports, Audio
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTextures(maxAniso);
    this.materials = createMaterialLibrary(this.textures);
    this.world = buildSchoolWorld(this.materials);
    this.scene.add(this.world.root);

    this.playerRigs = {
      emanuel: createCharacterRig('emanuel', this.materials.contactShadow),
      pedro_henrique: createCharacterRig('pedro_henrique', this.materials.contactShadow),
      pedro_antonio: createCharacterRig('pedro_antonio', this.materials.contactShadow),
    };
    Object.values(this.playerRigs).forEach((rig) => this.scene.add(rig.root));
    this.activeRig = this.playerRigs[this.saveState.selectedCharacter];

    this.npcs = new NpcPopulation(this.scene, this.materials.contactShadow);
    this.sports = new SportsSystem(this.scene, this.materials.contactShadow);
    this.audio = new ProceduralAudio(this.saveState.settings);

    // Pooled InstancedMesh particles (capacity 120)
    const pGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
    const pMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    this.particleMesh = new THREE.InstancedMesh(pGeo, pMat, 120);
    this.particleMesh.frustumCulled = false;
    this.scene.add(this.particleMesh);
    for (let i = 0; i < 120; i++) {
      this.particlePool.push({
        active: false,
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        size: 1,
        color: new THREE.Color(0xffffff),
      });
      _mat4.makeTranslation(0, -100, 0);
      this.particleMesh.setMatrixAt(i, _mat4);
      this.particleMesh.setColorAt(i, new THREE.Color(0xffffff));
    }

    // Pooled Rain InstancedMesh (capacity 240)
    const rGeo = new THREE.BoxGeometry(0.03, 0.75, 0.03);
    const rMat = new THREE.MeshBasicMaterial({ color: 0xcbe7ff, transparent: true, opacity: 0.55 });
    this.rainMesh = new THREE.InstancedMesh(rGeo, rMat, 240);
    this.rainMesh.frustumCulled = false;
    this.rainMesh.visible = false;
    this.scene.add(this.rainMesh);
    for (let i = 0; i < 240; i++) {
      this.rainDrops.push({
        x: (Math.random() - 0.5) * 44,
        y: Math.random() * 18,
        z: (Math.random() - 0.5) * 44,
        speed: 18 + Math.random() * 8,
      });
    }

    // Restore previously opened doors & collected items
    for (const item of this.world.interactables) {
      if (item.kind === 'collectible' && this.saveState.collectiblesFound.includes(item.id)) {
        item.collected = true;
        item.mesh.visible = false;
      }
    }

    this.lastPeriod = getScheduleForMinutes(this.saveState.schoolMinutes).period;
    this.positionRigsForState();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // Setup event listeners
    this.handleKeyDown = (e) => {
      this.audio.unlock();
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (this.phase === 'playing') {
          if (this.activeComputerTitle) {
            this.activeComputerTitle = null;
            this.emitHud();
          } else {
            this.pauseGame();
          }
          return;
        } else if (this.phase === 'paused') {
          this.resumeGame();
          return;
        }
      }
      if (this.phase !== 'playing' || this.activeComputerTitle) return;

      if (!this.heldKeys.has(e.code)) {
        this.justPressed.add(e.code);
      }
      this.heldKeys.add(e.code);

      if (e.code === 'Space') {
        this.jumpBufferTimer = 0.14;
      }
      if (e.code === 'Digit1') this.switchCharacter('emanuel');
      if (e.code === 'Digit2') this.switchCharacter('pedro_henrique');
      if (e.code === 'Digit3') this.switchCharacter('pedro_antonio');
      if (e.code === 'KeyV') this.toggleFirstPerson();
      if (e.code === 'KeyE') this.triggerInteract();
      if (e.code === 'KeyQ') this.triggerAbility();
    };

    this.handleKeyUp = (e) => {
      this.heldKeys.delete(e.code);
      // Variable jump height cut
      if (e.code === 'Space' && this.playerVel.y > 2.5 && !this.isGliding) {
        this.playerVel.y *= 0.48;
      }
    };

    this.handleBlur = () => {
      this.heldKeys.clear();
      this.pointerDown = false;
      this.isDraggingLook = false;
    };

    this.handleResize = () => {
      const w = this.container.clientWidth || window.innerWidth;
      const h = Math.max(1, this.container.clientHeight || window.innerHeight);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      this.renderer.render(this.scene, this.camera);
    };

    this.handleMouseDown = (e) => {
      this.audio.unlock();
      if (this.phase !== 'playing') return;
      if (e.target === this.renderer.domElement) {
        this.pointerDown = true;
        this.isDraggingLook = true;
      }
    };

    this.handleMouseUp = () => {
      this.pointerDown = false;
      this.isDraggingLook = false;
    };

    this.handleMouseMove = (e) => {
      if (this.phase !== 'playing') return;
      if (this.isDraggingLook || document.pointerLockElement === this.renderer.domElement) {
        const sens = 0.0042 * this.saveState.settings.cameraSensitivity;
        this.camYaw -= e.movementX * sens;
        this.camPitch = THREE.MathUtils.clamp(this.camPitch + e.movementY * sens, -0.35, 1.15);
      }
    };

    this.handleWheel = (e) => {
      if (this.phase !== 'playing' || this.firstPerson) return;
      this.camDist = THREE.MathUtils.clamp(this.camDist + e.deltaY * 0.005, 3.5, 13.5);
    };

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('wheel', this.handleWheel, { passive: true });

    if (autostart) {
      this.startGame();
    } else {
      document.body.dataset.state = 'title';
      this.emitHud();
    }

    this.lastTime = performance.now();
    this.loop();
  }

  private positionRigsForState(): void {
    if (this.phase === 'title') {
      // Trio posed together in the sunny courtyard!
      this.playerRigs.emanuel.root.visible = true;
      this.playerRigs.pedro_henrique.root.visible = true;
      this.playerRigs.pedro_antonio.root.visible = true;

      this.playerRigs.emanuel.root.position.set(-1.9, 0, 22.5);
      this.playerRigs.emanuel.root.rotation.y = 0.28;
      this.playerRigs.pedro_henrique.root.position.set(0, 0, 21.8);
      this.playerRigs.pedro_henrique.root.rotation.y = 0;
      this.playerRigs.pedro_antonio.root.position.set(1.9, 0, 22.5);
      this.playerRigs.pedro_antonio.root.rotation.y = -0.28;
    } else {
      (Object.keys(this.playerRigs) as CharacterId[]).forEach((id) => {
        this.playerRigs[id].root.visible = id === this.saveState.selectedCharacter && !this.firstPerson;
      });
      this.activeRig.root.position.copy(this.playerPos);
      this.activeRig.root.rotation.y = this.playerYaw;
    }
  }

  public startGame(): void {
    this.audio.unlock();
    this.audio.playUiClick();
    this.phase = 'playing';
    document.body.dataset.state = 'playing';
    this.heldKeys.clear();
    this.justPressed.clear();
    this.positionRigsForState();
    this.announcementText = 'Bem-vindo à Escola! Explore, jogue futebol ou cause confusão!';
    this.announcementTimer = 4.5;
    this.emitHud();
  }

  public pauseGame(): void {
    if (this.phase !== 'playing') return;
    this.phase = 'paused';
    document.body.dataset.state = 'paused';
    this.heldKeys.clear();
    document.exitPointerLock?.();
    this.emitHud();
  }

  public resumeGame(): void {
    if (this.phase !== 'paused') return;
    this.phase = 'playing';
    document.body.dataset.state = 'playing';
    this.heldKeys.clear();
    this.emitHud();
  }

  public returnToTitle(): void {
    this.saveNow();
    this.phase = 'title';
    document.body.dataset.state = 'title';
    this.heldKeys.clear();
    this.activeComputerTitle = null;
    this.positionRigsForState();
    this.emitHud();
  }

  public switchCharacter(id: CharacterId): void {
    if (this.saveState.selectedCharacter === id) return;
    this.saveState.selectedCharacter = id;
    this.activeRig = this.playerRigs[id];
    this.isGliding = false;
    this.abilityActiveTimer = 0;
    this.abilityCooldown = 0;
    this.isSitting = false;
    this.positionRigsForState();
    triggerRigSquash(this.activeRig, 1.2, 0.85);
    this.spawnBurst(this.playerPos.x, this.playerPos.y + 0.9, this.playerPos.z, 12, 0xfacc15);
    this.audio.playCharacterVoice(id);
    this.emitHud();
  }

  public toggleFirstPerson(): void {
    this.firstPerson = !this.firstPerson;
    this.positionRigsForState();
    this.audio.playUiClick();
    this.emitHud();
  }

  public triggerJump(): void {
    this.audio.unlock();
    this.jumpBufferTimer = 0.14;
    this.isSitting = false;
  }

  public triggerAbility(): void {
    if (this.phase !== 'playing') return;
    this.audio.unlock();
    const id = this.saveState.selectedCharacter;
    const profile = CHARACTER_PROFILES[id];

    if (id === 'pedro_antonio') {
      // Sky glide toggles mid-air or boosts jump!
      if (this.onGround) {
        this.playerVel.y = profile.jumpForce * 1.15;
        this.onGround = false;
        this.isGliding = true;
        this.audio.playCharacterVoice(id);
        this.spawnBurst(this.playerPos.x, this.playerPos.y + 0.6, this.playerPos.z, 10, 0x34d399);
      } else {
        this.isGliding = !this.isGliding;
      }
      this.emitHud();
      return;
    }

    if (this.abilityCooldown > 0) return;

    this.abilityCooldown = profile.abilityCooldown;
    this.abilityActiveTimer = profile.abilityDuration;
    this.activeRig.abilityTimer = profile.abilityDuration;
    this.audio.playCharacterVoice(id);

    if (id === 'emanuel') {
      this.spawnBurst(this.playerPos.x, this.playerPos.y + 0.4, this.playerPos.z, 14, 0x38bdf8);
      this.recordCombo('Ativar', 'SuperSprint');
    } else if (id === 'pedro_henrique') {
      // CHAOS QUACK shockwave!
      this.camTrauma = Math.min(1, this.camTrauma + 0.5);
      this.hitstopTimer = 0.04;
      this.spawnBurst(this.playerPos.x, this.playerPos.y + 1.0, this.playerPos.z, 22, 0xfacc15);
      const hitNpcs = this.npcs.applyChaosBlast(this.playerPos, 11, true);

      // Vibrate nearby balls too!
      for (const ball of this.sports.balls) {
        const d = ball.position.distanceTo(this.playerPos);
        if (d < 10) {
          this.sports.kickBall(
            ball,
            ball.position.x - this.playerPos.x,
            ball.position.z - this.playerPos.z,
            11,
            6,
          );
        }
      }

      if (hitNpcs > 0) {
        this.attentionValue = addAttention(this.attentionValue, 18 + hitNpcs * 4);
        this.saveState.chaosEventsTriggered++;
        this.awardReputation('bagunceiro', 4);
        this.advanceChallenge('ch_chaos_pranks', 1);
      }
      this.recordCombo('Distrair', 'QuackDoCaos');
    }
    this.emitHud();
  }

  public triggerInteract(): void {
    if (this.phase !== 'playing') return;
    this.audio.unlock();
    this.activeRig.interactTimer = 0.35;

    // 1. Check nearby football / basketball to kick!
    for (const ball of this.sports.balls) {
      if (ball.position.distanceTo(this.playerPos) < 2.6) {
        const forwardX = Math.sin(this.playerYaw);
        const forwardZ = Math.cos(this.playerYaw);
        this.sports.kickBall(ball, forwardX, forwardZ, 15.5, 6.2);
        this.audio.playKick();
        this.camTrauma = Math.min(1, this.camTrauma + 0.22);
        this.spawnBurst(ball.position.x, ball.position.y, ball.position.z, 8, 0xffffff);
        this.recordCombo('Chutar', ball.kind);
        return;
      }
    }

    // 2. Check world interactable nearest to player
    const target = this.findNearestInteractable();
    if (target) {
      this.handleWorldInteractable(target);
      return;
    }

    // 3. Check nearby NPC to talk to!
    const nearestNpc = this.findNearestNpc();
    if (nearestNpc) {
      const high = getAttentionLevel(this.attentionValue) === 'HIGH' || getAttentionLevel(this.attentionValue) === 'VERY_HIGH';
      this.dialogueSpeaker = `${nearestNpc.name} (${nearestNpc.personality})`;
      this.dialogueText = this.npcs.getDialogueFor(nearestNpc, high);
      this.dialogueTimer = 4.2;
      if (performance.now() - nearestNpc.lastTalkTime > 4000) {
        nearestNpc.lastTalkTime = performance.now();
        this.awardReputation('popular', 3);
        this.advanceChallenge('ch_social_talk', 1);
      }
      this.recordCombo('Conversar', nearestNpc.personality);
      this.audio.playUiClick();
      this.emitHud();
    }
  }

  private handleWorldInteractable(item: WorldInteractable): void {
    if (item.kind === 'door' || item.kind === 'secret_shelf') {
      item.isOpen = !item.isOpen;
      const col = this.world.colliders.find((c) => c.id === item.colliderId);
      if (col) col.doorOpen = item.isOpen;
      this.audio.playDoor();

      if (item.kind === 'secret_shelf') {
        item.mesh.position.x = item.isOpen ? -43.0 : -38.5;
        item.prompt = item.isOpen ? 'Fechar Passagem Secreta' : 'Puxar Livro Secreto!';
        if (item.isOpen) {
          this.announcementText = 'Passagem Secreta aberta! Bem-vindo à Sala Abandonada 00!';
          this.announcementTimer = 4.0;
          this.awardReputation('misterioso', 8);
        }
      } else {
        item.mesh.rotation.y = (item.baseRotY ?? 0) + (item.isOpen ? Math.PI * 0.48 : 0);
        item.prompt = `${item.isOpen ? 'Fechar' : 'Abrir'} ${item.label}`;
      }
      this.recordCombo('Ativar', item.label);
    } else if (item.kind === 'collectible' && !item.collected) {
      item.collected = true;
      item.mesh.visible = false;
      this.saveState.collectiblesFound.push(item.id);
      this.saveState.inventory = addInventoryItem(this.saveState.inventory, {
        id: item.id,
        name: item.label,
        category: 'colecionavel',
        description: item.extra ?? 'Item raro encontrado na escola!',
        icon: 'star',
      });
      this.audio.playPickup();
      this.spawnBurst(item.position.x, item.position.y, item.position.z, 18, 0xfacc15);
      this.announcementText = `Colecionável encontrado: ${item.label}!`;
      this.announcementTimer = 3.8;
      this.awardReputation('explorador', 6);
      this.awardReputation('misterioso', 4);
      this.advanceChallenge('ch_collect_secrets', 1);
      this.recordCombo('Coletar', item.label);
      this.saveNow();
    } else if (item.kind === 'food' && !item.consumed) {
      item.consumed = true;
      item.mesh.visible = false;
      this.saveState.inventory = addInventoryItem(this.saveState.inventory, {
        id: item.id,
        name: item.label,
        category: 'comida',
        description: 'Lanche delicioso da cantina! Restaura energia.',
        icon: 'food',
        consumable: true,
      });
      this.audio.playPickup();
      this.announcementText = `Pegou ${item.label} para o inventário!`;
      this.announcementTimer = 3.0;
      this.recordCombo('Coletar', item.label);
    } else if (item.kind === 'fountain') {
      this.stamina = this.maxStamina;
      item.extra = '2.5';
      this.fountainWaterSplash(item.position);
      this.audio.playPickup();
      this.announcementText = 'Água geladinha! Energia restaurada em 100%.';
      this.announcementTimer = 2.6;
      this.recordCombo('Ativar', 'Bebedouro');
    } else if (item.kind === 'bell') {
      this.audio.playBell();
      this.camTrauma = Math.min(1, this.camTrauma + 0.4);
      this.attentionValue = addAttention(this.attentionValue, 26);
      this.saveState.chaosEventsTriggered++;
      this.awardReputation('bagunceiro', 6);
      this.advanceChallenge('ch_chaos_pranks', 1);
      this.npcs.applyChaosBlast(this.playerPos, 18, false);
      this.announcementText = 'TRIIIIM! Você tocou o sinal da escola fora de hora!';
      this.announcementTimer = 3.6;
      this.recordCombo('Ativar', 'SinalDaEscola');
    } else if (item.kind === 'chair') {
      this.isSitting = !this.isSitting;
      if (this.isSitting) {
        this.sittingPos.copy(item.position);
        this.playerPos.set(item.position.x, item.position.y - 0.15, item.position.z);
        this.playerVel.set(0, 0, 0);
      }
      this.audio.playUiClick();
      this.recordCombo('Sentar', item.label);
    } else if (item.kind === 'computer') {
      this.activeComputerTitle = item.extra ?? 'EduOS 2026';
      this.audio.playUiClick();
      this.recordCombo('Ativar', 'Computador');
    }
    this.emitHud();
  }

  private fountainWaterSplash(pos: THREE.Vector3): void {
    this.spawnBurst(pos.x, pos.y + 0.3, pos.z, 10, 0x38bdf8);
    this.world.fountainStreams.forEach((s) => {
      s.visible = true;
      setTimeout(() => {
        s.visible = false;
      }, 1400);
    });
  }

  public useInventoryItem(itemId: string): void {
    const item = this.saveState.inventory.find((i) => i.id === itemId);
    if (!item) return;
    if (item.consumable) {
      this.saveState.inventory = consumeInventoryItem(this.saveState.inventory, itemId);
      this.stamina = this.maxStamina;
      this.audio.playPickup();
      triggerRigSquash(this.activeRig, 1.24, 0.84);
      this.spawnBurst(this.playerPos.x, this.playerPos.y + 1.0, this.playerPos.z, 12, 0xfbbf24);
      this.announcementText = `Você comeu ${item.name}! Energia no máximo!`;
      this.announcementTimer = 2.8;
    } else {
      this.saveState.equippedItemId = itemId;
      this.audio.playUiClick();
    }
    this.emitHud();
  }

  public dropInventoryItem(itemId: string): void {
    this.saveState.inventory = consumeInventoryItem(this.saveState.inventory, itemId);
    if (this.saveState.equippedItemId === itemId) {
      this.saveState.equippedItemId = null;
    }
    this.audio.playUiClick();
    this.emitHud();
  }

  public closeComputer(): void {
    this.activeComputerTitle = null;
    this.emitHud();
  }

  public setMobileMove(x: number, y: number): void {
    this.mobileMove.x = x;
    this.mobileMove.y = y;
  }

  public setMobileSprint(active: boolean): void {
    this.mobileSprint = active;
  }

  public addMobileLook(dx: number, dy: number): void {
    const sens = 0.0055 * this.saveState.settings.mobileSensitivity;
    this.camYaw -= dx * sens;
    this.camPitch = THREE.MathUtils.clamp(this.camPitch + dy * sens, -0.35, 1.15);
  }

  public updateSettings(next: GameSettings): void {
    this.saveState.settings = { ...next };
    this.applyGraphicsSettings(next);
    this.audio.applySettings(next);
    this.saveNow();
    this.emitHud();
  }

  private applyGraphicsSettings(s: GameSettings): void {
    const dprCap =
      this.isSoftwareGl
        ? 1
        : s.graphicsQuality === 'baixo'
          ? 0.85
          : s.graphicsQuality === 'medio'
            ? 1.15
            : s.graphicsQuality === 'alto'
              ? 1.5
              : 2.0;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap) * s.resolutionScale);
    const useShadows = !this.isSoftwareGl && s.shadowsEnabled && s.graphicsQuality !== 'baixo';
    this.renderer.shadowMap.enabled = useShadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if (this.sunLight) {
      this.sunLight.castShadow = useShadows;
    }
  }

  public setWeather(w: WeatherKind): void {
    this.saveState.weather = w;
    this.announcementText = `Clima alterado para: ${w.toUpperCase()}`;
    this.announcementTimer = 2.5;
    this.emitHud();
  }

  public setTimeOfDay(minutes: number): void {
    this.saveState.schoolMinutes = minutes;
    this.emitHud();
  }

  public toggleMute(): boolean {
    this.audio.unlock();
    const next = !this.audio.isMuted();
    this.audio.setMuted(next);
    return next;
  }

  public isMuted(): boolean {
    return this.audio.isMuted();
  }

  public saveNow(): void {
    this.saveState.playerPosition = {
      x: Number(this.playerPos.x.toFixed(2)),
      y: Number(this.playerPos.y.toFixed(2)),
      z: Number(this.playerPos.z.toFixed(2)),
    };
    this.saveState.savedAt = Date.now();
    try {
      localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(this.saveState));
    } catch {
      // Ignore quota errors
    }
  }

  public resetSave(): void {
    this.saveState = createDefaultSaveData();
    this.playerPos.set(0, 0, 22);
    this.playerVel.set(0, 0, 0);
    this.attentionValue = 0;
    this.activeRig = this.playerRigs[this.saveState.selectedCharacter];
    for (const item of this.world.interactables) {
      if (item.kind === 'collectible') {
        item.collected = false;
        item.mesh.visible = true;
      }
      if (item.kind === 'food') {
        item.consumed = false;
        item.mesh.visible = true;
      }
    }
    this.saveNow();
    this.positionRigsForState();
    this.emitHud();
  }

  private awardReputation(cat: ReputationCategory, delta: number): void {
    this.saveState.reputation[cat] += delta;
  }

  private advanceChallenge(id: string, amount: number): void {
    const ch = this.saveState.challenges.find((c) => c.id === id);
    if (!ch || ch.completed) return;
    ch.progress = Math.min(ch.targetCount, ch.progress + amount);
    if (ch.progress >= ch.targetCount) {
      ch.completed = true;
      this.awardReputation(ch.rewardReputation, 15);
      this.announcementText = `Desafio concluído: ${ch.title}!`;
      this.announcementTimer = 4.0;
    }
  }

  private recordCombo(verb: string, target: string): void {
    const zone = getZoneAtPosition(this.playerPos.x, this.playerPos.y, this.playerPos.z);
    const sig = buildComboSignature(zone.id, verb, target, this.saveState.selectedCharacter, this.lastPeriod);
    if (!this.seenCombos.has(sig)) {
      this.seenCombos.add(sig);
      this.saveState.combosDiscovered++;
    }
  }

  private findNearestInteractable(): WorldInteractable | null {
    let best: WorldInteractable | null = null;
    let bestDist = Infinity;
    for (const item of this.world.interactables) {
      if (item.collected || item.consumed) continue;
      const d = item.position.distanceTo(this.playerPos);
      if (d <= item.radius && d < bestDist) {
        bestDist = d;
        best = item;
      }
    }
    return best;
  }

  private findNearestNpc(): NpcActor | null {
    let best: NpcActor | null = null;
    let bestDist = Infinity;
    for (const npc of this.npcs.actors) {
      const d = npc.position.distanceTo(this.playerPos);
      if (d < 2.6 && d < bestDist) {
        bestDist = d;
        best = npc;
      }
    }
    return best;
  }

  private spawnBurst(x: number, y: number, z: number, count: number, colorHex: number): void {
    for (let i = 0; i < count; i++) {
      const p = this.particlePool[this.particleCursor];
      this.particleCursor = (this.particleCursor + 1) % this.particlePool.length;
      p.active = true;
      p.x = x + (Math.random() - 0.5) * 0.4;
      p.y = y + (Math.random() - 0.5) * 0.4;
      p.z = z + (Math.random() - 0.5) * 0.4;
      const angle = Math.random() * Math.PI * 2;
      const spd = 2 + Math.random() * 5.5;
      p.vx = Math.cos(angle) * spd;
      p.vy = 2.5 + Math.random() * 4.5;
      p.vz = Math.sin(angle) * spd;
      p.maxLife = 0.45 + Math.random() * 0.45;
      p.life = p.maxLife;
      p.size = 0.7 + Math.random() * 0.8;
      p.color.setHex(colorHex);
    }
  }

  private loop = (): void => {
    if (this.disposed) return;

    const now = performance.now();
    const rawDt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    const dt = Math.min(rawDt, 0.05);

    this.step(dt);
    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.loop);
    } else {
      this.frameId = requestAnimationFrame(this.loop);
    }
  };

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync?.(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    let polls = 0;
    const poll = () => {
      if (this.disposed) return;
      polls++;
      let done = true;
      if (sync) {
        const res = gl.clientWaitSync(sync, 0, 0);
        done = res === gl.ALREADY_SIGNALED || res === gl.CONDITION_SATISFIED || polls >= 20;
      }
      if (!done) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(() => requestAnimationFrame(cb), 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private step(dt: number): void {
    // Rotate ceiling fans continuously
    for (const fan of this.world.ceilingFans) {
      fan.rotation.y += dt * 4.2;
    }

    // Rotate floating collectibles
    for (const item of this.world.interactables) {
      if (item.kind === 'collectible' && !item.collected) {
        item.mesh.rotation.y += dt * 2.1;
        item.mesh.position.y = item.position.y + Math.sin(this.titleTourTime * 3 + item.position.x) * 0.14;
      }
    }

    this.titleTourTime += dt;

    if (this.phase === 'title') {
      // Live atmospheric camera tour around courtyard & main facade
      const angle = this.titleTourTime * 0.14;
      this.camera.position.set(Math.sin(angle) * 14, 5.8 + Math.sin(angle * 2) * 0.7, 29 + Math.cos(angle) * 5.5);
      this.camera.lookAt(0, 1.8, 17);
      updateCharacterAnimation(this.playerRigs.emanuel, 'idle', 0, dt);
      updateCharacterAnimation(this.playerRigs.pedro_henrique, 'idle', 0, dt);
      updateCharacterAnimation(this.playerRigs.pedro_antonio, 'idle', 0, dt);
      this.npcs.update(dt, this.playerPos, 'recreio', false, this.world.colliders, this.sports.getMainFootballPos());
      this.updateLightingAndSky(dt);
      return;
    }

    if (this.phase === 'paused') {
      return;
    }

    // Playing state!
    this.camTrauma = Math.max(0, this.camTrauma - dt * 1.8);
    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      this.updateCamera(dt);
      return;
    }

    this.announcementTimer = Math.max(0, this.announcementTimer - dt);
    if (this.announcementTimer <= 0) this.announcementText = null;
    this.dialogueTimer = Math.max(0, this.dialogueTimer - dt);
    if (this.dialogueTimer <= 0) {
      this.dialogueSpeaker = null;
      this.dialogueText = null;
    }

    // Advance school clock (1 real sec = 1.5 school minutes)
    this.saveState.schoolMinutes = (this.saveState.schoolMinutes + dt * 1.5) % 1440;
    const sched = getScheduleForMinutes(this.saveState.schoolMinutes);
    if (sched.period !== this.lastPeriod) {
      this.lastPeriod = sched.period;
      this.announcementText = sched.announcement;
      this.announcementTimer = 5.0;
      this.audio.playBell();
    }

    // Dynamic weather cycle
    this.weatherTimer -= dt;
    if (this.weatherTimer <= 0) {
      this.weatherTimer = 85 + Math.random() * 55;
      const weathers: WeatherKind[] = ['ensolarado', 'ensolarado', 'nublado', 'chuvoso', 'tempestade'];
      this.saveState.weather = weathers[Math.floor(Math.random() * weathers.length)];
    }

    this.updateLightingAndSky(dt);
    this.updatePlayerMovement(dt);
    this.updateParticles(dt);
    this.updateRain(dt);

    // Update NPCs & Sports
    const attLevel = getAttentionLevel(this.attentionValue);
    const attentionHigh = attLevel === 'HIGH' || attLevel === 'VERY_HIGH';
    this.npcs.update(dt, this.playerPos, sched.period, attentionHigh, this.world.colliders, this.sports.getMainFootballPos());

    // Attention decay when outside teachers' sight
    const currentZone = getZoneAtPosition(this.playerPos.x, this.playerPos.y, this.playerPos.z);
    const inSafeZone = currentZone.id === 'secretos' || currentZone.id === 'bairro';
    this.attentionValue = decayAttention(this.attentionValue, dt, inSafeZone);

    if (!this.saveState.discoveredZones.includes(currentZone.id)) {
      this.saveState.discoveredZones.push(currentZone.id);
      this.announcementText = `Nova área descoberta: ${currentZone.label}!`;
      this.announcementTimer = 3.5;
      this.awardReputation('explorador', 5);
      this.advanceChallenge('ch_explore_zones', 1);
    }

    this.sports.update(
      dt,
      this.playerPos,
      this.playerVel,
      this.npcs.actors,
      this.world.colliders,
      (_side, byPlayer) => {
        if (byPlayer) {
          this.saveState.goalsScored++;
          this.awardReputation('atleta', 8);
          this.advanceChallenge('ch_score_goals', 1);
          this.announcementText = 'GOOOOL! Que golaço na quadra!';
        } else {
          this.saveState.npcGoalsScored++;
          this.announcementText = 'Gol dos alunos na quadra!';
        }
        this.announcementTimer = 3.8;
        this.audio.playGoalCheer();
        this.spawnBurst(-43, 1.5, -48, 28, 0x22c55e);
      },
      () => this.audio.playKick(),
    );

    this.updateCamera(dt);

    // Periodic autosave
    this.autoSaveTimer += dt;
    if (this.autoSaveTimer >= 12) {
      this.autoSaveTimer = 0;
      this.saveNow();
    }

    // Throttled HUD sync (10Hz)
    this.hudSyncTimer += dt;
    if (this.hudSyncTimer >= 0.1) {
      this.hudSyncTimer = 0;
      this.emitHud();
    }

    this.justPressed.clear();
  }

  private updatePlayerMovement(dt: number): void {
    const profile = CHARACTER_PROFILES[this.saveState.selectedCharacter];
    this.abilityCooldown = Math.max(0, this.abilityCooldown - dt);
    this.abilityActiveTimer = Math.max(0, this.abilityActiveTimer - dt);
    this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);

    // Input vector in camera-relative XZ plane
    let moveX = this.mobileMove.x;
    let moveZ = this.mobileMove.y;
    if (this.heldKeys.has('KeyW') || this.heldKeys.has('ArrowUp')) moveZ -= 1;
    if (this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown')) moveZ += 1;
    if (this.heldKeys.has('KeyA') || this.heldKeys.has('ArrowLeft')) moveX -= 1;
    if (this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight')) moveX += 1;

    const inputLen = Math.hypot(moveX, moveZ);
    if (inputLen > 0.05) {
      this.isSitting = false;
      moveX /= Math.max(1, inputLen);
      moveZ /= Math.max(1, inputLen);
    }

    if (this.isSitting) {
      this.activeRig.root.position.copy(this.playerPos);
      updateCharacterAnimation(this.activeRig, 'sit', 0, dt);
      return;
    }

    // Rotate input by camera yaw
    const sinY = Math.sin(this.camYaw);
    const cosY = Math.cos(this.camYaw);
    // Forward in camera space points along (-sin(camYaw), -cos(camYaw))
    const worldDirX = moveX * cosY + moveZ * sinY;
    const worldDirZ = -moveX * sinY + moveZ * cosY;

    const wantsSprint = this.heldKeys.has('ShiftLeft') || this.heldKeys.has('ShiftRight') || this.mobileSprint;
    const isSuperSprint = this.saveState.selectedCharacter === 'emanuel' && this.abilityActiveTimer > 0;
    const isRunning = (wantsSprint || isSuperSprint) && inputLen > 0.1 && this.stamina > 2;

    if (isRunning && !isSuperSprint) {
      this.stamina = Math.max(0, this.stamina - 22 * dt);
    } else {
      this.stamina = Math.min(this.maxStamina, this.stamina + 18 * dt);
    }

    let targetSpeed = inputLen > 0.05 ? profile.walkSpeed : 0;
    if (isRunning) targetSpeed = profile.runSpeed;
    if (isSuperSprint && inputLen > 0.05) targetSpeed = profile.runSpeed * profile.sprintMultiplier;

    const accel = this.onGround ? 14 : 6.5;
    this.playerVel.x = THREE.MathUtils.lerp(this.playerVel.x, worldDirX * targetSpeed, 1 - Math.exp(-accel * dt));
    this.playerVel.z = THREE.MathUtils.lerp(this.playerVel.z, worldDirZ * targetSpeed, 1 - Math.exp(-accel * dt));

    // Jump with coyote time & jump buffering
    if (this.jumpBufferTimer > 0) {
      if (this.onGround || this.coyoteTimer > 0) {
        this.playerVel.y = profile.jumpForce * (isSuperSprint ? 1.15 : 1);
        this.onGround = false;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        triggerRigSquash(this.activeRig, 1.2, 0.84);
        this.audio.playJump();
        this.spawnBurst(this.playerPos.x, this.playerPos.y + 0.1, this.playerPos.z, 5, 0xe2e8f0);
      } else if (this.saveState.selectedCharacter === 'pedro_antonio' && this.stamina > 8) {
        // Pedro Antonio engages Sky Glide mid-air on second Space press!
        this.isGliding = true;
        this.jumpBufferTimer = 0;
        this.audio.playCharacterVoice('pedro_antonio');
      }
    }

    // Gravity & Pedro Antonio Sky Glide
    if (this.isGliding && this.saveState.selectedCharacter === 'pedro_antonio' && !this.onGround) {
      this.stamina = Math.max(0, this.stamina - 19 * dt);
      this.playerVel.y = Math.max(this.playerVel.y - 6.5 * dt, -2.6);
      this.playerVel.x *= 1.006;
      this.playerVel.z *= 1.006;
      if (this.stamina <= 1) {
        this.isGliding = false;
      }
    } else {
      this.playerVel.y -= 26 * dt;
    }

    // Apply movement & resolve wall collisions
    this.playerPos.x += this.playerVel.x * dt;
    this.playerPos.z += this.playerVel.z * dt;
    this.playerPos.y += this.playerVel.y * dt;

    const resolved = resolveCircleAgainstBoxes(
      this.playerPos.x,
      this.playerPos.y,
      this.playerPos.z,
      0.46,
      1.6,
      this.world.colliders,
    );
    this.playerPos.x = resolved.x;
    this.playerPos.z = resolved.z;

    const clamped = clampToWorldBounds(this.playerPos.x, this.playerPos.z);
    this.playerPos.x = clamped.x;
    this.playerPos.z = clamped.z;

    // Ground & staircase elevation check
    const groundY = computeGroundHeightAt(
      this.playerPos.x,
      this.playerPos.y,
      this.playerPos.z,
      this.world.floors,
      this.world.ramps,
    );

    if (this.playerPos.y <= groundY + 0.02 && this.playerVel.y <= 0) {
      if (!this.onGround && this.playerVel.y < -5.5) {
        triggerRigSquash(this.activeRig, 0.78, 1.22);
        this.audio.playLand();
        this.spawnBurst(this.playerPos.x, groundY + 0.1, this.playerPos.z, 6, 0xd6cfc2);
      }
      this.playerPos.y = groundY;
      this.playerVel.y = 0;
      this.onGround = true;
      this.coyoteTimer = 0.1;
      this.isGliding = false;
    } else if (this.playerPos.y > groundY + 0.12) {
      if (this.onGround) {
        this.coyoteTimer = 0.1;
      }
      this.onGround = false;
    }

    // Smooth character facing toward horizontal velocity
    const horizSpeed = Math.hypot(this.playerVel.x, this.playerVel.z);
    if (horizSpeed > 0.35) {
      const targetYaw = Math.atan2(this.playerVel.x, this.playerVel.z);
      let diff = targetYaw - this.playerYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.playerYaw += diff * Math.min(1, 12 * dt);

      if (this.onGround) {
        this.footstepDist += horizSpeed * dt;
        if (this.footstepDist > 1.75) {
          this.footstepDist = 0;
          this.audio.playFootstep();
          if (isSuperSprint) {
            this.spawnBurst(this.playerPos.x, this.playerPos.y + 0.1, this.playerPos.z, 3, 0x94a3b8);
          }
        }
      }
    }

    this.activeRig.root.position.copy(this.playerPos);
    this.activeRig.root.rotation.y = this.playerYaw;

    // Determine Animation State
    let animState: AnimState = 'idle';
    if (!this.onGround) {
      animState = this.isGliding ? 'glide' : this.playerVel.y > 0.5 ? 'jump' : 'fall';
    } else if (this.abilityActiveTimer > 0 && this.saveState.selectedCharacter === 'pedro_henrique') {
      animState = 'quack';
    } else if (horizSpeed > 0.4) {
      animState = isSuperSprint ? 'sprint' : isRunning ? 'run' : 'walk';
    }

    updateCharacterAnimation(this.activeRig, animState, horizSpeed, dt);
  }

  private updateCamera(dt: number): void {
    // Dynamic FOV kick on sprint or glide
    const targetFov =
      this.abilityActiveTimer > 0 && this.saveState.selectedCharacter === 'emanuel'
        ? 73
        : this.isGliding
          ? 69
          : 62;
    if (Math.abs(this.camera.fov - targetFov) > 0.1) {
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, 1 - Math.exp(-8 * dt));
      this.camera.updateProjectionMatrix();
    }

    const headHeight = this.activeRig.eyeHeight;
    if (this.firstPerson) {
      _v1.set(this.playerPos.x, this.playerPos.y + headHeight, this.playerPos.z);
      this.camera.position.lerp(_v1, 1 - Math.exp(-24 * dt));
      const lookX = this.camera.position.x - Math.sin(this.camYaw) * Math.cos(this.camPitch) * 6;
      const lookY = this.camera.position.y - Math.sin(this.camPitch) * 6;
      const lookZ = this.camera.position.z - Math.cos(this.camYaw) * Math.cos(this.camPitch) * 6;
      this.camera.lookAt(lookX, lookY, lookZ);
      return;
    }

    // Third-person smooth orbit with wall-avoidance raycast
    const anchorX = this.playerPos.x;
    const anchorY = this.playerPos.y + headHeight * 0.88;
    const anchorZ = this.playerPos.z;
    _rayOrigin.set(anchorX, anchorY, anchorZ);

    const horizDist = Math.cos(this.camPitch) * this.camDist;
    const vertDist = Math.sin(this.camPitch) * this.camDist;
    _v2.set(
      anchorX + Math.sin(this.camYaw) * horizDist,
      anchorY + vertDist,
      anchorZ + Math.cos(this.camYaw) * horizDist,
    );

    // Raycast against exterior/interior walls to prevent wall clipping
    _rayDir.copy(_v2).sub(_rayOrigin);
    const fullDist = _rayDir.length();
    let safeDist = fullDist;
    if (fullDist > 0.1) {
      _rayDir.divideScalar(fullDist);
      this.raycaster.set(_rayOrigin, _rayDir);
      this.raycaster.far = fullDist;
      const hits = this.raycaster.intersectObjects(this.world.raycastTargets, false);
      if (hits.length > 0 && hits[0].distance < safeDist) {
        safeDist = Math.max(1.4, hits[0].distance - 0.45);
      }
    }

    _v2.copy(_rayOrigin).addScaledVector(_rayDir, safeDist);
    if (_v2.y < 0.7) _v2.y = 0.7;

    const k = 1 - Math.exp(-14 * dt);
    this.camPos.lerp(_v2, k);
    this.camLook.lerp(_rayOrigin, 1 - Math.exp(-18 * dt));

    // Trauma shake
    const shake = this.camTrauma * this.camTrauma;
    const shakeX = (Math.random() - 0.5) * shake * 0.45;
    const shakeY = (Math.random() - 0.5) * shake * 0.45;

    this.camera.position.set(this.camPos.x + shakeX, this.camPos.y + shakeY, this.camPos.z);
    this.camera.lookAt(this.camLook);

    // Keep tight directional shadow frustum centered near player
    this.sunLight.position.set(this.playerPos.x + 38, 62, this.playerPos.z + 32);
    this.sunLight.target.position.copy(this.playerPos);
  }

  private updateLightingAndSky(dt: number): void {
    // Time-of-day factor: 420 (07:00) -> 720 (12:00) -> 1080 (18:00) -> 1260 (21:00)
    const m = this.saveState.schoolMinutes;
    let skyCol = _skyDay;
    let sunCol = _sunColorDay;
    let sunInt = 1.85;
    let hemiInt = 0.72;

    if (m >= 1020 && m < 1140) {
      // Golden Sunset (17:00 - 19:00)
      const t = (m - 1020) / 120;
      skyCol = _v1.set(0, 0, 0) as unknown as THREE.Color; // unused, use color lerp directly
      skyCol = _skyDay.clone().lerp(_skySunset, Math.sin(t * Math.PI));
      sunCol = _sunColorDay.clone().lerp(_sunColorSunset, Math.sin(t * Math.PI));
      sunInt = 1.45 - t * 0.5;
    } else if (m >= 1140 || m < 360) {
      // Nighttime
      skyCol = _skyNight;
      sunCol = _sunColorNight;
      sunInt = 0.55;
      hemiInt = 0.42;
    } else {
      skyCol = _skyDay;
      sunCol = _sunColorDay;
    }

    if (this.saveState.weather === 'nublado' || this.saveState.weather === 'chuvoso' || this.saveState.weather === 'tempestade') {
      const overcast = this.saveState.weather === 'tempestade' ? 0.78 : this.saveState.weather === 'chuvoso' ? 0.62 : 0.4;
      skyCol = skyCol.clone().lerp(_skyRain, overcast);
      sunInt *= 1 - overcast * 0.5;
    }

    (this.scene.background as THREE.Color).lerp(skyCol, 1 - Math.exp(-2 * dt));
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(this.scene.background as THREE.Color);
      const targetDens = this.saveState.weather === 'tempestade' ? 0.011 : this.saveState.weather === 'chuvoso' ? 0.0085 : 0.0058;
      this.scene.fog.density = THREE.MathUtils.lerp(this.scene.fog.density, targetDens, 2 * dt);
    }
    this.sunLight.color.lerp(sunCol, 2 * dt);
    this.sunLight.intensity = THREE.MathUtils.lerp(this.sunLight.intensity, sunInt, 2 * dt);
    this.hemiLight.intensity = THREE.MathUtils.lerp(this.hemiLight.intensity, hemiInt, 2 * dt);
  }

  private updateParticles(dt: number): void {
    let anyChanged = false;
    for (let i = 0; i < this.particlePool.length; i++) {
      const p = this.particlePool[i];
      if (!p.active) continue;
      anyChanged = true;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        _mat4.makeTranslation(0, -100, 0);
        this.particleMesh.setMatrixAt(i, _mat4);
        continue;
      }
      p.vy -= 12 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      const s = p.size * (p.life / p.maxLife);
      _scale.set(s, s, s);
      _v1.set(p.x, p.y, p.z);
      _mat4.compose(_v1, _quat, _scale);
      this.particleMesh.setMatrixAt(i, _mat4);
      this.particleMesh.setColorAt(i, p.color);
    }
    if (anyChanged) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
      if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
    }
  }

  private updateRain(dt: number): void {
    const isRaining = this.saveState.weather === 'chuvoso' || this.saveState.weather === 'tempestade';
    this.rainMesh.visible = isRaining;
    if (!isRaining) return;

    _scale.set(1, 1, 1);
    for (let i = 0; i < this.rainDrops.length; i++) {
      const drop = this.rainDrops[i];
      drop.y -= drop.speed * dt;
      if (drop.y < 0) {
        drop.y = 16 + Math.random() * 4;
        drop.x = this.playerPos.x + (Math.random() - 0.5) * 44;
        drop.z = this.playerPos.z + (Math.random() - 0.5) * 44;
      }
      _v1.set(drop.x, drop.y, drop.z);
      _mat4.compose(_v1, _quat, _scale);
      this.rainMesh.setMatrixAt(i, _mat4);
    }
    this.rainMesh.instanceMatrix.needsUpdate = true;
  }

  public getHudSnapshot(): HudSnapshot {
    const sched = getScheduleForMinutes(this.saveState.schoolMinutes);
    const zone = getZoneAtPosition(this.playerPos.x, this.playerPos.y, this.playerPos.z);
    const attLevel = getAttentionLevel(this.attentionValue);

    let interactionPrompt: string | null = null;
    let interactionTargetId: string | null = null;

    // Check football kick prompt first
    for (const ball of this.sports.balls) {
      if (ball.position.distanceTo(this.playerPos) < 2.6) {
        interactionPrompt = ball.kind === 'football' ? 'Chutar Bola de Futebol' : 'Arremessar Bola de Basquete';
        interactionTargetId = ball.id;
        break;
      }
    }
    if (!interactionPrompt) {
      const nearestObj = this.findNearestInteractable();
      if (nearestObj) {
        interactionPrompt = nearestObj.prompt;
        interactionTargetId = nearestObj.id;
      } else {
        const nearestNpc = this.findNearestNpc();
        if (nearestNpc) {
          interactionPrompt = `Conversar com ${nearestNpc.name}`;
          interactionTargetId = nearestNpc.id;
        }
      }
    }

    return {
      phase: this.phase,
      character: this.saveState.selectedCharacter,
      stamina: Math.round(this.stamina),
      maxStamina: this.maxStamina,
      abilityCooldownRemaining: Number(this.abilityCooldown.toFixed(1)),
      abilityActive: this.abilityActiveTimer > 0,
      isGliding: this.isGliding,
      firstPerson: this.firstPerson,
      schoolMinutes: this.saveState.schoolMinutes,
      schedulePeriod: sched.period,
      scheduleLabel: sched.label,
      weather: this.saveState.weather,
      currentZone: zone.id,
      currentZoneLabel: zone.label,
      attentionValue: Math.round(this.attentionValue),
      attentionLevel: attLevel,
      reputation: { ...this.saveState.reputation },
      dominantTitle: getDominantReputationTitle(this.saveState.reputation),
      interactionPrompt,
      interactionTargetId,
      dialogueSpeaker: this.dialogueSpeaker,
      dialogueText: this.dialogueText,
      announcement: this.announcementText,
      inventory: this.saveState.inventory.map((i) => ({ ...i })),
      equippedItemId: this.saveState.equippedItemId,
      collectiblesFound: [...this.saveState.collectiblesFound],
      totalCollectibles: TOTAL_COLLECTIBLES,
      discoveredZones: [...this.saveState.discoveredZones],
      goalsScored: this.saveState.goalsScored,
      npcGoalsScored: this.saveState.npcGoalsScored,
      chaosEventsTriggered: this.saveState.chaosEventsTriggered,
      combosDiscovered: this.saveState.combosDiscovered,
      challenges: this.saveState.challenges.map((c) => ({ ...c })),
      playerX: this.playerPos.x,
      playerY: this.playerPos.y,
      playerZ: this.playerPos.z,
      playerYaw: this.playerYaw,
      npcMarkers: this.npcs.actors.map((a) => ({
        x: a.position.x,
        z: a.position.z,
        role: a.role,
        alert: a.alertTimer > 0,
      })),
      activeComputerTitle: this.activeComputerTitle,
    };
  }

  public getSettings(): GameSettings {
    return { ...this.saveState.settings };
  }

  private emitHud(): void {
    this.onHudUpdate(this.getHudSnapshot());
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('wheel', this.handleWheel);

    this.audio.dispose();
    this.materials.dispose();
    this.textures.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
