import { Container, Graphics, Text } from 'pixi.js';
import { sound } from '../audio/SoundManager.js';
import { C, T, drawButtonBg } from './theme.js';

export class Button extends Container {
  private bg: Graphics;
  private textNode: Text;
  private w: number;
  private h: number;
  private color: number;
  private pressed = false;

  constructor(text: string, width: number = 200, height: number = 50, color: number = C.blue) {
    super();
    this.w = width;
    this.h = height;
    this.color = color;
    this.bg = new Graphics();
    this.redraw();
    this.addChild(this.bg);

    this.textNode = new Text({
      text,
      style: {
        fill: '#ffffff',
        fontSize: 18,
        fontFamily: 'Noto Sans CJK SC, Arial, sans-serif',
        fontWeight: 'bold',
        dropShadow: { color: '#000000', alpha: 0.3, distance: 1, blur: 0, angle: Math.PI / 2 },
      },
    });
    this.textNode.anchor.set(0.5);
    this.textNode.x = width / 2;
    this.textNode.y = height / 2;
    this.addChild(this.textNode);

    this.eventMode = 'static';
    this.cursor = 'pointer';

    this.on('pointerdown', () => {
      sound.play('click');
      this.pressed = true;
      this.redraw();
      this.scale.set(0.96);
    });
    this.on('pointerover', () => {
      this.scale.set(1.04);
    });
    this.on('pointerout', () => {
      this.pressed = false;
      this.redraw();
      this.scale.set(1);
    });
    this.on('pointerup', () => {
      this.pressed = false;
      this.redraw();
    });
    this.on('pointerupoutside', () => {
      this.pressed = false;
      this.redraw();
      this.scale.set(1);
    });
  }

  private redraw() {
    this.bg.clear();
    drawButtonBg(this.bg, 0, 0, this.w, this.h, this.color, 10, this.pressed);
  }

  setText(text: string) {
    this.textNode.text = text;
  }

  getColor() { return this.color; }

  /** 重新着色背景（用于切换选中态） */
  setColor(color: number) {
    this.color = color;
    this.redraw();
  }
}
