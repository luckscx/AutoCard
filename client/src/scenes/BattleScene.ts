import { Container, Graphics, Text, Ticker } from 'pixi.js';
import { Scene } from '../core/SceneManager.js';
import { Button } from '../ui/Button.js';
import { UnifiedCardView } from '../ui/UnifiedCardView.js';
import { BottomBar } from '../ui/BottomBar.js';
import { gameState } from '../core/GameState.js';
import type { GameSettings } from '../core/GameState.js';
import type { BattleResult, BattleEvent, BattleSnapshot, SlotItem, CardRuntimeState, BattleSide } from '@autocard/shared';
import { BATTLE_TICK_MS } from '@autocard/shared';
import type { SceneManager } from '../core/SceneManager.js';
import { sound } from '../audio/SoundManager.js';
import {
  W, H, SIDE_PAD, INNER_X, CARD_UNIT, CARD_GAP, Z4_H,
  BATTLE_Z1_Y, BATTLE_Z1_H,
  BATTLE_ZEH_Y, BATTLE_ZEH_H,
  BATTLE_Z2_Y, BATTLE_Z2_H, BATTLE_Z2_CARD_Y,
  BATTLE_Z3_Y, BATTLE_Z3_H, BATTLE_Z3_CARD_Y,
  BATTLE_ZPH_Y, BATTLE_ZPH_H,
} from '../ui/layout.js';

interface BattleData {
  type: 'pve' | 'pvp';
  result: BattleResult;
  monsterName?: string;
  opponentHero?: string;
  opponentBoard?: SlotItem[];
  playerBoard: SlotItem[];
}

const OVERTIME_START_TICK = 200;

/** 将 slotIndex 映射为单行线性局部坐标 */
function slotPos(slotIndex: number): { x: number; y: number } {
  return { x: slotIndex * (CARD_UNIT + CARD_GAP), y: 0 };
}

export class BattleScene extends Scene {
  private sm: SceneManager;
  private ticker: Ticker | null = null;

  private events: BattleEvent[] = [];
  private snapshots: BattleSnapshot[] = [];
  private eventIdx = 0;
  private currentTick = 0;
  private elapsed = 0;
  private battleDone = false;
  private resultShown = false;

  private playerCards: Map<number, UnifiedCardView> = new Map();
  private enemyCards: Map<number, UnifiedCardView> = new Map();
  private playerHpBar!: HpBar;
  private enemyHpBar!: HpBar;
  private playerStatusText!: Text;
  private enemyStatusText!: Text;
  private floatLayer!: Container;
  private overtimeWarning!: Container;
  private battleResult!: BattleResult;
  private data!: BattleData;
  private tickLabel!: Text;

  constructor(sm: SceneManager) {
    super();
    this.sm = sm;
  }

  onEnter(data: BattleData) {
    this.removeChildren();
    this.data = data;
    this.battleResult = data.result;
    this.events = data.result.events ?? [];
    this.snapshots = data.result.snapshots ?? [];
    this.eventIdx = 0;
    this.currentTick = 0;
    this.elapsed = 0;
    this.battleDone = false;
    this.resultShown = false;
    this.playerCards.clear();
    this.enemyCards.clear();

    if (this.events.length === 0) {
      this.showStaticResult();
      return;
    }

    this.buildLayout(data);
    this.startPlayback();
  }

  private buildLayout(data: BattleData) {
    const run = gameState.run!;
    const snap0 = this.snapshots[0];

    // ── Z1: 顶部信息栏（标题+速度+Tick）──
    const z1Bg = new Graphics();
    z1Bg.roundRect(0, 0, W - SIDE_PAD * 2, BATTLE_Z1_H, 8);
    z1Bg.fill({ color: 0x1a1a2e, alpha: 0.9 });
    z1Bg.x = SIDE_PAD;
    z1Bg.y = BATTLE_Z1_Y;
    this.addChild(z1Bg);

    const battleTitle = new Text({
      text: data.type === 'pve' ? `PvE — ${data.monsterName}` : `PvP — ${data.opponentHero}`,
      style: { fill: '#ff8866', fontSize: 12, fontFamily: 'Arial', fontWeight: 'bold' },
    });
    battleTitle.x = INNER_X;
    battleTitle.y = BATTLE_Z1_Y + 4;
    this.addChild(battleTitle);

    const speedLabel = new Text({
      text: `${gameState.settings.playbackSpeed}x`,
      style: { fill: '#ffd700', fontSize: 11, fontFamily: 'Arial', fontWeight: 'bold' },
    });
    speedLabel.anchor.set(1, 0);
    speedLabel.x = W - SIDE_PAD - 4;
    speedLabel.y = BATTLE_Z1_Y + 4;
    this.addChild(speedLabel);

    this.tickLabel = new Text({
      text: 'Tick 0',
      style: { fill: '#99aacc', fontSize: 10, fontFamily: 'Arial' },
    });
    this.tickLabel.x = INNER_X;
    this.tickLabel.y = BATTLE_Z1_Y + 20;
    this.addChild(this.tickLabel);

    // ── ZEH: 敌方血条行 ──
    const zehBg = new Graphics();
    zehBg.roundRect(0, 0, W - SIDE_PAD * 2, BATTLE_ZEH_H, 4);
    zehBg.fill({ color: 0x2a0e0e, alpha: 0.85 });
    zehBg.x = SIDE_PAD;
    zehBg.y = BATTLE_ZEH_Y;
    this.addChild(zehBg);

    const enemyHpLabel = new Text({ text: '敌', style: { fill: '#ff8866', fontSize: 11, fontFamily: 'Arial' } });
    enemyHpLabel.x = INNER_X;
    enemyHpLabel.y = BATTLE_ZEH_Y + 4;
    this.addChild(enemyHpLabel);

    const hpBarW = W - SIDE_PAD * 2 - INNER_X - 30;
    this.enemyHpBar = new HpBar(snap0?.enemy.maxHp ?? 100, 0xd94a4a, hpBarW);
    this.enemyHpBar.x = INNER_X + 24;
    this.enemyHpBar.y = BATTLE_ZEH_Y + 4;
    this.addChild(this.enemyHpBar);

    this.enemyStatusText = new Text({ text: '', style: { fill: '#cccccc', fontSize: 10, fontFamily: 'Arial' } });
    this.enemyStatusText.anchor.set(1, 0);
    this.enemyStatusText.x = W - SIDE_PAD - 4;
    this.enemyStatusText.y = BATTLE_ZEH_Y + 4;
    this.addChild(this.enemyStatusText);

    // ── Z2: 敌方棋盘 ──
    const z2Bg = new Graphics();
    z2Bg.roundRect(0, 0, W - SIDE_PAD * 2, BATTLE_Z2_H, 8);
    z2Bg.fill({ color: 0x2a0e0e, alpha: 0.85 });
    z2Bg.x = SIDE_PAD;
    z2Bg.y = BATTLE_Z2_Y;
    this.addChild(z2Bg);

    const enemyBoard = data.opponentBoard ?? [];
    for (const item of enemyBoard) {
      const card = new UnifiedCardView(item, 'battle');
      const pos = slotPos(item.slotIndex);
      card.x = INNER_X + pos.x;
      card.y = BATTLE_Z2_CARD_Y + pos.y;
      this.addChild(card);
      this.enemyCards.set(item.slotIndex, card);
    }

    // ── Z3: 玩家棋盘 ──
    const z3Bg = new Graphics();
    z3Bg.roundRect(0, 0, W - SIDE_PAD * 2, BATTLE_Z3_H, 8);
    z3Bg.fill({ color: 0x14243a, alpha: 0.9 });
    z3Bg.x = SIDE_PAD;
    z3Bg.y = BATTLE_Z3_Y;
    this.addChild(z3Bg);

    for (const item of data.playerBoard) {
      const card = new UnifiedCardView(item, 'battle');
      const pos = slotPos(item.slotIndex);
      card.x = INNER_X + pos.x;
      card.y = BATTLE_Z3_CARD_Y + pos.y;
      this.addChild(card);
      this.playerCards.set(item.slotIndex, card);
    }

    // ── ZPH: 我方血条行 ──
    const zphBg = new Graphics();
    zphBg.roundRect(0, 0, W - SIDE_PAD * 2, BATTLE_ZPH_H, 4);
    zphBg.fill({ color: 0x0e2a14, alpha: 0.85 });
    zphBg.x = SIDE_PAD;
    zphBg.y = BATTLE_ZPH_Y;
    this.addChild(zphBg);

    const playerHpLabel = new Text({ text: '我', style: { fill: '#4ad97a', fontSize: 11, fontFamily: 'Arial' } });
    playerHpLabel.x = INNER_X;
    playerHpLabel.y = BATTLE_ZPH_Y + 4;
    this.addChild(playerHpLabel);

    this.playerHpBar = new HpBar(snap0?.player.maxHp ?? run.maxHp, 0x4ad97a, hpBarW);
    this.playerHpBar.x = INNER_X + 24;
    this.playerHpBar.y = BATTLE_ZPH_Y + 4;
    this.addChild(this.playerHpBar);

    this.playerStatusText = new Text({ text: '', style: { fill: '#cccccc', fontSize: 10, fontFamily: 'Arial' } });
    this.playerStatusText.anchor.set(1, 0);
    this.playerStatusText.x = W - SIDE_PAD - 4;
    this.playerStatusText.y = BATTLE_ZPH_Y + 4;
    this.addChild(this.playerStatusText);

    // ── Z4: 底栏 ──
    const bar = new BottomBar();
    bar.update(run);
    bar.y = H - Z4_H;
    this.addChild(bar);

    // ── 飘字层 ──
    this.floatLayer = new Container();
    this.addChild(this.floatLayer);

    // ── overtime 警告层 ──
    this.overtimeWarning = new Container();
    this.overtimeWarning.visible = false;
    const otBorder = new Graphics();
    otBorder.rect(2, 2, W - 4, H - 4);
    otBorder.stroke({ color: 0xff2200, width: 6 });
    this.overtimeWarning.addChild(otBorder);
    const otText = new Text({
      text: '加时！全局扣血中',
      style: { fill: '#ff4400', fontSize: 18, fontFamily: 'Arial', fontWeight: 'bold' },
    });
    otText.anchor.set(0.5);
    otText.x = W / 2;
    otText.y = H / 2 - 20;
    this.overtimeWarning.addChild(otText);
    this.addChild(this.overtimeWarning);

    // 初始化 HP
    if (snap0) {
      this.playerHpBar.setHp(snap0.player.hp, snap0.player.shield);
      this.enemyHpBar.setHp(snap0.enemy.hp, snap0.enemy.shield);
    }
  }

  private startPlayback() {
    this.ticker = new Ticker();
    this.ticker.add(this.onTick, this);
    this.ticker.start();
  }

  private onTick = () => {
    if (this.battleDone) return;
    const dt = this.ticker!.deltaMS / 1000;
    this.elapsed += dt * gameState.settings.playbackSpeed;

    const targetTick = Math.floor(this.elapsed * 1000 / BATTLE_TICK_MS);

    while (this.eventIdx < this.events.length) {
      const ev = this.events[this.eventIdx];
      if (ev.tick > targetTick) break;
      this.processEvent(ev);
      this.eventIdx++;
    }

    this.currentTick = targetTick;
    this.tickLabel.text = `Tick ${targetTick}`;
    this.syncSnapshot();

    if (this.overtimeWarning.visible) {
      const pulseFactor = (Math.sin(this.elapsed * 4) + 1) / 2;
      const border = this.overtimeWarning.children[0] as Graphics;
      border.alpha = 0.3 + pulseFactor * 0.5;
    }

    if (this.eventIdx >= this.events.length && !this.resultShown) {
      this.battleDone = true;
      this.stopPlayback();
      setTimeout(() => this.showResult(), 300);
    }
  };

  /** 敌方/我方棋盘在屏幕上的中心飘字位置 */
  private floatCenter(side: BattleSide): { x: number; y: number } {
    if (side === 'enemy') {
      return { x: W / 2, y: BATTLE_Z2_CARD_Y + 20 };
    }
    return { x: W / 2, y: BATTLE_Z3_CARD_Y + 20 };
  }

  private processEvent(ev: BattleEvent) {
    switch (ev.type) {
      case 'card_trigger': {
        sound.play('card_trigger');
        const cards = ev.side === 'player' ? this.playerCards : this.enemyCards;
        cards.get(ev.slotIndex)?.flash();
        break;
      }
      case 'damage': {
        sound.play('damage');
        const fc = this.floatCenter(ev.targetSide);
        this.spawnFloat(fc.x, fc.y, `-${ev.value}`, '#ff4444');
        break;
      }
      case 'heal': {
        sound.play('heal');
        const fc = this.floatCenter(ev.targetSide);
        this.spawnFloat(fc.x, fc.y, `+${ev.value}`, '#44ff44');
        break;
      }
      case 'shield': {
        sound.play('shield');
        const fc = this.floatCenter(ev.targetSide);
        this.spawnFloat(fc.x, fc.y, `🛡+${ev.value}`, '#88ccff');
        break;
      }
      case 'poison': {
        const fc = this.floatCenter(ev.targetSide);
        this.spawnFloat(fc.x, fc.y, `☠+${ev.value}`, '#88ff44');
        break;
      }
      case 'burn': {
        const fc = this.floatCenter(ev.targetSide);
        this.spawnFloat(fc.x, fc.y, `🔥+${ev.value}`, '#ff8844');
        break;
      }
      case 'dot_tick': {
        const side: BattleSide = ev.side === 'player' ? 'player' : 'enemy';
        const fc = this.floatCenter(side);
        const total = ev.poisonDmg + ev.burnDmg;
        if (total > 0) this.spawnFloat(fc.x, fc.y, `-${total} DoT`, '#cc66ff');
        break;
      }
      case 'destroy': {
        sound.play('destroy');
        const cards = ev.targetSide === 'player' ? this.playerCards : this.enemyCards;
        cards.get(ev.targetSlotIndex)?.updateState({
          slotIndex: ev.targetSlotIndex, cooldownProgress: 0,
          hasteRemain: 0, slowRemain: 0, freezeRemain: 0, destroyed: true,
        });
        const fc = this.floatCenter(ev.targetSide);
        this.spawnFloat(fc.x, fc.y, '💥摧毁', '#ff2222');
        break;
      }
      case 'overtime': {
        sound.play('overtime');
        this.spawnFloat(W / 2, BATTLE_Z1_Y + BATTLE_Z1_H + 4, `加时 -${ev.playerDmg}`, '#ff8800');
        this.overtimeWarning.visible = true;
        break;
      }
      case 'haste':
      case 'slow':
      case 'freeze':
      case 'charge': {
        sound.play(ev.type);
        const label: Record<string, string> = {
          haste: '⚡加速', slow: '❄减速', freeze: '❄冻结', charge: '🔋充能',
        };
        const color: Record<string, string> = {
          haste: '#ffdd00', slow: '#6688ff', freeze: '#88eeff', charge: '#44ff88',
        };
        const fc = this.floatCenter(ev.targetSide);
        this.spawnFloat(fc.x, fc.y + 20, label[ev.type] ?? ev.type, color[ev.type] ?? '#ffffff');
        break;
      }
      case 'battle_end':
        break;
    }
  }

  private syncSnapshot() {
    let snap: BattleSnapshot | undefined;
    for (const s of this.snapshots) {
      if (s.tick <= this.currentTick) snap = s;
      else break;
    }
    if (!snap) return;

    this.playerHpBar.setHp(snap.player.hp, snap.player.shield);
    this.enemyHpBar.setHp(snap.enemy.hp, snap.enemy.shield);
    this.playerStatusText.text = buildStatusStr(snap.player);
    this.enemyStatusText.text  = buildStatusStr(snap.enemy);

    for (const cs of snap.playerCards) {
      this.playerCards.get(cs.slotIndex)?.updateState(cs);
    }
    for (const cs of snap.enemyCards) {
      this.enemyCards.get(cs.slotIndex)?.updateState(cs);
    }
  }

  private spawnFloat(x: number, y: number, text: string, color: string) {
    const t = new Text({
      text,
      style: { fill: color, fontSize: 14, fontFamily: 'Arial', fontWeight: 'bold' },
    });
    t.anchor.set(0.5);
    t.x = x + (Math.random() - 0.5) * 30;
    t.y = y;
    this.floatLayer.addChild(t);

    let life = 0;
    const anim = () => {
      life += 16;
      t.y -= 0.8;
      t.alpha = Math.max(0, 1 - life / 800);
      if (life >= 800) {
        this.floatLayer.removeChild(t);
        t.destroy();
      } else {
        requestAnimationFrame(anim);
      }
    };
    requestAnimationFrame(anim);
  }

  private stopPlayback() {
    if (this.ticker) {
      this.ticker.stop();
      this.ticker.destroy();
      this.ticker = null;
    }
    // 停止所有卡牌的光柱 / 扫光线动画
    for (const card of Array.from(this.playerCards.values())) card.resetCooldown();
    for (const card of Array.from(this.enemyCards.values())) card.resetCooldown();
  }

  /** 重放：清场后重新走一遍 onEnter，数据完全复用 */
  private replay() {
    this.stopPlayback();
    this.onEnter(this.data);
  }

  private showStaticResult() {
    const run = gameState.run!;
    const bar = new BottomBar();
    bar.update(run);
    this.addChild(bar);

    const bg = new Graphics();
    bg.rect(0, 0, W, H);
    bg.fill({ color: 0x0e1a2b, alpha: 0.8 });
    this.addChild(bg);

    const txt = new Text({
      text: '(无战斗数据)',
      style: { fill: '#aaaacc', fontSize: 14, fontFamily: 'Arial' },
    });
    txt.anchor.set(0.5);
    txt.x = W / 2;
    txt.y = H / 2;
    this.addChild(txt);

    const btn = new Button('返回', W - SIDE_PAD * 4, 50, 0x4a90d9);
    btn.x = SIDE_PAD * 2;
    btn.y = H / 2 + 40;
    btn.on('pointertap', () => this.sm.goto('main'));
    this.addChild(btn);
  }

  private showResult() {
    this.resultShown = true;
    const result = this.battleResult;

    const overlay = new Graphics();
    overlay.rect(0, 0, W, H);
    overlay.fill({ color: 0x000000, alpha: 0.55 });
    this.addChild(overlay);

    const panelW = W - SIDE_PAD * 4;
    const hasLoot = result.loot && result.loot.length > 0;
    const panelH = hasLoot ? 340 : 280;
    const panel = new Graphics();
    panel.roundRect(0, 0, panelW, panelH, 12);
    panel.fill({ color: 0x0e1a2b, alpha: 0.97 });
    panel.stroke({ color: result.won ? 0x4ad97a : 0xd94a4a, width: 2 });
    panel.x = SIDE_PAD * 2;
    panel.y = (H - panelH) / 2;
    this.addChild(panel);

    const resultTitle = new Text({
      text: result.won ? '🏆 胜利！' : '💀 失败',
      style: { fill: result.won ? '#4ad97a' : '#d94a4a', fontSize: 22, fontFamily: 'Arial', fontWeight: 'bold' },
    });
    resultTitle.anchor.set(0.5, 0);
    resultTitle.x = panel.x + panelW / 2;
    resultTitle.y = panel.y + 16;
    this.addChild(resultTitle);

    // HP 剩余
    const hpText = new Text({
      text: `剩余 HP: ${result.hpLeft}  | +${result.xpGained} XP  +${result.goldGained} G`,
      style: { fill: '#aaddff', fontSize: 14, fontFamily: 'Arial' },
    });
    hpText.anchor.set(0.5, 0);
    hpText.x = panel.x + panelW / 2;
    hpText.y = panel.y + 56;
    this.addChild(hpText);

    // 战利品
    if (hasLoot) {
      const lootTitle = new Text({
        text: '战利品',
        style: { fill: '#ffd700', fontSize: 14, fontFamily: 'Arial', fontWeight: 'bold' },
      });
      lootTitle.anchor.set(0.5, 0);
      lootTitle.x = panel.x + panelW / 2;
      lootTitle.y = panel.y + 84;
      this.addChild(lootTitle);

      result.loot!.forEach((itemId, i) => {
        const cfg = gameState.itemsMap.get(itemId);
        const lt = new Text({
          text: cfg?.name ?? itemId,
          style: { fill: '#ffcc88', fontSize: 12, fontFamily: 'Arial' },
        });
        lt.anchor.set(0.5, 0);
        lt.x = panel.x + panelW / 2;
        lt.y = panel.y + 108 + i * 22;
        this.addChild(lt);
      });
    }

    // 底部两个按钮：重放 | 返回
    const btnRowY = panel.y + panelH - 54;
    const halfW = (panelW - 24) / 2;

    const btnReplay = new Button('🔁 重放', halfW, 44, 0x7a4acf);
    btnReplay.x = panel.x + 8;
    btnReplay.y = btnRowY;
    btnReplay.on('pointertap', () => this.replay());
    this.addChild(btnReplay);

    const btnBack = new Button('返回主场景', halfW, 44, 0x4a90d9);
    btnBack.x = panel.x + 8 + halfW + 8;
    btnBack.y = btnRowY;
    btnBack.on('pointertap', () => this.sm.goto('main'));
    this.addChild(btnBack);
  }
}

// ────────────────────────────────────────────────────────────────
// HpBar（简化版，适配竖屏宽度）
// ────────────────────────────────────────────────────────────────

class HpBar extends Container {
  private maxHp: number;
  private barColor: number;
  private barWidth: number;
  private barH = 10;
  private bg: Graphics;
  private fill: Graphics;
  private shieldFill: Graphics;
  private hpLabel: Text;

  constructor(maxHp: number, color: number, barWidth = 140) {
    super();
    this.maxHp   = maxHp;
    this.barColor = color;
    this.barWidth = barWidth;

    this.bg = new Graphics();
    this.bg.roundRect(0, 0, barWidth, this.barH, 3);
    this.bg.fill({ color: 0x222222, alpha: 0.8 });
    this.addChild(this.bg);

    this.fill = new Graphics();
    this.addChild(this.fill);

    this.shieldFill = new Graphics();
    this.addChild(this.shieldFill);

    this.hpLabel = new Text({
      text: '',
      style: { fill: '#ffffff', fontSize: 9, fontFamily: 'Arial' },
    });
    this.hpLabel.y = this.barH + 1;
    this.addChild(this.hpLabel);

    this.setHp(maxHp, 0);
  }

  setHp(hp: number, shield = 0) {
    this.fill.clear();
    const ratio = Math.max(0, Math.min(1, hp / this.maxHp));
    const fillW = ratio * this.barWidth;
    if (fillW > 0) {
      this.fill.roundRect(0, 0, fillW, this.barH, 3);
      this.fill.fill(this.barColor);
    }

    this.shieldFill.clear();
    if (shield > 0) {
      const shieldW = Math.min(shield / this.maxHp * this.barWidth, this.barWidth - fillW);
      if (shieldW > 0) {
        this.shieldFill.x = fillW;
        this.shieldFill.roundRect(0, 0, shieldW, this.barH, 3);
        this.shieldFill.fill({ color: 0x88ccff, alpha: 0.7 });
      }
    }

    this.hpLabel.text = shield > 0 ? `${hp}+${shield}` : `${hp}`;
  }
}

// ────────────────────────────────────────────────────────────────
// 辅助
// ────────────────────────────────────────────────────────────────

function buildStatusStr(side: { poison: number; burn: number }): string {
  const parts: string[] = [];
  if (side.poison > 0) parts.push(`☠${side.poison}`);
  if (side.burn   > 0) parts.push(`🔥${side.burn}`);
  return parts.join(' ');
}
