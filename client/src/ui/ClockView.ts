/**
 * ClockView — 钟表组件
 * 钟面表盘表示第几小时（1-6 小时映射到钟面位置），上方写天数数字。
 * 游戏每天 6 小时：指针随 hour 值指向对应角度。
 */
import { Container, Graphics, Text } from 'pixi.js';
import { C } from './theme.js';

const FONT = 'Noto Sans CJK SC, Arial, sans-serif';

// 钟表尺寸参数
const CLOCK_R = 18;          // 钟面半径
const HOUR_MAX = 6;           // 每天最多 6 小时

export class ClockView extends Container {
  private g: Graphics;
  private dayText: Text;
  private hourLabel: Text;
  private hour: number = 1;
  private hourType: string = 'choice';

  constructor() {
    super();

    this.g = new Graphics();
    this.addChild(this.g);

    // 天数数字（钟表正上方）
    this.dayText = new Text({
      text: '1',
      style: {
        fill: '#ffd700',
        fontSize: 14,
        fontFamily: FONT,
        fontWeight: 'bold',
        dropShadow: { color: '#000000', alpha: 0.4, distance: 1, blur: 0, angle: Math.PI / 2 },
      },
    });
    this.dayText.anchor.set(0.5, 1); // 底部居中，紧贴钟面上方
    this.addChild(this.dayText);

    // 小时阶段标签（钟表右侧）
    this.hourLabel = new Text({
      text: '',
      style: {
        fill: '#8a8ab5',
        fontSize: 11,
        fontFamily: FONT,
        fontWeight: 'bold',
      },
    });
    this.hourLabel.anchor.set(0, 0.5);
    this.addChild(this.hourLabel);

    this.draw();
  }

  /**
   * 更新钟表状态
   * @param day  第几天
   * @param hour 第几小时 (1-6)
   * @param hourType 'choice' | 'pve' | 'pvp'
   */
  update(day: number, hour: number, hourType: string) {
    this.hour = hour;
    this.hourType = hourType;
    this.dayText.text = String(day);
    const label = hourType === 'choice' ? '运营' : hourType === 'pve' ? 'PvE' : 'PvP';
    // 根据阶段类型用不同颜色
    this.hourLabel.text = label;
    this.hourLabel.style.fill = hourType === 'pve' ? '#00d97a' : hourType === 'pvp' ? '#ff5b5b' : '#8a8ab5';
    this.draw();
  }

  private draw() {
    const g = this.g;
    g.clear();

    // 钟表圆心坐标：自我抽屉里以本地坐标(0,0)为圆心，dayText 在上方、hourLabel 在右
    const cx = 0;
    const cy = 0;

    // ── 外圈光晕 ──
    g.circle(cx, cy, CLOCK_R + 4);
    g.fill({ color: C.blue, alpha: 0.08 });

    // ── 钟面背景（深色渐变球） ──
    g.circle(cx, cy, CLOCK_R);
    g.fill({ color: 0x0e1a2b, alpha: 0.95 });

    // ── 钟面外圈 ──
    g.circle(cx, cy, CLOCK_R);
    g.stroke({ color: C.borderHi, width: 1.5, alpha: 0.7 });

    // ── 小时刻度（6个点对应 1-6 小时） ──
    // 1-6 小时映射到钟面：hour=1 在顶部，顺时针每 60° 一个
    // 角度 = (hour-1) * 60° 从 12 点方向开始
    for (let h = 1; h <= HOUR_MAX; h++) {
      const angle = ((h - 1) * 60 - 90) * Math.PI / 180; // -90° 让起点在顶部
      const tx = cx + Math.cos(angle) * (CLOCK_R - 4);
      const ty = cy + Math.sin(angle) * (CLOCK_R - 4);

      const isCurrent = h === this.hour;
      if (isCurrent) {
        // 当前小时刻度高亮
        g.circle(tx, ty, 3);
        g.fill({ color: C.gold });
      } else if (h <= this.hour) {
        // 已经过去的小时
        g.circle(tx, ty, 2);
        g.fill({ color: C.blue, alpha: 0.5 });
      } else {
        // 未来小时
        g.circle(tx, ty, 1.5);
        g.fill({ color: C.textMuted, alpha: 0.4 });
      }
    }

    // ── 时钟指针 ──
    const angle = ((this.hour - 1) * 60 - 90) * Math.PI / 180;
    const handLen = CLOCK_R - 6;
    const hx = cx + Math.cos(angle) * handLen;
    const hy = cy + Math.sin(angle) * handLen;

    // 指针阴影/粗体效果
    g.moveTo(cx, cy);
    g.lineTo(hx, hy);
    g.stroke({ color: this.hourType === 'pvp' ? C.red : this.hourType === 'pve' ? C.green : C.gold, width: 2.5, cap: 'round' });

    // ── 中心轴 ──
    g.circle(cx, cy, 2.5);
    g.fill({ color: C.gold });

    // ── 更新子元素位置 ──
    // dayText 在钟表正上方
    this.dayText.x = cx;
    this.dayText.y = cy - CLOCK_R - 2;

    // hourLabel 在钟表右侧
    this.hourLabel.x = cx + CLOCK_R + 6;
    this.hourLabel.y = cy;
  }
}
