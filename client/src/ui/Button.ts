import { Container, Graphics, Text } from 'pixi.js';
import { sound } from '../audio/SoundManager.js';

export class Button extends Container {
  private bg: Graphics;
  private textNode: Text;

  constructor(text: string, width = 200, height = 50, color = 0x4a90d9) {
    super();
    this.bg = new Graphics();
    this.bg.roundRect(0, 0, width, height, 10);
    this.bg.fill(color);
    this.addChild(this.bg);

    this.textNode = new Text({ text, style: { fill: '#ffffff', fontSize: 18, fontFamily: 'Arial' } });
    this.textNode.anchor.set(0.5);
    this.textNode.x = width / 2;
    this.textNode.y = height / 2;
    this.addChild(this.textNode);

    this.eventMode = 'static';
    this.cursor = 'pointer';

    this.on('pointerdown', () => sound.play('click'));
    this.on('pointerover', () => {
      this.bg.tint = 0xcccccc;
    });
    this.on('pointerout', () => {
      this.bg.tint = 0xffffff;
    });
  }

  setText(text: string) {
    this.textNode.text = text;
  }

  /** 重新着色背景（用于切换选中态） */
  setColor(color: number) {
    const w = this.bg.width;
    const h = this.bg.height;
    this.bg.clear();
    this.bg.roundRect(0, 0, w, h, 10);
    this.bg.fill(color);
  }
}
