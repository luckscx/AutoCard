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

    const bg = new Graphics();
    bg.roundRect(0, 0, W - SIDE_PAD * 2, Z4_H, 8);
    bg.fill({ color: 0x0e1a2b, alpha: 0.95 });
    this.addChild(bg);

    this.x = SIDE_PAD;
    this.y = Z4_Y;

    // 储物箱按钮
    this.stashBtn = new Container();
    const stashBg = new Graphics();
    stashBg.roundRect(0, 0, 72, 34, 6);
    stashBg.fill(0x3a2a1a);
    stashBg.stroke({ color: 0xcd7f32, width: 2 });
    this.stashBtn.addChild(stashBg);
    const stashLabel = new Text({ text: '储物箱', style: { fill: '#ffcc00', fontSize: 12, fontFamily: 'Arial', fontWeight: 'bold' } });
    stashLabel.anchor.set(0.5);
    stashLabel.x = 36;
    stashLabel.y = 17;
    this.stashBtn.addChild(stashLabel);
    this.stashBtn.x = 8;
    this.stashBtn.y = 8;
    this.stashBtn.eventMode = 'static';
    this.stashBtn.cursor = 'pointer';
    this.stashBtn.on('pointertap', () => this.onStashToggle?.());
    this.addChild(this.stashBtn);

    this.hpText = new Text({ text: '', style: { fill: '#66ff66', fontSize: 13, fontFamily: 'Arial', fontWeight: 'bold' } });
    this.hpText.x = 96;
    this.hpText.y = 8;
    this.addChild(this.hpText);

    this.goldText = new Text({ text: '', style: { fill: '#ffcc00', fontSize: 13, fontFamily: 'Arial', fontWeight: 'bold' } });
    this.goldText.x = 220;
    this.goldText.y = 8;
    this.addChild(this.goldText);

    this.prestigeText = new Text({ text: '', style: { fill: '#ff9966', fontSize: 13, fontFamily: 'Arial', fontWeight: 'bold' } });
    this.prestigeText.x = 330;
    this.prestigeText.y = 8;
    this.addChild(this.prestigeText);

    this.infoText = new Text({ text: '', style: { fill: '#aabbcc', fontSize: 11, fontFamily: 'Arial' } });
    this.infoText.x = 96;
    this.infoText.y = 30;
    this.addChild(this.infoText);
  }

  update(run: RunState) {
    this.hpText.text = `HP ${run.hp}/${run.maxHp}`;
    this.goldText.text = `${run.gold} G`;
    this.prestigeText.text = `声望 ${run.prestige}`;
    this.infoText.text = `Lv.${run.level}  XP ${run.xp}/8  PvP ${run.pvpWins}/10  Day${run.day} H${run.hour}`;
  }
}
