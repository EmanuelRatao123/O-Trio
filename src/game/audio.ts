import type { CharacterId, GameSettings } from './types';

export class ProceduralAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private musicInterval: number | null = null;
  private musicStep = 0;
  private muted = false;
  private settings: GameSettings;

  constructor(settings: GameSettings) {
    this.settings = { ...settings };
  }

  public unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.ambientGain = this.ctx.createGain();

    this.musicGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.ambientGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    this.applySettings(this.settings);
    this.startMusicLoop();
  }

  public applySettings(settings: GameSettings): void {
    this.settings = { ...settings };
    if (!this.ctx || !this.masterGain || !this.musicGain || !this.sfxGain || !this.ambientGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.muted ? 0 : settings.masterVolume, now, 0.03);
    this.musicGain.gain.setTargetAtTime(settings.musicVolume * 0.35, now, 0.05);
    this.sfxGain.gain.setTargetAtTime(settings.sfxVolume * 0.7, now, 0.03);
    this.ambientGain.gain.setTargetAtTime(settings.ambientVolume * 0.35, now, 0.05);
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
    this.applySettings(this.settings);
  }

  public isMuted(): boolean {
    return this.muted;
  }

  private startMusicLoop(): void {
    if (this.musicInterval !== null) return;
    // Playful Brazilian-inspired marimba/choro pentatonic bass + melody pattern
    const melody = [523.25, 659.25, 783.99, 659.25, 880.0, 783.99, 659.25, 587.33];
    const bass = [130.81, 0, 196.0, 0, 146.83, 0, 196.0, 164.81];

    this.musicInterval = window.setInterval(() => {
      if (!this.ctx || !this.musicGain || this.ctx.state !== 'running' || this.muted || this.settings.musicVolume <= 0.01) {
        return;
      }
      const now = this.ctx.currentTime;
      const idx = this.musicStep % melody.length;
      this.musicStep++;

      // Lighthearted marimba note
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(melody[idx] * (this.musicStep % 16 >= 8 ? 1.122 : 1), now);
      env.gain.setValueAtTime(0.001, now);
      env.gain.linearRampToValueAtTime(0.14, now + 0.015);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.connect(env);
      env.connect(this.musicGain);
      osc.start(now);
      osc.stop(now + 0.26);

      // Syncopated bass pulse
      const bassFreq = bass[idx];
      if (bassFreq > 0) {
        const bOsc = this.ctx.createOscillator();
        const bEnv = this.ctx.createGain();
        bOsc.type = 'sine';
        bOsc.frequency.setValueAtTime(bassFreq, now);
        bEnv.gain.setValueAtTime(0.001, now);
        bEnv.gain.linearRampToValueAtTime(0.22, now + 0.02);
        bEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
        bOsc.connect(bEnv);
        bEnv.connect(this.musicGain);
        bOsc.start(now);
        bOsc.stop(now + 0.34);
      }
    }, 260);
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.28,
  ): void {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freqEnd), now + duration);
    env.gain.setValueAtTime(0.001, now);
    env.gain.linearRampToValueAtTime(volume, now + 0.012);
    env.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(env);
    env.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playFootstep(): void {
    const jitter = 0.92 + Math.random() * 0.16;
    this.playTone(130 * jitter, 65, 0.055, 'triangle', 0.11);
  }

  public playJump(): void {
    this.playTone(220, 480, 0.16, 'sine', 0.24);
  }

  public playLand(): void {
    this.playTone(140, 52, 0.11, 'triangle', 0.25);
  }

  public playCharacterVoice(id: CharacterId): void {
    if (id === 'emanuel') {
      // Rat double squeak!
      this.playTone(950, 1480, 0.08, 'sine', 0.26);
      setTimeout(() => this.playTone(1120, 1650, 0.09, 'sine', 0.24), 90);
    } else if (id === 'pedro_henrique') {
      // Comedic duck quack!
      this.playTone(340, 210, 0.14, 'sawtooth', 0.28);
      setTimeout(() => this.playTone(360, 195, 0.18, 'sawtooth', 0.28), 130);
    } else {
      // Harpy eagle cry!
      this.playTone(1420, 820, 0.32, 'triangle', 0.3);
    }
  }

  public playKick(): void {
    this.playTone(185, 58, 0.12, 'triangle', 0.35);
  }

  public playPickup(): void {
    this.playTone(523, 880, 0.14, 'sine', 0.26);
    setTimeout(() => this.playTone(880, 1175, 0.14, 'sine', 0.24), 85);
  }

  public playDoor(): void {
    this.playTone(180, 240, 0.18, 'triangle', 0.22);
  }

  public playBell(): void {
    this.playTone(880, 865, 0.55, 'sine', 0.35);
    setTimeout(() => this.playTone(1108, 1095, 0.55, 'sine', 0.28), 140);
  }

  public playGoalCheer(): void {
    const notes = [523, 659, 784, 1046];
    notes.forEach((n, idx) => {
      setTimeout(() => this.playTone(n, n * 1.02, 0.22, 'triangle', 0.3), idx * 90);
    });
  }

  public playUiClick(): void {
    this.playTone(620, 740, 0.05, 'sine', 0.15);
  }

  public dispose(): void {
    if (this.musicInterval !== null) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
