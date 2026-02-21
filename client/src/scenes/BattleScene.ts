import { Container, Graphics, Text, Ticker } from 'pixi.js';
import { Scene } from '../core/SceneManager.js';
import { Button } from '../ui/Button.js';
import { BattleCardView } from '../ui/BattleCardView.js';
import { BottomBar } from '../ui/BottomBar.js';
import { gameState } from '../core/GameState.js';
import type { BattleResult, BattleEvent, BattleSnapshot, SlotItem, CardRuntimeState, BattleSide } from '@autocard/shared';
import { BATTLE_TICK_MS } from '@autocard/shared';
import type { SceneManager } from '../core/SceneManager.js';
import {
  W, H, SIDE_PAD, INNER_X, CARD_UNIT, CARD_GAP,
  Z1_Y, Z1_H, Z2_Y, Z2_H, Z2_LABEL_Y, Z2_CARD_Y,
  Z3_Y, Z3_H, Z3_LABEL_Y, Z3_CARD_Y,
} from '../ui/layout.js';

interface BattleData {
  type: 'pve' | 'pvp';
  result: BattleResult;
  monsterName?: string;
  opponentHero?: string;
  opponentBoard?: SlotItem[];
  playerBoard: SlotItem[];
}

const PLAYBACK_SPEED = 4;

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

  private playerCards: Map<number, BattleCardView> = new Map();
  private enemyCards: Map<number, BattleCardView> = new Map();
  private playerHpBar!: HpBar;
  private enemyHpBar!: HpBar;
  private playerStatusText!: Text;
  private enemyStatusText!: Text;
  private floatLayer!: Container;
  private battleResult!: BattleResult;
  private data!: BattleData;

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

    // Z1: 战斗信息 + HP条
    const z1Bg = new Graphics();
    z1Bg.roundRect(0, 0, W - SIDE_PAD * 2, Z1_H, 8);
    z1Bg.fill({ color: 0x2a0e0e, alpha: 0.85 });
    z1Bg.x = SIDE_PAD;
    z1Bg.y = Z1_Y;
    this.addChild(z1Bg);

    const battleTitle = new Text({
      text: data.type === 'pve' ? `PvE — ${data.monsterName}` : `PvP — 对手: ${data.opponentHero}`,
      style: { fill: '#ff8866', fontSize: 13, fontFamily: 'Arial', fontWeight: 'bold' },
    });
    battleTitle.x = INNER_X;
    battleTitle.y = Z1_Y + 6;
    this.addChild(battleTitle);

    const snap0 = this.snapshots[0];

    this.enemyHpBar = new HpBar(snap0?.enemy.maxHp ?? 100, 0xd94a4a);
    this.enemyHpBar.x = INNER_X;
    this.enemyHpBar.y = Z1_Y + 28;
    this.addChild(this.enemyHpBar);
    const enemyHpLabel = new Text({ text: '敌方', style: { fill: '#ff8866', fontSize: 11, fontFamily: 'Arial' } });
    enemyHpLabel.x = INNER_X;
    enemyHpLabel.y = Z1_Y + 24;
    this.addChild(enemyHpLabel);

    this.playerHpBar = new HpBar(snap0?.player.maxHp ?? run.maxHp, 0x4ad97a);
    this.playerHpBar.x = INNER_X + 440;
    this.playerHpBar.y = Z1_Y + 28;
    this.addChild(this.playerHpBar);
    const playerHpLabel = new Text({ text: '我方', style: { fill: '#4ad97a', fontSize: 11, fontFamily: 'Arial' } });
    playerHpLabel.x = INNER_X + 440;
    playerHpLabel.y = Z1_Y + 24;
    this.addChild(playerHpLabel);

    this.enemyStatusText = new Text({ text: '', style: { fill: '#cccccc', fontSize: 11, fontFamily: 'Arial' } });
    this.enemyStatusText.x = INNER_X;
    this.enemyStatusText.y = Z1_Y + 50;
    this.addChild(this.enemyStatusText);

    this.playerStatusText = new Text({ text: '', style: { fill: '#cccccc', fontSize: 11, fontFamily: 'Arial' } });
    this.playerStatusText.x = INNER_X + 440;
    this.playerStatusText.y = Z1_Y + 50;
    this.addChild(this.playerStatusText);

    const speedLabel = new Text({ text: `${PLAYBACK_SPEED}x`, style: { fill: '#ffd700', fontSize: 12, fontFamily: 'Arial', fontWeight: 'bold' } });
    speedLabel.anchor.set(1, 0);
    speedLabel.x = W - SIDE_PAD - 10;
    speedLabel.y = Z1_Y + 8;
    this.addChild(speedLabel);

    // Z2: 敌方棋盘
    const z2Bg = new Graphics();
    z2Bg.roundRect(0, 0, W - SIDE_PAD * 2, Z2_H, 10);
    z2Bg.fill({ color: 0x2a0e0e, alpha: 0.85 });
    z2Bg.x = SIDE_PAD;
    z2Bg.y = Z2_Y;
    this.addChild(z2Bg);

    const enemyLabel = new Text({ text: '敌方棋盘', style: { fill: '#ff8866', fontSize: 12, fontFamily: 'Arial' } });
    enemyLabel.x = INNER_X;
    enemyLabel.y = Z2_LABEL_Y;
    this.addChild(enemyLabel);

    const enemyBoard = data.opponentBoard ?? [];
    for (const item of enemyBoard) {
      const card = new BattleCardView(item);
      card.x = INNER_X + item.slotIndex * (CARD_UNIT + CARD_GAP);
      card.y = Z2_CARD_Y + 20;
      this.addChild(card);
      this.enemyCards.set(item.slotIndex, card);
    }

    // Z3: 玩家棋盘
    const z3Bg = new Graphics();
    z3Bg.roundRect(0, 0, W - SIDE_PAD * 2, Z3_H, 10);
    z3Bg.fill({ color: 0x14243a, alpha: 0.9 });
    z3Bg.x = SIDE_PAD;
    z3Bg.y = Z3_Y;
    this.addChild(z3Bg);

    const boardLabel = new Text({ text: '我的棋盘', style: { fill: '#8899aa', fontSize: 12, fontFamily: 'Arial' } });
    boardLabel.x = INNER_X;
    boardLabel.y = Z3_LABEL_Y;
    this.addChild(boardLabel);

    const playerBoard = data.playerBoard;
    for (const item of playerBoard) {
      const card = new BattleCardView(item);
      card.x = INNER_X + item.slotIndex * (CARD_UNIT + CARD_GAP);
      card.y = Z3_CARD_Y;
      this.addChild(card);
      this.playerCards.set(item.slotIndex, card);
    }

    // Z4: 底栏
    const bar = new BottomBar();
    bar.update(run);
    this.addChild(bar);

    // 飘字层
    this.floatLayer = new Container();
    this.addChild(this.floatLayer);

    // 初始化HP
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
    this.elapsed += dt * PLAYBACK_SPEED;

    const targetTick = Math.floor(this.elapsed * 1000 / BATTLE_TICK_MS);

    while (this.eventIdx < this.events.length) {
      const ev = this.events[this.eventIdx];
      if (ev.tick > targetTick) break;
      this.processEvent(ev);
      this.eventIdx++;
    }

    this.currentTick = targetTick;
    this.syncSnapshot();

    if (this.eventIdx >= this.events.length && !this.resultShown) {
      this.battleDone = true;
      this.stopPlayback();
      setTimeout(() => this.showResult(), 300);
    }
  };

  private processEvent(ev: BattleEvent) {
    switch (ev.type) {
      case 'card_trigger': {
        const cards = ev.side === 'player' ? this.playerCards : this.enemyCards;
        const card = cards.get(ev.slotIndex);
        card?.flash();
        break;
      }
      case 'damage': {
        const isEnemy = ev.targetSide === 'enemy';
        const x = isEnemy ? INNER_X + 200 : INNER_X + 640;
        const y = isEnemy ? Z2_CARD_Y + 10 : Z3_CARD_Y - 10;
        this.spawnFloat(x, y, `-${ev.value}`, '#ff4444');
        break;
      }
      case 'heal': {
        const isEnemy = ev.targetSide === 'enemy';
        const x = isEnemy ? INNER_X + 200 : INNER_X + 640;
        const y = isEnemy ? Z2_CARD_Y + 10 : Z3_CARD_Y - 10;
        this.spawnFloat(x, y, `+${ev.value}`, '#44ff44');
        break;
      }
      case 'shield': {
        const isEnemy = ev.targetSide === 'enemy';
        const x = isEnemy ? INNER_X + 260 : INNER_X + 700;
        const y = isEnemy ? Z2_CARD_Y + 10 : Z3_CARD_Y - 10;
        this.spawnFloat(x, y, `\uD83D\uDEE1\uFE0F+${ev.value}`, '#88ccff');
        break;
      }
      case 'poison': {
        const isEnemy = ev.targetSide === 'enemy';
        const x = isEnemy ? INNER_X + 320 : INNER_X + 560;
        const y = isEnemy ? Z2_CARD_Y + 10 : Z3_CARD_Y - 10;
        this.spawnFloat(x, y, `\u2620\uFE0F+${ev.value}`, '#88ff44');
        break;
      }
      case 'burn': {
        const isEnemy = ev.targetSide === 'enemy';
        const x = isEnemy ? INNER_X + 380 : INNER_X + 500;
        const y = isEnemy ? Z2_CARD_Y + 10 : Z3_CARD_Y - 10;
        this.spawnFloat(x, y, `\uD83D\uDD25+${ev.value}`, '#ff8844');
        break;
      }
      case 'dot_tick': {
        const isPlayer = ev.side === 'player';
        const x = isPlayer ? INNER_X + 640 : INNER_X + 200;
        const y = isPlayer ? Z3_CARD_Y - 10 : Z2_CARD_Y + 10;
        const total = ev.poisonDmg + ev.burnDmg;
        if (total > 0) this.spawnFloat(x, y, `-${total} DoT`, '#cc66ff');
        break;
      }
      case 'destroy': {
        const cards = ev.targetSide === 'player' ? this.playerCards : this.enemyCards;
        const card = cards.get(ev.targetSlotIndex);
        if (card) {
          card.updateState({ slotIndex: ev.targetSlotIndex, cooldownProgress: 0, hasteRemain: 0, slowRemain: 0, freezeRemain: 0, destroyed: true });
        }
        const isEnemy = ev.targetSide === 'enemy';
        const x = isEnemy ? INNER_X + 200 : INNER_X + 640;
        const y = isEnemy ? Z2_CARD_Y + 30 : Z3_CARD_Y + 10;
        this.spawnFloat(x, y, '\uD83D\uDCA5摧毁', '#ff2222');
        break;
      }
      case 'overtime': {
        this.spawnFloat(W / 2, Z1_Y + Z1_H + 4, `加时伤害 -${ev.playerDmg}`, '#ff8800');
        break;
      }
      case 'haste':
      case 'slow':
      case 'freeze':
      case 'charge': {
        const label: Record<string, string> = { haste: '\u26A1加速', slow: '\u2744\uFE0F减速', freeze: '\u2744\uFE0F冻结', charge: '\uD83D\uDD0B充能' };
        const color: Record<string, string> = { haste: '#ffdd00', slow: '#6688ff', freeze: '#88eeff', charge: '#44ff88' };
        const isEnemy = ev.targetSide === 'enemy';
        const x = isEnemy ? INNER_X + 200 : INNER_X + 640;
        const y = isEnemy ? Z2_CARD_Y + 50 : Z3_CARD_Y + 30;
        this.spawnFloat(x, y, label[ev.type] ?? ev.type, color[ev.type] ?? '#ffffff');
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
    this.enemyStatusText.text = buildStatusStr(snap.enemy);

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
      style: { fill: color, fontSize: 16, fontFamily: 'Arial', fontWeight: 'bold' },
    });
    t.anchor.set(0.5);
    t.x = x + (Math.random() - 0.5) * 40;
    t.y = y;
    this.floatLayer.addChild(t);

    let life = 0;
    const anim = () => {
      life += 16;
      t.y -= 1;
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
  }

  private showResult() {
    this.resultShown = true;
    const result = this.battleResult;

    const overlay = new Graphics();
    overlay.rect(0, 0, W, H);
    overlay.fill({ color: 0x000000, alpha: 0.55 });
    this.addChild(overlay);

    const panel = new Graphics();
    panel.roundRect(0, 0, 420, 260, 12);
    panel.fill({ color: 0x0e1a2b, alpha: 0.95 });
    panel.stroke({ color: result.won ? 0x4ad97a : 0xd94a4a, width: 2 });
    panel.x = W / 2 - 210;
    panel.y = 140;
    this.addChild(panel);

    const title = new Text({
      text: result.won ? '胜利！' : '失败…',
      style: { fill: result.won ? '#4ad97a' : '#d94a4a', fontSize: 36, fontFamily: 'Arial', fontWeight: 'bold' },
    });
    title.anchor.set(0.5, 0);
    title.x = W / 2;
    title.y = 155;
    this.addChild(title);

    const lines: string[] = [
      `剩余 HP: ${result.hpLeft}`,
      `XP: +${result.xpGained}    金币: +${result.goldGained}`,
    ];
    if (result.loot && result.loot.length > 0) {
      const names = result.loot.map(id => gameState.itemsMap.get(id)?.name ?? id);
      lines.push(`战利品: ${names.join(', ')}`);
    }
    const detail = new Text({
      text: lines.join('\n'),
      style: { fill: '#ccccee', fontSize: 16, fontFamily: 'Arial', lineHeight: 28 },
    });
    detail.anchor.set(0.5, 0);
    detail.x = W / 2;
    detail.y = 210;
    this.addChild(detail);

    const btn = new Button('继续', 200, 46, 0x4a90d9);
    btn.x = W / 2 - 100;
    btn.y = 320;
    btn.on('pointertap', () => this.sm.goto('main'));
    this.addChild(btn);
  }

  private showStaticResult() {
    const run = gameState.run!;
    const data = this.data;
    const result = data.result;

    // Z1
    const z1Bg = new Graphics();
    z1Bg.roundRect(0, 0, W - SIDE_PAD * 2, Z1_H, 8);
    z1Bg.fill({ color: 0x2a0e0e, alpha: 0.85 });
    z1Bg.x = SIDE_PAD;
    z1Bg.y = Z1_Y;
    this.addChild(z1Bg);
    const title = new Text({
      text: data.type === 'pve' ? `PvE — ${data.monsterName}` : `PvP — 对手: ${data.opponentHero}`,
      style: { fill: '#ff8866', fontSize: 14, fontFamily: 'Arial', fontWeight: 'bold' },
    });
    title.x = INNER_X;
    title.y = Z1_Y + 10;
    this.addChild(title);

    // Z4
    const bar = new BottomBar();
    bar.update(run);
    this.addChild(bar);

    this.showResult();
  }

  onExit() {
    this.stopPlayback();
  }
}

function buildStatusStr(side: { shield: number; poison: number; burn: number }): string {
  const parts: string[] = [];
  if (side.shield > 0) parts.push(`\uD83D\uDEE1\uFE0F${side.shield}`);
  if (side.poison > 0) parts.push(`\u2620\uFE0F${side.poison}`);
  if (side.burn > 0) parts.push(`\uD83D\uDD25${side.burn}`);
  return parts.join(' ');
}

class HpBar extends Container {
  private maxHp: number;
  private barBg: Graphics;
  private hpFill: Graphics;
  private shieldFill: Graphics;
  private textLabel: Text;
  private barW = 400;
  private barH = 16;
  private color: number;

  constructor(maxHp: number, color: number) {
    super();
    this.maxHp = maxHp;
    this.color = color;

    this.barBg = new Graphics();
    this.barBg.roundRect(0, 0, this.barW, this.barH, 4);
    this.barBg.fill({ color: 0x222233, alpha: 0.8 });
    this.barBg.stroke({ color: 0x444466, width: 1 });
    this.addChild(this.barBg);

    this.shieldFill = new Graphics();
    this.addChild(this.shieldFill);

    this.hpFill = new Graphics();
    this.addChild(this.hpFill);

    this.textLabel = new Text({ text: `${maxHp}/${maxHp}`, style: { fill: '#ffffff', fontSize: 11, fontFamily: 'Arial', fontWeight: 'bold' } });
    this.textLabel.anchor.set(0.5, 0.5);
    this.textLabel.x = this.barW / 2;
    this.textLabel.y = this.barH / 2;
    this.addChild(this.textLabel);
  }

  setHp(hp: number, shield: number) {
    hp = Math.max(0, hp);
    const total = hp + shield;
    const hpRatio = Math.min(hp / this.maxHp, 1);
    const totalRatio = Math.min(total / this.maxHp, 1);

    this.hpFill.clear();
    if (hpRatio > 0) {
      this.hpFill.roundRect(0, 0, this.barW * hpRatio, this.barH, 4);
      this.hpFill.fill(this.color);
    }

    this.shieldFill.clear();
    if (shield > 0 && totalRatio > hpRatio) {
      this.shieldFill.roundRect(this.barW * hpRatio, 0, this.barW * (totalRatio - hpRatio), this.barH, 4);
      this.shieldFill.fill(0x88ccff);
    }

    this.textLabel.text = shield > 0 ? `${hp}+${shield}/${this.maxHp}` : `${hp}/${this.maxHp}`;
  }
}
