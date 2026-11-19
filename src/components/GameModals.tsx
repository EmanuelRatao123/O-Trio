import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Cpu,
  MapPin,
  RotateCcw,
  Save,
  Trash2,
  Trophy,
  X,
} from 'lucide-react';
import {
  computeCombinatorialSpaceSize,
  formatSchoolClock,
  WORLD_ZONES,
} from '../game/rules';
import type { GameSettings, HudSnapshot, WeatherKind } from '../game/types';

/* -------------------------------------------------------------------------- */
/* 1. INTERACTIVE MAP MODAL                                                   */
/* -------------------------------------------------------------------------- */
export const InteractiveMapModal: React.FC<{
  hud: HudSnapshot;
  onClose: () => void;
}> = ({ hud, onClose }) => {
  // Map world coordinates [-90..90] into SVG [0..400]
  const toSvg = (wx: number, wz: number) => ({
    x: ((wx + 90) / 180) * 400,
    y: ((wz + 90) / 180) * 400,
  });

  const playerPt = toSvg(hud.playerX, hud.playerZ);

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/80 flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border-2 border-slate-600 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl text-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#facc15]">MAPA DA ESCOLA & BAIRRO</h2>
            <p className="text-xs text-slate-400">
              Você está em: <strong className="text-emerald-400">{hud.currentZoneLabel}</strong> · Descobertas:{' '}
              {hud.discoveredZones.length}/12
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar mapa"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 p-6">
          <div className="md:col-span-7 bg-slate-900 border border-slate-700 rounded-xl p-3">
            <svg viewBox="0 0 400 400" className="w-full h-auto rounded-lg bg-[#162235]">
              {/* Neighborhood street */}
              <rect x="0" y="324" width="400" height="26" fill="#334155" />
              <rect x="352" y="0" width="26" height="400" fill="#334155" />

              {/* Zones */}
              {WORLD_ZONES.filter(
                (z) => z.id !== 'bairro' && z.id !== 'salas_superior' && z.id !== 'secretos',
              ).map((z) => {
                const p1 = toSvg(z.minX, z.minZ);
                const p2 = toSvg(z.maxX, z.maxZ);
                const discovered = hud.discoveredZones.includes(z.id);
                const shortLabel: Record<string, string> = {
                  entrada: 'Entrada',
                  patio: 'Pátio',
                  salas_terreo: 'Salas de Aula',
                  administracao: 'Admin',
                  ciencias_tech: 'Ciências',
                  biblioteca: 'Biblioteca',
                  cantina: 'Cantina',
                  esportes: 'Esportes',
                  servico: 'Serviço',
                };
                return (
                  <g key={z.id}>
                    <rect
                      x={p1.x}
                      y={p1.y}
                      width={Math.max(4, p2.x - p1.x)}
                      height={Math.max(4, p2.y - p1.y)}
                      fill={z.color}
                      fillOpacity={discovered ? 0.34 : 0.14}
                      stroke={z.color}
                      strokeWidth="1.5"
                    />
                    <text
                      x={(p1.x + p2.x) / 2}
                      y={(p1.y + p2.y) / 2 + 3}
                      textAnchor="middle"
                      fill="#f8fafc"
                      fontSize="9"
                      fontWeight="700"
                    >
                      {shortLabel[z.id] ?? z.label.split(' ')[0]}
                    </text>
                  </g>
                );
              })}

              {/* Live NPC markers */}
              {hud.npcMarkers.map((npc, i) => {
                const pt = toSvg(npc.x, npc.z);
                return (
                  <circle
                    key={i}
                    cx={pt.x}
                    cy={pt.y}
                    r={npc.role === 'teacher' ? 3 : 2}
                    fill={npc.alert ? '#ef4444' : npc.role === 'teacher' ? '#f97316' : '#94a3b8'}
                  />
                );
              })}

              {/* Player Marker */}
              <g transform={`translate(${playerPt.x}, ${playerPt.y})`}>
                <circle r="7" fill="#facc15" stroke="#0f172a" strokeWidth="2" />
                <circle r="2.5" fill="#0f172a" />
              </g>
            </svg>
          </div>

          <div className="md:col-span-5 flex flex-col gap-2">
            <h3 className="font-display font-bold text-sm text-slate-300 uppercase tracking-wider">
              Zonas da Escola
            </h3>
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {WORLD_ZONES.map((z) => {
                const found = hud.discoveredZones.includes(z.id);
                return (
                  <div
                    key={z.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: z.color }} />
                      <span className={found ? 'text-white font-semibold' : 'text-slate-400'}>
                        {z.isSecret && !found ? '??? (Área Secreta)' : z.label}
                      </span>
                    </div>
                    <MapPin className={`w-3.5 h-3.5 ${found ? 'text-emerald-400' : 'text-slate-600'}`} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 2. INVENTORY, COLLECTIBLES & SANDBOX CHALLENGES MODAL                      */
/* -------------------------------------------------------------------------- */
export const InventoryModal: React.FC<{
  hud: HudSnapshot;
  onUseItem: (id: string) => void;
  onDropItem: (id: string) => void;
  onClose: () => void;
}> = ({ hud, onUseItem, onDropItem, onClose }) => {
  const [tab, setTab] = useState<'mochila' | 'desafios' | 'reputacao'>('mochila');

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/80 flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border-2 border-slate-600 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl text-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTab('mochila')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-bold cursor-pointer ${
                tab === 'mochila' ? 'bg-[#facc15] text-slate-950' : 'bg-slate-800 text-slate-300'
              }`}
            >
              Mochila ({hud.inventory.length}/12)
            </button>
            <button
              type="button"
              onClick={() => setTab('desafios')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-bold cursor-pointer ${
                tab === 'desafios' ? 'bg-[#facc15] text-slate-950' : 'bg-slate-800 text-slate-300'
              }`}
            >
              Atividades Opcionais
            </button>
            <button
              type="button"
              onClick={() => setTab('reputacao')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-bold cursor-pointer ${
                tab === 'reputacao' ? 'bg-[#facc15] text-slate-950' : 'bg-slate-800 text-slate-300'
              }`}
            >
              Reputação
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar mochila"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {tab === 'mochila' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>
                  Colecionáveis secretos encontrados:{' '}
                  <strong className="text-[#facc15] font-mono-num">
                    {hud.collectiblesFound.length}/{hud.totalCollectibles}
                  </strong>
                </span>
                <span>Itens equipados ou consumíveis funcionam em tempo real</span>
              </div>

              {hud.inventory.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-sm bg-slate-900 rounded-xl border border-slate-800">
                  Sua mochila está vazia! Explore a cantina, biblioteca e salas para encontrar itens.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {hud.inventory.map((item) => {
                    const equipped = hud.equippedItemId === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 ${
                          equipped ? 'bg-slate-800 border-[#facc15]' : 'bg-slate-900 border-slate-800'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-display font-bold text-white">{item.name}</span>
                            <span className="font-mono-num text-xs text-amber-300">x{item.quantity}</span>
                          </div>
                          <div className="text-[11px] uppercase text-sky-400 font-semibold mt-0.5">
                            {item.category}
                          </div>
                          <p className="text-xs text-slate-300 mt-1.5">{item.description}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onUseItem(item.id)}
                            className="flex-1 py-1.5 px-3 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer"
                          >
                            {item.consumable ? 'Comer / Usar' : equipped ? 'Equipado' : 'Equipar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => onDropItem(item.id)}
                            aria-label={`Largar ${item.name}`}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-300 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === 'desafios' && (
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-400">Combinações Emergentes Descobertas</div>
                  <div className="font-mono-num font-bold text-xl text-emerald-400">
                    {hud.combosDiscovered} / {computeCombinatorialSpaceSize().toLocaleString('pt-BR')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">Placar da Quadra</div>
                  <div className="font-mono-num font-bold text-xl text-[#facc15]">
                    Você {hud.goalsScored} × {hud.npcGoalsScored} Alunos
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                {hud.challenges.map((ch) => (
                  <div
                    key={ch.id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800"
                  >
                    <div className="flex items-center gap-3">
                      {ch.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-600 shrink-0" />
                      )}
                      <div>
                        <div className="font-semibold text-sm text-white">{ch.title}</div>
                        <div className="text-xs text-slate-400">
                          Categoria: {ch.category} · Recompensa: +{ch.rewardReputation}
                        </div>
                      </div>
                    </div>
                    <span className="font-mono-num font-bold text-sm text-amber-300">
                      {ch.progress}/{ch.targetCount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'reputacao' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-900 border border-[#facc15]/40">
                <Trophy className="w-8 h-8 text-[#facc15]" />
                <div>
                  <div className="text-xs text-slate-400">Título Atual na Escola</div>
                  <div className="font-display font-bold text-xl text-white">{hud.dominantTitle}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(hud.reputation).map(([k, v]) => (
                  <div key={k} className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-xs capitalize text-slate-400">{k}</div>
                    <div className="font-mono-num font-bold text-2xl text-white mt-0.5">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 3. SETTINGS & SANDBOX CONTROLS MODAL                                       */
/* -------------------------------------------------------------------------- */
export const SettingsModal: React.FC<{
  settings: GameSettings;
  schoolMinutes?: number;
  weather?: WeatherKind;
  onSaveSettings: (s: GameSettings) => void;
  onChangeWeather?: (w: WeatherKind) => void;
  onChangeTime?: (mins: number) => void;
  onResetSave?: () => void;
  onClose: () => void;
}> = ({
  settings,
  schoolMinutes = 575,
  weather = 'ensolarado',
  onSaveSettings,
  onChangeWeather,
  onChangeTime,
  onResetSave,
  onClose,
}) => {
  const [draft, setDraft] = useState<GameSettings>({ ...settings });
  const [confirmReset, setConfirmReset] = useState(false);

  const update = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    onSaveSettings(next);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border-2 border-slate-600 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl text-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="font-display text-2xl font-bold text-[#facc15]">CONFIGURAÇÕES</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar configurações"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-sm">
          {/* Graphics */}
          <div className="space-y-3">
            <h3 className="font-display font-bold text-sky-400">Gráficos & Câmera</h3>
            <div className="grid grid-cols-4 gap-2">
              {(['baixo', 'medio', 'alto', 'ultra'] as const).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => update('graphicsQuality', preset)}
                  className={`py-2 rounded-lg font-bold capitalize cursor-pointer border ${
                    draft.graphicsQuality === preset
                      ? 'bg-[#facc15] text-slate-950 border-[#facc15]'
                      : 'bg-slate-900 text-slate-300 border-slate-700'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
              <span>Sombras em Tempo Real</span>
              <button
                type="button"
                onClick={() => update('shadowsEnabled', !draft.shadowsEnabled)}
                className={`px-3 py-1 rounded-lg font-bold text-xs cursor-pointer ${
                  draft.shadowsEnabled ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 text-slate-300'
                }`}
              >
                {draft.shadowsEnabled ? 'ATIVADAS' : 'DESATIVADAS'}
              </button>
            </div>

            <label className="block bg-slate-900 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between mb-1">
                <span>Sensibilidade da Câmera</span>
                <span className="font-mono-num">{draft.cameraSensitivity.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.4"
                max="2.2"
                step="0.1"
                value={draft.cameraSensitivity}
                onChange={(e) => update('cameraSensitivity', Number(e.target.value))}
                className="w-full accent-[#facc15]"
              />
            </label>

            <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
              <span>Controles Mobile na Tela</span>
              <select
                value={draft.showMobileControls}
                onChange={(e) => update('showMobileControls', e.target.value as GameSettings['showMobileControls'])}
                className="bg-slate-800 border border-slate-600 rounded-lg px-2.5 py-1 text-xs"
              >
                <option value="auto">Automático</option>
                <option value="always">Sempre Mostrar</option>
                <option value="never">Ocultar</option>
              </select>
            </div>
          </div>

          {/* Audio */}
          <div className="space-y-2.5">
            <h3 className="font-display font-bold text-emerald-400">Áudio</h3>
            {(
              [
                ['masterVolume', 'Volume Geral'],
                ['musicVolume', 'Música'],
                ['sfxVolume', 'Efeitos Sonoros'],
                ['ambientVolume', 'Ambiente'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block bg-slate-900 p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between mb-1 text-xs">
                  <span>{label}</span>
                  <span className="font-mono-num">{Math.round(draft[key] * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={draft[key]}
                  onChange={(e) => update(key, Number(e.target.value))}
                  className="w-full accent-emerald-400"
                />
              </label>
            ))}
          </div>

          {/* World Sandbox Controls */}
          {(onChangeWeather || onChangeTime) && (
            <div className="space-y-2.5">
              <h3 className="font-display font-bold text-amber-400">Simulação do Mundo</h3>
              {onChangeWeather && (
                <div className="grid grid-cols-4 gap-2">
                  {(['ensolarado', 'nublado', 'chuvoso', 'tempestade'] as const).map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => onChangeWeather(w)}
                      className={`py-2 rounded-lg text-xs font-bold capitalize cursor-pointer border ${
                        weather === w
                          ? 'bg-sky-400 text-slate-950 border-sky-300'
                          : 'bg-slate-900 text-slate-300 border-slate-700'
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              )}
              {onChangeTime && (
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Horário Escolar</span>
                    <span className="font-mono-num text-[#facc15]">{formatSchoolClock(schoolMinutes)}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {[
                      ['07:15 Chegada', 435],
                      ['09:35 Recreio', 575],
                      ['11:40 Almoço', 700],
                      ['17:45 Pôr-do-Sol', 1065],
                    ].map(([lbl, mins]) => (
                      <button
                        key={String(lbl)}
                        type="button"
                        onClick={() => onChangeTime(Number(mins))}
                        className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold cursor-pointer"
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Save Reset */}
          {onResetSave && (
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-950/70 hover:bg-rose-900 text-rose-200 text-xs font-bold cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reiniciar Progresso Salvo
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-rose-300">Confirmar exclusão do save?</span>
                  <button
                    type="button"
                    onClick={() => {
                      onResetSave();
                      setConfirmReset(false);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold cursor-pointer"
                  >
                    Sim, Zerar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-700 text-white text-xs font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-[#facc15] text-slate-950 font-bold text-sm cursor-pointer"
              >
                Concluir
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 4. PAUSE MODAL                                                             */
/* -------------------------------------------------------------------------- */
export const PauseModal: React.FC<{
  hud: HudSnapshot;
  onResume: () => void;
  onSave: () => void;
  onOpenSettings: () => void;
  onReturnTitle: () => void;
}> = ({ hud, onResume, onSave, onOpenSettings, onReturnTitle }) => {
  const [savedToast, setSavedToast] = useState(false);

  return (
    <div className="fixed inset-0 z-30 bg-slate-950/80 flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border-2 border-[#facc15]/60 rounded-2xl w-full max-w-sm p-6 shadow-2xl text-slate-100 text-center space-y-5">
        <div>
          <h2 className="font-display text-3xl font-bold text-[#facc15]">JOGO PAUSADO</h2>
          <p className="text-xs text-slate-400 mt-1">
            {hud.currentZoneLabel} · {formatSchoolClock(hud.schoolMinutes)}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center bg-slate-900 rounded-xl p-3 border border-slate-800">
          <div>
            <div className="text-[10px] text-slate-400">Gols</div>
            <div className="font-mono-num font-bold text-lg text-emerald-400">{hud.goalsScored}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">Segredos</div>
            <div className="font-mono-num font-bold text-lg text-[#facc15]">
              {hud.collectiblesFound.length}/{hud.totalCollectibles}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">Áreas</div>
            <div className="font-mono-num font-bold text-lg text-sky-400">{hud.discoveredZones.length}/12</div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full py-3 rounded-xl bg-[#facc15] hover:bg-[#fde047] text-slate-950 font-display font-bold text-base cursor-pointer"
          >
            CONTINUAR JOGO
          </button>
          <button
            type="button"
            onClick={() => {
              onSave();
              setSavedToast(true);
              setTimeout(() => setSavedToast(false), 2000);
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm border border-slate-700 cursor-pointer"
          >
            <Save className="w-4 h-4 text-emerald-400" />
            {savedToast ? 'Progresso Salvo!' : 'Salvar Agora'}
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm border border-slate-700 cursor-pointer"
          >
            Configurações & Mundo
          </button>
          <button
            type="button"
            onClick={onReturnTitle}
            className="w-full py-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/70 text-rose-200 font-semibold text-sm border border-rose-800/60 cursor-pointer"
          >
            Voltar ao Menu Inicial
          </button>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 5. FICTIONAL SCHOOL COMPUTER OS MODAL                                      */
/* -------------------------------------------------------------------------- */
export const ComputerOsModal: React.FC<{
  title: string;
  onClose: () => void;
}> = ({ title, onClose }) => (
  <div className="fixed inset-0 z-40 bg-slate-950/80 flex items-center justify-center p-4">
    <div className="bg-[#0b1322] border-2 border-sky-400 rounded-2xl w-full max-w-lg shadow-2xl text-slate-100 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 bg-sky-950 border-b border-sky-500/40">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-sky-400" />
          <span className="font-mono-num font-bold text-sm text-sky-200">EduOS 2026 · {title}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Desligar computador"
          className="px-2.5 py-1 rounded bg-rose-600 text-white text-xs font-bold cursor-pointer"
        >
          Sair
        </button>
      </div>
      <div className="p-5 space-y-4 font-mono-num text-xs">
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 space-y-1.5">
          <div className="text-emerald-400 font-bold">&gt; BOLETIM_ESCOLAR_TRIO.TXT</div>
          <div>Emanuel (Rato): Ed. Física 10.0 · Corrida nos Corredores 10.0 · Quietude 2.5</div>
          <div>Pedro Henrique (Pato): Teatro & Comédia 10.0 · Silêncio na Biblioteca 0.0</div>
          <div>Pedro Antonio (Águia): Geografia Aérea 10.0 · Altura Máxima 10.0</div>
        </div>
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 space-y-1">
          <div className="text-amber-300 font-bold">&gt; DICA SECRETA DA ESCOLA</div>
          <p className="text-slate-300 leading-relaxed">
            Rumores dizem que uma das estantes no fundo da Biblioteca desliza quando alguém puxa o livro secreto,
            revelando a Sala Abandonada 00! E dizem que o Pedro Antonio consegue planar até a Caixa d’Água do terraço.
          </p>
        </div>
      </div>
    </div>
  </div>
);

/* -------------------------------------------------------------------------- */
/* 6. CREDITS MODAL                                                           */
/* -------------------------------------------------------------------------- */
export const CreditsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4">
    <div className="bg-[#0f172a] border-2 border-slate-600 rounded-2xl w-full max-w-md p-6 shadow-2xl text-slate-100 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-[#facc15]">CRÉDITOS</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar créditos"
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="space-y-2 text-sm text-slate-300">
        <p className="font-bold text-white">RT: O TRIO — Três Animais. Uma Escola. Zero Sossego.</p>
        <p>Sandbox Voxel 3D em mundo aberto numa escola brasileira viva.</p>
        <ul className="text-xs text-slate-400 space-y-1 pt-2 border-t border-slate-800">
          <li>• Protagonistas: Emanuel (Rato), Pedro Henrique (Pato), Pedro Antonio (Águia-Harpia)</li>
          <li>• Mundo: 10 Zonas Escolares + 20 Salas de Aula + Quadras + Bairro ao Redor</li>
          <li>• Áudio & Texturas: 100% Procedurais em Tempo Real (WebGL & Web Audio)</li>
        </ul>
      </div>
    </div>
  </div>
);
