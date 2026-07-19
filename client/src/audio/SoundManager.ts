/**
 * SoundManager — 使用 Web Audio API 程序化合成音效，无需任何外部音频文件。
 * 单例，懒初始化 AudioContext（需用户交互后才能创建）。
 */

export type SoundType =
  | 'click'        // 按钮点击：短促高频 click
  | 'damage1'      // 攻击命中变体1：清脆打击
  | 'damage2'      // 攻击命中变体2：重击
  | 'damage3'      // 攻击命中变体3：利刃
  | 'hurt1'        // 受伤变体1：闷响
  | 'hurt2'        // 受伤变体2：低频冲击
  | 'heal'         // 治疗：上升柔和音
  | 'shield'       // 护盾：金属叮声
  | 'card_trigger' // 卡牌触发：快速 blip
  | 'destroy'      // 摧毁：爆炸轰鸣
  | 'overtime'     // 加时：警报
  | 'haste'        // 加速：高频扫音
  | 'slow'         // 减速：下降扫音
  | 'freeze'       // 冻结：冰晶声
  | 'charge'       // 充能：蓄力上升
  | 'buy'          // 购买：硬币+叮
  | 'sell'         // 卖出：硬币滑落
  | 'refresh'      // 刷新：洗牌嗖嗖
  | 'win'          // 胜利：上升和弦
  | 'lose';        // 失败：下降和弦

export class SoundManager {
  /** 全局静音开关 */
  muted = false;

  /** 音效音量（0~1），由 AudioManager 控制 */
  sfxVolume = 1;

  private ctx: AudioContext | null = null;
  /** 主增益节点（音效总音量路由） */
  private masterGain: GainNode | null = null;

  /** 懒初始化 AudioContext（浏览器要求用户手势后才允许创建） */
  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.sfxVolume;
      this.masterGain.connect(this.ctx.destination);
    }
    // 若因自动播放策略被挂起，则尝试恢复
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  /** 获取路由目标（masterGain 或 ctx.destination） */
  private getDest(): AudioNode {
    return this.masterGain ?? this.getCtx().destination;
  }

  /** 更新音效音量（0~1） */
  setSfxVolume(v: number) {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    if (this.masterGain) {
      this.masterGain.gain.value = this.sfxVolume;
    }
  }

  /** 创建带 attack/release 的 GainNode，避免爆音 */
  private makeGain(ctx: AudioContext, peak: number, attackTime: number, releaseTime: number, startTime: number): GainNode {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(peak, startTime + attackTime);
    gain.gain.setValueAtTime(peak, startTime + attackTime);
    gain.gain.linearRampToValueAtTime(0, startTime + attackTime + releaseTime);
    return gain;
  }

  /** 创建白噪声 BufferSourceNode */
  private makeNoise(ctx: AudioContext, duration: number): AudioBufferSourceNode {
    const sampleRate = ctx.sampleRate;
    const frameCount = Math.ceil(sampleRate * duration);
    const buffer = ctx.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    return source;
  }

  play(type: SoundType): void {
    if (this.muted) return;

    try {
      const ctx = this.getCtx();
      const now = ctx.currentTime;

      switch (type) {
        case 'click':
          this.playClick(ctx, now);
          break;
        case 'damage1':
          this.playDamage1(ctx, now);
          break;
        case 'damage2':
          this.playDamage2(ctx, now);
          break;
        case 'damage3':
          this.playDamage3(ctx, now);
          break;
        case 'hurt1':
          this.playHurt1(ctx, now);
          break;
        case 'hurt2':
          this.playHurt2(ctx, now);
          break;
        case 'heal':
          this.playHeal(ctx, now);
          break;
        case 'shield':
          this.playShield(ctx, now);
          break;
        case 'card_trigger':
          this.playCardTrigger(ctx, now);
          break;
        case 'destroy':
          this.playDestroy(ctx, now);
          break;
        case 'overtime':
          this.playOvertime(ctx, now);
          break;
        case 'haste':
          this.playHaste(ctx, now);
          break;
        case 'slow':
          this.playSlow(ctx, now);
          break;
        case 'freeze':
          this.playFreeze(ctx, now);
          break;
        case 'charge':
          this.playCharge(ctx, now);
          break;
        case 'buy':
          this.playBuy(ctx, now);
          break;
        case 'sell':
          this.playSell(ctx, now);
          break;
        case 'refresh':
          this.playRefresh(ctx, now);
          break;
        case 'win':
          this.playWin(ctx, now);
          break;
        case 'lose':
          this.playLose(ctx, now);
          break;
      }
    } catch (e) {
      // Web Audio 不可用时静默降级
      console.warn('[SoundManager] 播放失败:', e);
    }
  }

  /** 随机播放攻击命中音效（3种变体） */
  playRandomHit(): void {
    const variants: SoundType[] = ['damage1', 'damage2', 'damage3'];
    this.play(variants[Math.floor(Math.random() * variants.length)]);
  }

  /** 随机播放受伤音效（2种变体） */
  playRandomHurt(): void {
    const variants: SoundType[] = ['hurt1', 'hurt2'];
    this.play(variants[Math.floor(Math.random() * variants.length)]);
  }

  // ── 各音效实现 ──────────────────────────────────────────────

  /** 按钮点击：短促高频 click (sine, 800→400Hz, 0.05s) */
  private playClick(ctx: AudioContext, now: number): void {
    const osc = ctx.createOscillator();
    const gain = this.makeGain(ctx, 0.3, 0.002, 0.048, now);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.linearRampToValueAtTime(400, now + 0.05);

    osc.connect(gain);
    gain.connect(this.getDest());
    osc.start(now);
    osc.stop(now + 0.05);
  }

  /** 攻击命中变体1：清脆打击 (sine, 500→250Hz, 0.08s) + 短噪声 */
  private playDamage1(ctx: AudioContext, now: number): void {
    const osc = ctx.createOscillator();
    const oscGain = this.makeGain(ctx, 0.35, 0.002, 0.078, now);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.exponentialRampToValueAtTime(250, now + 0.08);
    osc.connect(oscGain);
    oscGain.connect(this.getDest());
    osc.start(now);
    osc.stop(now + 0.08);

    // 短噪声点缀
    const noise = this.makeNoise(ctx, 0.04);
    const noiseGain = this.makeGain(ctx, 0.15, 0.001, 0.039, now);
    noise.connect(noiseGain);
    noiseGain.connect(this.getDest());
    noise.start(now);
    noise.stop(now + 0.04);
  }

  /** 攻击命中变体2：重击 (sawtooth, 180→60Hz, 0.12s) + 噪声冲击 */
  private playDamage2(ctx: AudioContext, now: number): void {
    const osc = ctx.createOscillator();
    const oscGain = this.makeGain(ctx, 0.45, 0.002, 0.118, now);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.12);
    osc.connect(oscGain);
    oscGain.connect(this.getDest());
    osc.start(now);
    osc.stop(now + 0.12);

    const noise = this.makeNoise(ctx, 0.06);
    const noiseGain = this.makeGain(ctx, 0.2, 0.001, 0.059, now);
    noise.connect(noiseGain);
    noiseGain.connect(this.getDest());
    noise.start(now);
    noise.stop(now + 0.06);
  }

  /** 攻击命中变体3：利刃 (triangle, 1200→600Hz, 0.06s) + 高频噪声 */
  private playDamage3(ctx: AudioContext, now: number): void {
    const osc = ctx.createOscillator();
    const oscGain = this.makeGain(ctx, 0.25, 0.001, 0.059, now);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.06);
    osc.connect(oscGain);
    oscGain.connect(this.getDest());
    osc.start(now);
    osc.stop(now + 0.06);

    const noise = this.makeNoise(ctx, 0.03);
    const noiseGain = this.makeGain(ctx, 0.12, 0.001, 0.029, now);
    noise.connect(noiseGain);
    noiseGain.connect(this.getDest());
    noise.start(now);
    noise.stop(now + 0.03);
  }

  /** 受伤变体1：闷响 (sine, 150→60Hz, 0.18s) */
  private playHurt1(ctx: AudioContext, now: number): void {
    const osc = ctx.createOscillator();
    const gain = this.makeGain(ctx, 0.35, 0.003, 0.177, now);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.18);
    osc.connect(gain);
    gain.connect(this.getDest());
    osc.start(now);
    osc.stop(now + 0.18);
  }

  /** 受伤变体2：低频冲击 (sawtooth, 120→40Hz, 0.15s) + 噪声 */
  private playHurt2(ctx: AudioContext, now: number): void {
    const osc = ctx.createOscillator();
    const oscGain = this.makeGain(ctx, 0.3, 0.003, 0.147, now);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
    osc.connect(oscGain);
    oscGain.connect(this.getDest());
    osc.start(now);
    osc.stop(now + 0.15);

    const noise = this.makeNoise(ctx, 0.08);
    const noiseGain = this.makeGain(ctx, 0.15, 0.002, 0.078, now);
    noise.connect(noiseGain);
    noiseGain.connect(this.getDest());
    noise.start(now);
    noise.stop(now + 0.08);
  }

  /** 治疗：上升柔和音 (sine, 400→800Hz, 0.25s) */
  private playHeal(ctx: AudioContext, now: number): void {
    const osc = ctx.createOscillator();
    const gain = this.makeGain(ctx, 0.25, 0.01, 0.24, now);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.linearRampToValueAtTime(800, now + 0.25);

    osc.connect(gain);
    gain.connect(this.getDest());
    osc.start(now);
    osc.stop(now + 0.25);
  }

  /** 护盾：金属叮声 (triangle, 1200Hz, 0.1s) + 快衰减 */
  private playShield(ctx: AudioContext, now: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.3);

    osc.connect(gain);
    gain.connect(this.getDest());
    osc.start(now);
    osc.stop(now + 0.3);
  }

  /** 卡牌触发：快速 blip (square, 600Hz, 0.05s) */
  private playCardTrigger(ctx: AudioContext, now: number): void {
    const osc = ctx.createOscillator();
    const gain = this.makeGain(ctx, 0.2, 0.002, 0.048, now);

    osc.type = 'square';
    osc.frequency.setValueAtTime(600, now);

    osc.connect(gain);
    gain.connect(this.getDest());
    osc.start(now);
    osc.stop(now + 0.05);
  }

  /** 摧毁：爆炸轰鸣 — 噪声 + 低沉 sawtooth 下扫 */
  private playDestroy(ctx: AudioContext, now: number): void {
    // 噪声爆炸
    const noise = this.makeNoise(ctx, 0.3);
    const noiseGain = this.makeGain(ctx, 0.5, 0.002, 0.298, now);
    noise.connect(noiseGain);
    noiseGain.connect(this.getDest());
    noise.start(now);
    noise.stop(now + 0.3);

    // 低频 sawtooth
    const osc = ctx.createOscillator();
    const oscGain = this.makeGain(ctx, 0.4, 0.002, 0.298, now);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 0.3);
    osc.connect(oscGain);
    oscGain.connect(this.getDest());
    osc.start(now);
    osc.stop(now + 0.3);
  }

  /** 加时：警报 — 两个振荡器交替 (400Hz / 600Hz, 各 0.2s) */
  private playOvertime(ctx: AudioContext, now: number): void {
    const freqs = [400, 600];
    freqs.forEach((freq, i) => {
      const t = now + i * 0.2;
      const osc = ctx.createOscillator();
      const gain = this.makeGain(ctx, 0.4, 0.005, 0.185, t);

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t);

      osc.connect(gain);
      gain.connect(this.getDest());
      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  /** 加速：高频上扫 (sine, 400→1200Hz, 0.2s) */
  private playHaste(ctx: AudioContext, now: number): void {
    const osc = ctx.createOscillator();
    const gain = this.makeGain(ctx, 0.25, 0.005, 0.195, now);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.2);

    osc.connect(gain);
    gain.connect(this.getDest());
    osc.start(now);
    osc.stop(now + 0.2);
  }

  /** 减速：下降扫音 (sine, 800→200Hz, 0.3s) */
  private playSlow(ctx: AudioContext, now: number): void {
    const osc = ctx.createOscillator();
    const gain = this.makeGain(ctx, 0.2, 0.005, 0.295, now);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);

    osc.connect(gain);
    gain.connect(this.getDest());
    osc.start(now);
    osc.stop(now + 0.3);
  }

  /** 冻结：冰晶声 (triangle, 1000Hz, 0.15s) + tremolo */
  private playFreeze(ctx: AudioContext, now: number): void {
    const osc = ctx.createOscillator();
    const gain = this.makeGain(ctx, 0.2, 0.005, 0.145, now);

    // Tremolo：低频振荡调制增益
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(0.08, now);
    lfo.frequency.setValueAtTime(20, now);
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1000, now);
    osc.frequency.linearRampToValueAtTime(1200, now + 0.15);

    osc.connect(gain);
    gain.connect(this.getDest());
    osc.start(now);
    lfo.start(now);
    osc.stop(now + 0.15);
    lfo.stop(now + 0.15);
  }

  /** 充能：蓄力上升 (sine, 200→600Hz, 0.4s) */
  private playCharge(ctx: AudioContext, now: number): void {
    const osc = ctx.createOscillator();
    const gain = this.makeGain(ctx, 0.3, 0.01, 0.39, now);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.4);

    osc.connect(gain);
    gain.connect(this.getDest());
    osc.start(now);
    osc.stop(now + 0.4);
  }

  /** 购买：两音连发 (sine 600Hz 0.08s → sine 900Hz 0.1s) */
  private playBuy(ctx: AudioContext, now: number): void {
    // 第一音
    const osc1 = ctx.createOscillator();
    const gain1 = this.makeGain(ctx, 0.3, 0.005, 0.075, now);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(600, now);
    osc1.connect(gain1);
    gain1.connect(this.getDest());
    osc1.start(now);
    osc1.stop(now + 0.08);

    // 第二音（稍高，紧随其后）
    const t2 = now + 0.09;
    const osc2 = ctx.createOscillator();
    const gain2 = this.makeGain(ctx, 0.3, 0.005, 0.095, t2);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(900, t2);
    osc2.connect(gain2);
    gain2.connect(this.getDest());
    osc2.start(t2);
    osc2.stop(t2 + 0.1);
  }

  /** 卖出：硬币滑落 (sine, 900→400Hz, 0.2s) */
  private playSell(ctx: AudioContext, now: number): void {
    const osc = ctx.createOscillator();
    const gain = this.makeGain(ctx, 0.25, 0.005, 0.195, now);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.2);

    osc.connect(gain);
    gain.connect(this.getDest());
    osc.start(now);
    osc.stop(now + 0.2);
  }

  /** 刷新：快速三个 blip (sine, 400/600/800Hz 各 0.06s) */
  private playRefresh(ctx: AudioContext, now: number): void {
    const freqs = [400, 600, 800];
    freqs.forEach((freq, i) => {
      const t = now + i * 0.07;
      const osc = ctx.createOscillator();
      const gain = this.makeGain(ctx, 0.2, 0.003, 0.057, t);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      osc.connect(gain);
      gain.connect(this.getDest());
      osc.start(t);
      osc.stop(t + 0.06);
    });
  }

  /** 胜利：上升三和弦 (C4→E4→G4, 各 0.2s, 渐强) */
  private playWin(ctx: AudioContext, now: number): void {
    const notes = [261.63, 329.63, 392.00]; // C4, E4, G4
    notes.forEach((freq, i) => {
      const t = now + i * 0.15;
      const osc = ctx.createOscillator();
      const gain = this.makeGain(ctx, 0.3 + i * 0.05, 0.01, 0.35, t);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      osc.connect(gain);
      gain.connect(this.getDest());
      osc.start(t);
      osc.stop(t + 0.4);
    });

    // 最后一个高八度 C5 闪耀
    const t3 = now + 0.5;
    const osc5 = ctx.createOscillator();
    const gain5 = this.makeGain(ctx, 0.25, 0.01, 0.5, t3);
    osc5.type = 'sine';
    osc5.frequency.setValueAtTime(523.25, t3); // C5
    osc5.connect(gain5);
    gain5.connect(this.getDest());
    osc5.start(t3);
    osc5.stop(t3 + 0.55);
  }

  /** 失败：下降二和弦 (G4→Eb4→C4, 渐弱) */
  private playLose(ctx: AudioContext, now: number): void {
    const notes = [392.00, 311.13, 261.63]; // G4, Eb4, C4
    notes.forEach((freq, i) => {
      const t = now + i * 0.2;
      const osc = ctx.createOscillator();
      const gain = this.makeGain(ctx, 0.25 - i * 0.05, 0.01, 0.3, t);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.95, t + 0.35);

      osc.connect(gain);
      gain.connect(this.getDest());
      osc.start(t);
      osc.stop(t + 0.4);
    });

    // 低沉结尾
    const tEnd = now + 0.7;
    const oscLow = ctx.createOscillator();
    const gainLow = this.makeGain(ctx, 0.2, 0.01, 0.5, tEnd);
    oscLow.type = 'sine';
    oscLow.frequency.setValueAtTime(130.81, tEnd); // C3
    oscLow.frequency.exponentialRampToValueAtTime(65.41, tEnd + 0.5); // C2
    oscLow.connect(gainLow);
    gainLow.connect(this.getDest());
    oscLow.start(tEnd);
    oscLow.stop(tEnd + 0.55);
  }
}

/** 全局单例 */
export const sound = new SoundManager();
