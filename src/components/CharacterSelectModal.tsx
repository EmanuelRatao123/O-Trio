import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { X, RotateCw, Check } from 'lucide-react';
import { createCharacterRig, updateCharacterAnimation, type CharacterRig } from '../game/characters';
import { CHARACTER_PROFILES } from '../game/rules';
import type { CharacterId } from '../game/types';

interface CharacterSelectModalProps {
  selected: CharacterId;
  onSelect: (id: CharacterId) => void;
  onConfirmPlay: (id: CharacterId) => void;
  onClose: () => void;
}

const IDS: CharacterId[] = ['emanuel', 'pedro_henrique', 'pedro_antonio'];

export const CharacterSelectModal: React.FC<CharacterSelectModalProps> = ({
  selected,
  onSelect,
  onConfirmPlay,
  onClose,
}) => {
  const [activeId, setActiveId] = useState<CharacterId>(selected);
  const mountRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef<CharacterId>(selected);
  const yawRef = useRef(0.35);
  const draggingRef = useRef(false);
  const lastXRef = useRef(0);

  useEffect(() => {
    activeIdRef.current = activeId;
    onSelect(activeId);
  }, [activeId, onSelect]);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      preserveDrawingBuffer: isSoftwareGl,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(el.clientWidth || 320, el.clientHeight || 320);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, (el.clientWidth || 320) / (el.clientHeight || 320), 0.1, 30);
    camera.position.set(0, 1.55, 3.7);
    camera.lookAt(0, 1.0, 0);

    const hemi = new THREE.HemisphereLight(0xe0f2fe, 0x334155, 1.1);
    const key = new THREE.DirectionalLight(0xfffbeb, 1.8);
    key.position.set(3, 5, 4);
    const rim = new THREE.DirectionalLight(0x38bdf8, 0.7);
    rim.position.set(-3, 3, -3);
    scene.add(hemi, key, rim);

    const ped = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.3, 0.22, 24),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.35 }),
    );
    ped.position.y = -0.11;
    scene.add(ped);

    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x090d16, transparent: true, opacity: 0.35 });
    const rigs: Record<CharacterId, CharacterRig> = {
      emanuel: createCharacterRig('emanuel', shadowMat),
      pedro_henrique: createCharacterRig('pedro_henrique', shadowMat),
      pedro_antonio: createCharacterRig('pedro_antonio', shadowMat),
    };
    Object.values(rigs).forEach((r) => scene.add(r.root));

    let disposed = false;
    let frameId = 0;
    let last = performance.now();

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync?.(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      let polls = 0;
      const poll = () => {
        if (disposed) return;
        polls++;
        let done = true;
        if (sync) {
          const res = gl.clientWaitSync(sync, 0, 0);
          done = res === gl.ALREADY_SIGNALED || res === gl.CONDITION_SATISFIED || polls >= 20;
        }
        if (!done) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(() => requestAnimationFrame(cb), 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      if (!draggingRef.current) {
        yawRef.current += dt * 0.55;
      }

      IDS.forEach((id) => {
        const r = rigs[id];
        r.root.visible = id === activeIdRef.current;
        if (r.root.visible) {
          r.root.rotation.y = yawRef.current;
          updateCharacterAnimation(r, 'idle', 0, dt);
        }
      });

      renderer.render(scene, camera);
      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      shadowMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
    };
  }, []);

  const profile = CHARACTER_PROFILES[activeId];

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/80 flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border-2 border-slate-600 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl text-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#facc15]">SELEÇÃO DE PERSONAGEM</h2>
            <p className="text-xs text-slate-400">Arraste o modelo 3D para girar · Troque a qualquer momento no jogo (teclas 1, 2, 3)</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar seleção"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6">
          {/* Left 3D Turntable */}
          <div className="md:col-span-5 flex flex-col gap-3">
            <div
              ref={mountRef}
              onPointerDown={(e) => {
                draggingRef.current = true;
                lastXRef.current = e.clientX;
              }}
              onPointerMove={(e) => {
                if (!draggingRef.current) return;
                const dx = e.clientX - lastXRef.current;
                lastXRef.current = e.clientX;
                yawRef.current += dx * 0.015;
              }}
              onPointerUp={() => {
                draggingRef.current = false;
              }}
              onPointerLeave={() => {
                draggingRef.current = false;
              }}
              className="relative w-full h-72 md:h-80 rounded-xl bg-slate-900 border border-slate-700 cursor-grab active:cursor-grabbing overflow-hidden"
            >
              <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2.5 py-1 rounded bg-slate-950/80 text-[11px] text-slate-300 pointer-events-none">
                <RotateCw className="w-3 h-3" />
                3D Interativo
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {IDS.map((id, idx) => {
                const p = CHARACTER_PROFILES[id];
                const isActive = activeId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveId(id)}
                    className={`py-2.5 px-2 rounded-xl border text-center transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-slate-800 border-[#facc15] text-white'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="text-[11px] font-mono-num text-slate-400">[{idx + 1}]</div>
                    <div className="font-display font-bold text-xs truncate">{p.name}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Profile & Stats */}
          <div className="md:col-span-7 flex flex-col justify-between gap-4">
            <div className="space-y-4">
              <div>
                <div className="text-xs font-semibold text-sky-400 uppercase tracking-wider">{profile.species}</div>
                <h3 className="font-display text-3xl font-bold text-white">{profile.name}</h3>
                <p className="text-sm font-medium text-amber-300">{profile.title}</p>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed">{profile.description}</p>

              <div className="bg-slate-900 border border-slate-700 rounded-xl p-3.5">
                <div className="text-xs text-slate-400 mb-1">Personalidade</div>
                <div className="text-sm font-medium text-white">{profile.personality}</div>
              </div>

              <div className="bg-slate-900 border border-[#facc15]/40 rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#facc15]">
                    Habilidade Especial [Q]
                  </span>
                  <span className="text-xs font-mono-num text-slate-400">
                    Recarga: {profile.abilityCooldown}s
                  </span>
                </div>
                <div className="font-display font-bold text-base text-white">{profile.abilityName}</div>
                <p className="text-xs text-slate-300 mt-1">{profile.abilityDescription}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {Object.entries(profile.stats).map(([key, val]) => {
                  const labelMap: Record<string, string> = {
                    velocidade: 'Velocidade',
                    agilidade: 'Agilidade',
                    carisma: 'Carisma',
                    exploracao: 'Exploração',
                  };
                  return (
                    <div key={key} className="bg-slate-900 rounded-lg p-2.5 border border-slate-800">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">{labelMap[key] ?? key}</span>
                        <span className="font-mono-num font-bold text-white">{val}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded overflow-hidden">
                        <div
                          className="h-full rounded"
                          style={{ width: `${val}%`, backgroundColor: profile.accentColor }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => onConfirmPlay(activeId)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#facc15] hover:bg-[#fde047] text-slate-950 font-display font-bold text-sm cursor-pointer"
              >
                <Check className="w-4 h-4" />
                JOGAR COM {profile.name.toUpperCase()}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
