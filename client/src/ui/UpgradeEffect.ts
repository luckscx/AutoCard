import { Container, Graphics, Text, Ticker } from 'pixi.js';
import { W, H } from './layout.js';

/**
 * 升级成功动效 — 替代 window.alert() 的非阻塞反馈组件。
 *
 * 用于「战斗准备阶段选择升级/合成成功」等场景：卡片以弹入+发光环+短暂停留+上浮淡出
 * 的方式展示提示文案，动画结束后自动从父容器移除，不阻塞任何后续交互。
 *
 * 用法：showUpgradeEffect(this, '⬆️ 卡牌名 青铜 → 白银 升级成功！')
 */
export function showUpgradeEffect(parent: Container, message: string, glowColor = 0xffd700): void {
  const layer = new Container();

  const text = new Text({
    text: message,
    style: {
      fill: '#ffffff',
      fontSize: 17,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: W - 80,
    },
  });
  text.anchor.set(0.5);

  const padX = 22;
  const padY = 14;
  const boxW = Math.min(W - 40, text.width + padX * 2);
  const boxH = text.height + padY * 2;

  // 外发光环（脈动）
  const glow = new Graphics();
  glow.roundRect(-boxW / 2 - 6, -boxH / 2 - 6, boxW + 12, boxH + 12, 18);
  glow.stroke({ color: glowColor, width: 3, alpha: 0.7 });
  layer.addChild(glow);

  // 主体背板
  const bg = new Graphics();
  bg.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, 14);
  bg.fill({ color: 0x0e1a2b, alpha: 0.95 });
  bg.stroke({ color: glowColor, width: 2 });
  layer.addChild(bg);

  layer.addChild(text);

  layer.x = W / 2;
  layer.y = H / 2 - 60;
  layer.alpha = 0;
  layer.scale.set(0.55);
  parent.addChild(layer);

  const IN = 220;   // 弹入阶段时长(ms)
  const HOLD = 1100; // 停留阶段时长(ms)
  const OUT = 350;   // 上浮淡出阶段时长(ms)
  const TOTAL = IN + HOLD + OUT;

  let elapsed = 0;
  const baseY = layer.y;

  const tick = (ticker: Ticker) => {
    // 若节点已被外部（如 render() 重建界面）移出显示树，直接清理销毁，避免残留动画计时器
    if (!layer.parent) {
      Ticker.shared.remove(tick);
      if (!layer.destroyed) layer.destroy({ children: true });
      return;
    }

    elapsed += ticker.deltaMS;

    if (elapsed <= IN) {
      const t = elapsed / IN;
      layer.alpha = t;
      layer.scale.set(0.55 + 0.45 * easeOutBack(t));
    } else if (elapsed <= IN + HOLD) {
      layer.alpha = 1;
      const wobble = Math.sin((elapsed - IN) / 130) * 0.025;
      layer.scale.set(1 + wobble);
    } else if (elapsed <= TOTAL) {
      const t = (elapsed - IN - HOLD) / OUT;
      layer.alpha = 1 - t;
      layer.y = baseY - t * 26;
      layer.scale.set(1 + 0.08 * t);
    } else {
      Ticker.shared.remove(tick);
      if (layer.parent) layer.parent.removeChild(layer);
      if (!layer.destroyed) layer.destroy({ children: true });
      return;
    }
  };

  Ticker.shared.add(tick);
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
