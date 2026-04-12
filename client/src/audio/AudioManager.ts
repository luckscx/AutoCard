/**
 * AudioManager — 管理 BGM 音量和音效音量。
 * - BGM 使用 Web Audio API 程序化合成简单环境音乐循环
 * - 音效音量通过 SoundManager.setSfxVolume() 代理
 * - 所有设置持久化到 localStorage
 */

import { sound } from './SoundManager.js';

const LS_BGM_VOL = 'autocard_bgm_vol';
const LS_SFX_VOL = 'autocard_sfx_vol';

export class AudioManager {
  /** BGM 音量 (0~100) */
  private _bgmVolume: number;
  /** 音效音量 (0~100) */
  private _sfxVolume: number;

  private ctx: AudioContext | null = null;
  private bgmGain: GainNode | null = null;
  private bgmOscillators: OscillatorNode[] = [];
  private bgmRunning = false;

  constructor() {
    this._bgmVolume = Number(localStorage.getItem(LS_BGM_VOL) ?? 50);
    this._sfxVolume = Number(localStorage.getItem(LS_SFX_VOL) ?? 80);
    // 初始化 SoundManager 音效音量
    sound.setSfxVolume(this._sfxVolume / 100);
  }

  get bgmVolume() { return this._bgmVolume; }
  get sfxVolume() { return this._sfxVolume; }

  /** 设置 BGM 音量（0~100），立即生效并持久化 */
  setBgmVolume(v: number) {
    this._bgmVolume = Math.max(0, Math.min(100, Math.round(v)));
    localStorage.setItem(LS_BGM_VOL, String(this._bgmVolume));
    if (this.bgmGain) {
      this.bgmGain.gain.value = this._bgmVolume / 100 * 0.08; // 0.08 基准峰值，BGM 很轻柔
    }
    // 若音量为 0 则静音 BGM，否则确保 BGM 在运行
    if (this._bgmVolume > 0 && !this.bgmRunning) {
      this.startBgm();
    }
  }

  /** 设置音效音量（0~100），立即生效并持久化 */
  setSfxVolume(v: number) {
    this._sfxVolume = Math.max(0, Math.min(100, Math.round(v)));
    localStorage.setItem(LS_SFX_VOL, String(this._sfxVolume));
    sound.setSfxVolume(this._sfxVolume / 100);
  }

  /** 在用户交互后调用，启动 BGM */
  startBgm() {
    if (this.bgmRunning || this._bgmVolume === 0) return;
    try {
      const ctx = this.ensureCtx();
      this.bgmRunning = true;
      this.scheduleBgmLoop(ctx);
    } catch (e) {
      console.warn('[AudioManager] BGM 启动失败:', e);
    }
  }

  /** 停止 BGM */
  stopBgm() {
    this.bgmRunning = false;
    for (const osc of this.bgmOscillators) {
      try { osc.stop(); } catch { /* 已停止 */ }
    }
    this.bgmOscillators = [];
  }

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = this._bgmVolume / 100 * 0.08;
      this.bgmGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * 程序化 BGM 循环：一个低频 drone + 每 4 秒触发一次柔和琶音
   * 非常轻柔，仅作环境背景。
   */
  private scheduleBgmLoop(ctx: AudioContext) {
    if (!this.bgmRunning || !this.bgmGain) return;

    const now = ctx.currentTime;
    const barLen = 4.0; // 每节 4 秒

    // 底部 drone：低频正弦，持续播放
    this.scheduleDrone(ctx, now, barLen * 8);

    // 每节安排一个上升琶音
    for (let i = 0; i < 8; i++) {
      this.scheduleArpeggio(ctx, now + i * barLen);
    }

    // 32 秒后重新循环
    const loopTimeout = (barLen * 8 * 1000) - 200;
    setTimeout(() => {
      if (this.bgmRunning) {
        this.scheduleBgmLoop(ctx);
      }
    }, loopTimeout);
  }

  private scheduleDrone(ctx: AudioContext, start: number, duration: number) {
    if (!this.bgmGain) return;
    const freqs = [110, 165]; // A2 + E3
    for (const freq of freqs) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.4, start + 1.5);
      gain.gain.setValueAtTime(0.4, start + duration - 1.5);
      gain.gain.linearRampToValueAtTime(0, start + duration);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.connect(this.bgmGain);
      osc.connect(gain);
      osc.start(start);
      osc.stop(start + duration);
      this.bgmOscillators.push(osc);
    }
  }

  private scheduleArpeggio(ctx: AudioContext, barStart: number) {
    if (!this.bgmGain) return;
    // Am 琶音：A3 C4 E4 A4（游戏主题氛围）
    const notes = [220, 261.63, 329.63, 440];
    const noteDur = 0.35;
    const noteGap = 0.42;

    notes.forEach((freq, i) => {
      const t = barStart + 0.5 + i * noteGap;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.55, t + 0.05);
      gain.gain.setValueAtTime(0.55, t + noteDur * 0.5);
      gain.gain.linearRampToValueAtTime(0, t + noteDur);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.connect(this.bgmGain!);
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + noteDur);
      this.bgmOscillators.push(osc);
    });
  }
}

/** 全局单例 */
export const audioManager = new AudioManager();
