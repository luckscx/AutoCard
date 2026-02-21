import { Container, Graphics } from 'pixi.js';

export class Panel extends Container {
  constructor(width: number, height: number, bgColor = 0x16213e, alpha = 0.9, radius = 12) {
    super();
    const bg = new Graphics();
    bg.roundRect(0, 0, width, height, radius);
    bg.fill({ color: bgColor, alpha });
    this.addChild(bg);
  }
}
