import React, { useRef } from 'react';
import {
  Backpack,
  Camera,
  Cloud,
  CloudLightning,
  CloudRain,
  Map as MapIcon,
  Pause,
  Sun,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { CHARACTER_PROFILES, formatSchoolClock, getAttentionLabel } from '../game/rules';
import type { CharacterId, HudSnapshot } from '../game/types';
import { CharacterPortraitSvg } from './CharacterPortraits';

interface GameHUDProps {
  hud: HudSnapshot;
  muted: boolean;
  showMobile: boolean;
  onSwitchCharacter: (id: CharacterId) => void;
  onOpenMap: () => void;
  onOpenInventory: () => void;
  onToggleCamera: () => void;
  onToggleMute: () => void;
  onPause: () => void;
  onInteract: () => void;
  onAbility: () => void;
  onJump: () => void;
  onMobileMove: (x: number, y: number) => void;
  onMobileLook: (dx: number, dy: number) => void;
  onMobileSprint: (active: boolean) => void;
}

const CHAR_ORDER: CharacterId[] = ['emanuel', 'pedro_henrique', 'pedro_antonio'];

export const GameHUD: React.FC<GameHUDProps> = ({
  hud,
  muted,
  showMobile,
  onSwitchCharacter,
  onOpenMap,
  onOpenInventory,
  onToggleCamera,
  onToggleMute,
  onPause,
  onInteract,
  onAbility,
  onJump,
  onMobileMove,
  onMobileLook,
  onMobileSprint,
}) => {
  const profile = CHARACTER_PROFILES[hud.character];
  const joystickOrigin = useRef<{ x: number; y: number } | null>(null);
  const lookLast = useRef<{ x: number; y: number } | null>(null);

  const attentionColor =
    hud.attentionLevel === 'VERY_HIGH'
      ? '#ef4444'
      : hud.attentionLevel === 'HIGH'
        ? '#f97316'
        : hud.attentionLevel === 'MEDIUM'
          ? '#facc15'
          : '#22c55e';

  const WeatherIcon =
    hud.weather === 'ensolarado'
      ? Sun
      : hud.weather === 'nublado'
        ? Cloud
        : hud.weather === 'chuvoso'
          ? CloudRain
          : CloudLightning;

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-3 md:p-5">
      {/* TOP BAR CLUSTER */}
      <div className="flex items-start justify-between gap-1.5 md:gap-2">
        {/* TOP-LEFT: Character Portrait, Ability & Attention */}
        <div className="pointer-events-auto flex items-center gap-2 bg-[#0f172a]/90 border-2 border-slate-700 rounded-xl p-1.5 md:p-2.5 shadow-lg min-w-0">
          <CharacterPortraitSvg id={hud.character} className="w-9 h-9 md:w-12 md:h-12 shrink-0" />
          <div className="min-w-[96px] md:min-w-[165px]">
            <div className="flex items-center justify-between gap-1.5">
              <span className="font-display font-bold text-xs md:text-base text-white leading-tight truncate">
                {profile.name}
              </span>
              <span className="hidden sm:inline text-[11px] font-semibold text-amber-300 truncate max-w-[110px]">
                {hud.dominantTitle}
              </span>
            </div>

            {/* Stamina bar */}
            <div className="mt-1">
              <div className="flex justify-between text-[10px] text-slate-300 font-mono-num">
                <span>Energia</span>
                <span>{hud.stamina}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded overflow-hidden mt-0.5">
                <div
                  className="h-full bg-sky-400 transition-[width] duration-100"
                  style={{ width: `${(hud.stamina / hud.maxStamina) * 100}%` }}
                />
              </div>
            </div>

            {/* Attention bar */}
            <div className="mt-1.5 flex items-center gap-1.5 text-[10px]">
              <span className="font-semibold" style={{ color: attentionColor }}>
                {getAttentionLabel(hud.attentionLevel)}
              </span>
              <span className="font-mono-num text-slate-400">({hud.attentionValue})</span>
            </div>
          </div>
        </div>

        {/* TOP-CENTER: School Clock, Schedule Event & Current Zone */}
        <div className="hidden sm:flex flex-col items-center gap-1">
          <div className="bg-[#0f172a]/90 border-2 border-slate-700 rounded-xl px-4 py-1.5 flex items-center gap-3 shadow-lg">
            <span className="font-mono-num font-bold text-base text-[#facc15]">
              {formatSchoolClock(hud.schoolMinutes)}
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-xs font-semibold text-white">{hud.scheduleLabel}</span>
            <span className="text-slate-600">·</span>
            <WeatherIcon className="w-4 h-4 text-sky-300" />
          </div>
          <div className="px-3 py-0.5 rounded bg-[#0f172a]/85 text-[11px] font-medium text-emerald-300">
            {hud.currentZoneLabel} · Placar {hud.goalsScored} x {hud.npcGoalsScored}
          </div>
        </div>

        {/* TOP-RIGHT: Compact Square Utility Controls */}
        <div className="pointer-events-auto flex items-center gap-1 md:gap-1.5 shrink-0">
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenMap();
            }}
            aria-label="Abrir Mapa"
            title="Mapa [M]"
            className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-lg md:rounded-xl bg-[#0f172a]/90 hover:bg-slate-800 border-2 border-slate-700 text-sky-300 cursor-pointer"
          >
            <MapIcon className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenInventory();
            }}
            aria-label="Abrir Mochila e Desafios"
            title="Mochila & Desafios [I]"
            className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-lg md:rounded-xl bg-[#0f172a]/90 hover:bg-slate-800 border-2 border-slate-700 text-amber-300 cursor-pointer"
          >
            <Backpack className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleCamera();
            }}
            aria-label="Alternar Câmera"
            title="1ª / 3ª Pessoa [V]"
            className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-lg md:rounded-xl border-2 cursor-pointer ${
              hud.firstPerson
                ? 'bg-emerald-700 border-emerald-400 text-white'
                : 'bg-[#0f172a]/90 hover:bg-slate-800 border-slate-700 text-slate-200'
            }`}
          >
            <Camera className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            aria-label={muted ? 'Ativar Som' : 'Silenciar Som'}
            title="Som"
            className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-lg md:rounded-xl bg-[#0f172a]/90 hover:bg-slate-800 border-2 border-slate-700 text-slate-200 cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4 md:w-5 md:h-5 text-rose-400" /> : <Volume2 className="w-4 h-4 md:w-5 md:h-5" />}
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            aria-label="Pausar Jogo"
            title="Pausar [Esc]"
            className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-lg md:rounded-xl bg-[#0f172a]/90 hover:bg-slate-800 border-2 border-slate-700 text-white cursor-pointer"
          >
            <Pause className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>
      </div>

      {/* TOP-CENTER NOTIFICATIONS (Never occlude center playfield) */}
      <div className="flex flex-col items-center gap-2 mt-2 pointer-events-none">
        {hud.announcement && (
          <div className="bg-[#0f172a]/92 border-2 border-[#facc15] rounded-xl px-4 py-1.5 text-center max-w-md shadow-xl">
            <p className="font-display font-bold text-xs md:text-sm text-[#facc15]">{hud.announcement}</p>
          </div>
        )}
      </div>

      {/* BOTTOM CLUSTER: Dialogue + Interaction Prompt + Character Switcher + Touch Controls */}
      <div className="flex flex-col gap-2 mt-auto">
        {hud.dialogueText && (
          <div className="flex justify-center pointer-events-none">
            <div className="bg-[#0f172a]/95 border-2 border-sky-400 rounded-xl px-5 py-2.5 max-w-md shadow-xl">
              <div className="text-xs font-bold text-sky-300 mb-0.5">{hud.dialogueSpeaker}</div>
              <p className="text-sm text-white">“{hud.dialogueText}”</p>
            </div>
          </div>
        )}
        {/* Context Interaction Prompt */}
        {hud.interactionPrompt && (
          <div className="flex justify-center">
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onInteract();
              }}
              className="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-[#facc15] text-slate-950 font-display font-bold text-sm shadow-lg cursor-pointer"
            >
              <span className="px-1.5 py-0.5 rounded bg-slate-950 text-[#facc15] font-mono-num text-xs">E</span>
              {hud.interactionPrompt}
            </button>
          </div>
        )}

        <div className="flex items-end justify-between gap-2">
          {/* Left: Mobile Virtual Joystick (only when mobile/touch active) */}
          {showMobile ? (
            <div
              className="pointer-events-auto shrink-0 w-24 h-24 rounded-full bg-[#0f172a]/70 border-2 border-slate-500 flex items-center justify-center touch-none"
              onTouchStart={(e) => {
                const t = e.touches[0];
                joystickOrigin.current = { x: t.clientX, y: t.clientY };
              }}
              onTouchMove={(e) => {
                if (!joystickOrigin.current) return;
                const t = e.touches[0];
                const dx = Math.max(-34, Math.min(34, t.clientX - joystickOrigin.current.x));
                const dy = Math.max(-34, Math.min(34, t.clientY - joystickOrigin.current.y));
                onMobileMove(dx / 34, dy / 34);
              }}
              onTouchEnd={() => {
                joystickOrigin.current = null;
                onMobileMove(0, 0);
              }}
            >
              <div className="w-10 h-10 rounded-full bg-[#facc15]/90 border-2 border-slate-950" />
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2 bg-[#0f172a]/85 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-300">
              <span>Colecionáveis:</span>
              <span className="font-mono-num font-bold text-[#facc15]">
                {hud.collectiblesFound.length}/{hud.totalCollectibles}
              </span>
              <span className="text-slate-600">·</span>
              <span>Áreas:</span>
              <span className="font-mono-num font-bold text-emerald-400">{hud.discoveredZones.length}/12</span>
            </div>
          )}

          {/* Center: Quick Character Switcher + Ability Button */}
          <div className="pointer-events-auto mx-auto flex items-center gap-1 bg-[#0f172a]/90 border-2 border-slate-700 rounded-xl p-1 md:p-1.5 shadow-lg shrink-0">
            {CHAR_ORDER.map((id, idx) => {
              const p = CHARACTER_PROFILES[id];
              const active = hud.character === id;
              return (
                <button
                  key={id}
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onSwitchCharacter(id);
                  }}
                  aria-label={`Trocar para ${p.name}`}
                  className={`flex items-center gap-1 px-2 md:px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    active ? 'bg-[#facc15] text-slate-950' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="font-mono-num opacity-75">{idx + 1}</span>
                  <span className="hidden sm:inline">
                    {id === 'emanuel' ? 'Emanuel' : id === 'pedro_henrique' ? 'Pedro H.' : 'Pedro A.'}
                  </span>
                </button>
              );
            })}

            <div className="hidden md:block w-px h-6 bg-slate-700 mx-0.5" />

            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onAbility();
              }}
              aria-label={`Usar habilidade ${profile.abilityName}`}
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                hud.abilityCooldownRemaining > 0
                  ? 'bg-slate-800 text-slate-400'
                  : 'bg-sky-500 hover:bg-sky-400 text-slate-950'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span className="font-mono-num">[Q]</span>
              <span>
                {hud.abilityCooldownRemaining > 0 ? `${hud.abilityCooldownRemaining}s` : profile.abilityName}
              </span>
            </button>
          </div>

          {/* Right: Mobile Action Pad & Camera Drag */}
          {showMobile ? (
            <div className="pointer-events-auto flex flex-col items-end gap-2">
              <div
                className="w-28 h-16 rounded-xl bg-[#0f172a]/55 border border-slate-600 flex items-center justify-center text-[10px] text-slate-300 touch-none"
                onTouchStart={(e) => {
                  const t = e.touches[0];
                  lookLast.current = { x: t.clientX, y: t.clientY };
                }}
                onTouchMove={(e) => {
                  if (!lookLast.current) return;
                  const t = e.touches[0];
                  onMobileLook(t.clientX - lookLast.current.x, t.clientY - lookLast.current.y);
                  lookLast.current = { x: t.clientX, y: t.clientY };
                }}
                onTouchEnd={() => {
                  lookLast.current = null;
                }}
              >
                Girar Câmera
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onTouchStart={() => onMobileSprint(true)}
                  onTouchEnd={() => onMobileSprint(false)}
                  onClick={() => onMobileSprint(false)}
                  className="min-w-[52px] min-h-[44px] rounded-xl bg-slate-800/90 border border-slate-500 text-white text-xs font-bold"
                >
                  Correr
                </button>
                <button
                  type="button"
                  onClick={onJump}
                  className="min-w-[52px] min-h-[44px] rounded-xl bg-emerald-500 border border-emerald-300 text-slate-950 text-xs font-bold"
                >
                  Pular
                </button>
                <button
                  type="button"
                  onClick={onInteract}
                  className="min-w-[52px] min-h-[44px] rounded-xl bg-[#facc15] border border-amber-200 text-slate-950 text-xs font-bold"
                >
                  Usar
                </button>
                <button
                  type="button"
                  onClick={onAbility}
                  className="min-w-[52px] min-h-[44px] rounded-xl bg-sky-400 border border-sky-200 text-slate-950 text-xs font-bold"
                >
                  Poder
                </button>
              </div>
            </div>
          ) : (
            <div className="hidden md:block w-[160px]" />
          )}
        </div>
      </div>
    </div>
  );
};
