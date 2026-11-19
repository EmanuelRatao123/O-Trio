import { useCallback, useEffect, useRef, useState } from 'react';
import { CharacterSelectModal } from './components/CharacterSelectModal';
import { GameHUD } from './components/GameHUD';
import {
  ComputerOsModal,
  CreditsModal,
  InteractiveMapModal,
  InventoryModal,
  PauseModal,
  SettingsModal,
} from './components/GameModals';
import { TitleScreen } from './components/TitleScreen';
import { GameEngine } from './game/engine';
import { createDefaultSaveData, DEFAULT_SETTINGS } from './game/rules';
import type { CharacterId, GameSettings, HudSnapshot } from './game/types';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [hud, setHud] = useState<HudSnapshot>(() => {
    const def = createDefaultSaveData();
    return {
      phase: 'title',
      character: def.selectedCharacter,
      stamina: 100,
      maxStamina: 100,
      abilityCooldownRemaining: 0,
      abilityActive: false,
      isGliding: false,
      firstPerson: false,
      schoolMinutes: def.schoolMinutes,
      schedulePeriod: 'recreio',
      scheduleLabel: 'Recreio no Pátio',
      weather: def.weather,
      currentZone: 'patio',
      currentZoneLabel: 'Pátio Central',
      attentionValue: 0,
      attentionLevel: 'LOW',
      reputation: def.reputation,
      dominantTitle: 'Calouro Recém-Chegado',
      interactionPrompt: null,
      interactionTargetId: null,
      dialogueSpeaker: null,
      dialogueText: null,
      announcement: null,
      inventory: def.inventory,
      equippedItemId: def.equippedItemId,
      collectiblesFound: [],
      totalCollectibles: 18,
      discoveredZones: ['patio'],
      goalsScored: 0,
      npcGoalsScored: 0,
      chaosEventsTriggered: 0,
      combosDiscovered: 0,
      challenges: def.challenges,
      playerX: 0,
      playerY: 0,
      playerZ: 22,
      playerYaw: Math.PI,
      npcMarkers: [],
      activeComputerTitle: null,
    };
  });

  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [muted, setMuted] = useState(false);
  const [showCharSelect, setShowCharSelect] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [isTouchViewport, setIsTouchViewport] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      setIsTouchViewport(window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches);
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const autostart = new URLSearchParams(window.location.search).get('autostart') === '1';
    const engine = new GameEngine(
      container,
      (snapshot) => {
        setHud(snapshot);
      },
      autostart,
    );
    engineRef.current = engine;
    setSettings(engine.getSettings());
    setMuted(engine.isMuted());

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Global modal hotkeys (M for Map, I for Inventory)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (hud.phase !== 'playing') return;
      if (e.code === 'KeyM') {
        setShowMap((v) => !v);
        setShowInventory(false);
      } else if (e.code === 'KeyI') {
        setShowInventory((v) => !v);
        setShowMap(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hud.phase]);

  const handleStart = useCallback(() => {
    setShowCharSelect(false);
    setShowSettings(false);
    setShowCredits(false);
    engineRef.current?.startGame();
  }, []);

  const handleSelectCharacter = useCallback((id: CharacterId) => {
    engineRef.current?.switchCharacter(id);
  }, []);

  const handleConfirmCharacterPlay = useCallback((id: CharacterId) => {
    engineRef.current?.switchCharacter(id);
    setShowCharSelect(false);
    engineRef.current?.startGame();
  }, []);

  const handleSaveSettings = useCallback((next: GameSettings) => {
    setSettings(next);
    engineRef.current?.updateSettings(next);
  }, []);

  const showMobile =
    settings.showMobileControls === 'always' ||
    (settings.showMobileControls === 'auto' && isTouchViewport);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0e1726]">
      {/* Isolated WebGL Mount Container */}
      <div
        ref={mountRef}
        data-testid="game-canvas-mount"
        className="fixed inset-0 w-full h-full"
      />

      {/* Title Screen */}
      {hud.phase === 'title' && (
        <TitleScreen
          selectedCharacter={hud.character}
          onStart={handleStart}
          onOpenCharacters={() => setShowCharSelect(true)}
          onOpenSettings={() => setShowSettings(true)}
          onOpenCredits={() => setShowCredits(true)}
        />
      )}

      {/* Active Gameplay HUD */}
      {hud.phase === 'playing' && (
        <GameHUD
          hud={hud}
          muted={muted}
          showMobile={showMobile}
          onSwitchCharacter={handleSelectCharacter}
          onOpenMap={() => {
            setShowMap(true);
            setShowInventory(false);
          }}
          onOpenInventory={() => {
            setShowInventory(true);
            setShowMap(false);
          }}
          onToggleCamera={() => engineRef.current?.toggleFirstPerson()}
          onToggleMute={() => {
            if (engineRef.current) {
              setMuted(engineRef.current.toggleMute());
            }
          }}
          onPause={() => engineRef.current?.pauseGame()}
          onInteract={() => engineRef.current?.triggerInteract()}
          onAbility={() => engineRef.current?.triggerAbility()}
          onJump={() => engineRef.current?.triggerJump()}
          onMobileMove={(x, y) => engineRef.current?.setMobileMove(x, y)}
          onMobileLook={(dx, dy) => engineRef.current?.addMobileLook(dx, dy)}
          onMobileSprint={(active) => engineRef.current?.setMobileSprint(active)}
        />
      )}

      {/* Pause Modal */}
      {hud.phase === 'paused' && !showSettings && (
        <PauseModal
          hud={hud}
          onResume={() => engineRef.current?.resumeGame()}
          onSave={() => engineRef.current?.saveNow()}
          onOpenSettings={() => setShowSettings(true)}
          onReturnTitle={() => {
            setShowMap(false);
            setShowInventory(false);
            engineRef.current?.returnToTitle();
          }}
        />
      )}

      {/* Character Select 3D Showcase Modal */}
      {showCharSelect && (
        <CharacterSelectModal
          selected={hud.character}
          onSelect={handleSelectCharacter}
          onConfirmPlay={handleConfirmCharacterPlay}
          onClose={() => setShowCharSelect(false)}
        />
      )}

      {/* Interactive Map Modal */}
      {showMap && hud.phase === 'playing' && (
        <InteractiveMapModal hud={hud} onClose={() => setShowMap(false)} />
      )}

      {/* Inventory & Activities Modal */}
      {showInventory && hud.phase === 'playing' && (
        <InventoryModal
          hud={hud}
          onUseItem={(id) => engineRef.current?.useInventoryItem(id)}
          onDropItem={(id) => engineRef.current?.dropInventoryItem(id)}
          onClose={() => setShowInventory(false)}
        />
      )}

      {/* Fictional Computer OS Modal */}
      {hud.activeComputerTitle && (
        <ComputerOsModal
          title={hud.activeComputerTitle}
          onClose={() => engineRef.current?.closeComputer()}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          schoolMinutes={hud.schoolMinutes}
          weather={hud.weather}
          onSaveSettings={handleSaveSettings}
          onChangeWeather={(w) => engineRef.current?.setWeather(w)}
          onChangeTime={(m) => engineRef.current?.setTimeOfDay(m)}
          onResetSave={() => engineRef.current?.resetSave()}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Credits Modal */}
      {showCredits && <CreditsModal onClose={() => setShowCredits(false)} />}
    </div>
  );
}
