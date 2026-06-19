import { Container, Graphics, Text } from 'pixi.js';
import type { RunState } from '@autocard/shared';
import { W, Z4_Y, Z4_H, SIDE_PAD } from './layout.js';

export class BottomBar extends Container {
  private hpText: Text;
  private goldText: Text;
  private prestigeText: Text;
  private infoText: Text;
  private stashBtn: Container;
  onStashToggle?: () => void;

  constructor() {
    super();

    const barW = W - SIDE_PAD * 2;

    const bg = new Graphics();
    bg.roundRect(0, 0, barW, Z4_H, 8);
    bg.fill({ color: 0x0e1a2b, alpha: 0.95 });
    this.addChild(bg);

    this.x = SIDE_PAD;
    this.y = Z4_Y;

    // 储物箱按钮（左侧）
    this.stashBtn = new Container();
    const stashBg = new Graphics();
    stashBg.roundRect(0, 0, 64, 36, 6);
    stashBg.fill(0x3a2a1a);
    stashBg.stroke({ color: 0xcd7f32, width: 2 });
    this.stashBtn.addChild(stashBg);
    const stashLabel = new Text({
      text: '储物箱',
      style: { fill: '#ffcc00', fontSize: 11, fontFamily: 'Arial', fontWeight: 'bold' },
    });
    stashLabel.anchor.set(0.5);
    stashLabel.x = 32;
    stashLabel.y = 18;
    this.stashBtn.addChild(stashLabel);
    this.stashBtn.x = 6;
    this.stashBtn.y = (Z4_H - 36) / 2;
    this.stashBtn.eventMode = 'static';
    this.stashBtn.cursor = 'pointer';
    this.stashBtn.on('pointertap', () => this.onStashToggle?.());
    this.addChild(this.stashBtn);

    // HP 文字
    this.hpText = new Text({
      text: '',
      style: { fill: '#66ff66', fontSize: 12, fontFamily: 'Arial', fontWeight: 'bold' },
    });
    this.hpText.x = 80;
    this.hpText.y = 6;
    this.addChild(this.hpText);

    // 金币文字
    this.goldText = new Text({
      text: '',
      style: { fill: '#ffcc00', fontSize: 12, fontFamily: 'Arial', fontWeight: 'bold' },
    });
    this.goldText.x = 80;
    this.goldText.y = 24;
    this.addChild(this.goldText);

    // 声望文字
    this.prestigeText = new Text({
      text: '',
      style: { fill: '#ff9966', fontSize: 11, fontFamily: 'Arial', fontWeight: 'bold' },
    });
    this.prestigeText.x = 180;
    this.prestigeText.y = 6;
    this.addChild(this.prestigeText);

    // 额外信息
    this.infoText = new Text({
      text: '',
      style: { fill: '#aabbcc', fontSize: 10, fontFamily: 'Arial' },
    });
    this.infoText.x = 180;
    this.infoText.y = 24;
    this.addChild(this.infoText);
  }

  update(run: RunState) {
    this.hpText.text     = `♥ ${run.hp}/${run.maxHp}`;
    this.goldText.text   = `★ ${run.gold} G`;
    this.prestigeText.text = `声望 ${run.prestige}`;
    this.infoText.text   = `Lv${run.level} XP${run.xp}/8  Day${run.day}H${run.hour}  PvP${run.pvpWins}/10`;
  }
}
