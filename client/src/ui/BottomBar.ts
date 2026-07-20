import { Container, Graphics, Text } from 'pixi.js';
import type { RunState } from '@autocard/shared';
import { W, Z4_Y, Z4_H, SIDE_PAD } from './layout.js';
import { C, T, drawPanel, drawBadge } from './theme.js';

const FONT = 'Noto Sans CJK SC, Arial, sans-serif';

export class BottomBar extends Container {
  private hpText: Text;
  private goldText: Text;
  private prestigeText: Text;
  private infoText: Text;
  private stashBtn: Container;
  private stashBgG: Graphics;
  onStashToggle?: () => void;

  constructor() {
    super();

    const barW = W - SIDE_PAD * 2;

    // 主背景
    const bg = new Graphics();
    drawPanel(bg, 0, 0, barW, Z4_H, 8, C.bgDark, C.border);
    this.addChild(bg);

    this.x = SIDE_PAD;
    this.y = Z4_Y;

    // ── 储物箱按钮 ──
    this.stashBtn = new Container();
    this.stashBgG = new Graphics();
    drawBadge(this.stashBgG, 0, 0, 64, 36, C.goldDark, 8);
    this.stashBtn.addChild(this.stashBgG);
    const stashIcon = new Text({
      text: '🎒',
      style: { fill: T.gold, fontSize: 13, fontFamily: FONT, fontWeight: 'bold' },
    });
    stashIcon.anchor.set(0.5);
    stashIcon.x = 18;
    stashIcon.y = 18;
    this.stashBtn.addChild(stashIcon);
    const stashLabel = new Text({
      text: '储物箱',
      style: { fill: T.gold, fontSize: 11, fontFamily: FONT, fontWeight: 'bold' },
    });
    stashLabel.anchor.set(0, 0.5);
    stashLabel.x = 32;
    stashLabel.y = 18;
    this.stashBtn.addChild(stashLabel);
    this.stashBtn.x = 6;
    this.stashBtn.y = (Z4_H - 36) / 2;
    this.stashBtn.eventMode = 'static';
    this.stashBtn.cursor = 'pointer';
    this.stashBtn.on('pointertap', () => this.onStashToggle?.());
    this.addChild(this.stashBtn);

    // ── HP 徽章 ──
    const hpBadge = new Graphics();
    drawBadge(hpBadge, 76, 6, 84, 24, C.greenDark, 6);
    this.addChild(hpBadge);
    this.hpText = new Text({
      text: '',
      style: { fill: T.green, fontSize: 12, fontFamily: FONT, fontWeight: 'bold' },
    });
    this.hpText.anchor.set(0.5, 0);
    this.hpText.x = 76 + 42;
    this.hpText.y = 12;
    this.addChild(this.hpText);

    // ── 金币徽章 ──
    const goldBadge = new Graphics();
    drawBadge(goldBadge, 76, 33, 84, 24, C.goldDark, 6);
    this.addChild(goldBadge);
    this.goldText = new Text({
      text: '',
      style: { fill: T.gold, fontSize: 12, fontFamily: FONT, fontWeight: 'bold' },
    });
    this.goldText.anchor.set(0.5, 0);
    this.goldText.x = 76 + 42;
    this.goldText.y = 39;
    this.addChild(this.goldText);

    // ── 声望 + 信息 ──
    this.prestigeText = new Text({
      text: '',
      style: { fill: T.orange, fontSize: 11, fontFamily: FONT, fontWeight: 'bold' },
    });
    this.prestigeText.x = 180;
    this.prestigeText.y = 6;
    this.addChild(this.prestigeText);

    this.infoText = new Text({
      text: '',
      style: { fill: T.secondary, fontSize: 10, fontFamily: FONT },
    });
    this.infoText.x = 180;
    this.infoText.y = 24;
    this.addChild(this.infoText);
  }

  update(run: RunState) {
    this.hpText.text     = `♥ ${run.hp}/${run.maxHp}`;
    this.goldText.text   = `★ ${run.gold}G`;
    this.prestigeText.text = `◆ 声望 ${run.prestige}`;
    this.infoText.text   = `Lv${run.level} XP${run.xp}/8  Day${run.day}H${run.hour}  PvP${run.pvpWins}/10`;
  }
}
