import { Container, Graphics, Text } from 'pixi.js';

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
}
