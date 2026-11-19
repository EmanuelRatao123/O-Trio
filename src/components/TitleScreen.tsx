import React, { useEffect } from 'react';
import { Users, Settings, Play, Info } from 'lucide-react';
import { GameLogoEmblem } from './CharacterPortraits';
import { CHARACTER_PROFILES } from '../game/rules';
import type { CharacterId } from '../game/types';

interface TitleScreenProps {
  selectedCharacter: CharacterId;
  onStart: () => void;
  onOpenCharacters: () => void;
  onOpenSettings: () => void;
  onOpenCredits: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  selectedCharacter,
  onStart,
  onOpenCharacters,
  onOpenSettings,
  onOpenCredits,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStart]);

  const activeProfile = CHARACTER_PROFILES[selectedCharacter];

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-6 md:p-10">
      {/* Top-Left Title Emblem & Menu over negative space while live 3D courtyard pans center-right */}
      <div className="flex flex-col items-start gap-4 max-w-md pointer-events-auto">
        <GameLogoEmblem className="w-72 md:w-96 drop-shadow-[0_10px_24px_rgba(15,23,42,0.55)]" />

        <div className="bg-[#0f172a]/90 border-2 border-[#facc15]/60 rounded-2xl p-5 shadow-2xl w-full max-w-sm">
          <div className="flex items-center justify-between text-xs text-slate-300 mb-3">
            <span>Protagonista ativo: <strong className="text-white">{activeProfile.name}</strong></span>
            <span className="text-[#facc15] font-semibold">{activeProfile.abilityName}</span>
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              data-start="true"
              onClick={onStart}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-xl bg-[#facc15] hover:bg-[#fde047] active:scale-[0.98] text-slate-950 font-display font-bold text-lg tracking-wide shadow-lg transition-transform cursor-pointer"
            >
              <Play className="w-5 h-5 fill-slate-950" />
              JOGAR AGORA
            </button>

            <button
              type="button"
              onClick={onOpenCharacters}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm border border-slate-600 transition-colors cursor-pointer"
            >
              <Users className="w-4 h-4 text-sky-400" />
              SELEÇÃO DE PERSONAGEM
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onOpenSettings}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-600 transition-colors cursor-pointer"
              >
                <Settings className="w-4 h-4 text-emerald-400" />
                OPÇÕES
              </button>
              <button
                type="button"
                onClick={onOpenCredits}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-600 transition-colors cursor-pointer"
              >
                <Info className="w-4 h-4 text-amber-400" />
                CRÉDITOS
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Flat Control Hint Line */}
      <div className="flex justify-center">
        <p className="px-4 py-1.5 rounded-lg bg-[#0f172a]/85 text-slate-200 text-xs md:text-sm font-medium tracking-wide shadow-md">
          WASD Mover · Espaço Pular · E Interagir · Q Habilidade · 1-3 Trocar · Esc Pausar
        </p>
      </div>
    </div>
  );
};
