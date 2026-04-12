/**
 * MenuView — 游戏内菜单面板（模态弹窗）。
 *
 * 结构：
 *   MenuView (Container)  ← 全屏遮罩 + 面板
 *   ├── 主菜单页
 *   │   ├── "返回游戏"  关闭菜单
 *   │   ├── "设置"      切换到设置页
 *   │   └── "重开本局"  → 确认弹窗
 *   └── 设置页
 *       ├── BGM 音量滑块 (0~100)
 *       ├── SFX 音量滑块 (0~100)
 *       └── "返回"      切换回主菜单页
 *
 * 使用方法：
 *   const menu = new MenuView(() => audioManager.startBgm());
 *   scene.addChild(menu);
 *   // 触发显示：
 *   menu.show();
 *   // 重开回调：
 *   menu.onRestart = async () => { ... };
 */

import { Container, Graphics, Text } from 'pixi.js';
import { Button } from './Button.js';
import { W, H } from './layout.js';
import { audioManager } from '../audio/AudioManager.js';
import { sound } from '../audio/SoundManager.js';

// ── 滑块组件 ─────────────────────────────────────────────────────

/**
 * 简单水平滑块：拖拽或点击轨道改变值（0~100）。
 * 外观：暗色轨道 + 青色填充 + 白色拖块 + 当前数值标签
 */
class Slider extends Container {
  private track: Graphics;
  private fill: Graphics;
  private thumb: Graphics;
  private valueLabel: Text;

  private _value: number;
  private dragging = false;
  readonly trackW: number;
  readonly trackH = 8;
  readonly thumbR = 10;

  onChange: ((v: number) => void) | null = null;

  constructor(label: string, initValue: number, trackW = 220) {
    super();
    this.trackW = trackW;
    this._value = Math.max(0, Math.min(100, initValue));

    // 标签文字
    const lbl = new Text({
      text: label,
      style: { fill: '#ccddee', fontSize: 13, fontFamily: 'Arial' },
    });
    lbl.x = 0;
    lbl.y = 0;
    this.addChild(lbl);

    // 轨道背景
    this.track = new Graphics();
    this.drawTrack();
    this.track.x = 0;
    this.track.y = 28;
    this.addChild(this.track);

    // 填充区
    this.fill = new Graphics();
    this.fill.x = 0;
    this.fill.y = 28;
    this.addChild(this.fill);

    // 拖块
    this.thumb = new Graphics();
    this.thumb.circle(0, 0, this.thumbR);
    this.thumb.fill(0xffffff);
    this.thumb.stroke({ color: 0x4a90d9, width: 2 });
    this.thumb.y = 28 + this.trackH / 2;
    this.addChild(this.thumb);

    // 数值标签
    this.valueLabel = new Text({
      text: String(this._value),
      style: { fill: '#ffffff', fontSize: 13, fontFamily: 'Arial', fontWeight: 'bold' },
    });
    this.valueLabel.x = trackW + 14;
    this.valueLabel.y = 22;
    this.addChild(this.valueLabel);

    this.updateVisual();
    this.setupInteraction();
  }

  get value() { return this._value; }

  setValue(v: number) {
    this._value = Math.max(0, Math.min(100, Math.round(v)));
    this.updateVisual();
  }

  private drawTrack() {
    this.track.clear();
    this.track.roundRect(0, 0, this.trackW, this.trackH, 4);
    this.track.fill({ color: 0x1a2a3a, alpha: 0.9 });
    this.track.stroke({ color: 0x334455, width: 1 });
  }

  private updateVisual() {
    const ratio = this._value / 100;
    const fillW = Math.max(0, ratio * this.trackW);

    this.fill.clear();
    if (fillW > 0) {
      this.fill.roundRect(0, 0, fillW, this.trackH, 4);
      this.fill.fill(0x4a90d9);
    }

    this.thumb.x = ratio * this.trackW;
    this.valueLabel.text = String(this._value);
  }

  private setupInteraction() {
    // 让整个滑块区域（轨道）可交互
    const hitArea = new Graphics();
    hitArea.rect(-this.thumbR, 20, this.trackW + this.thumbR * 2, this.trackH + 20);
    hitArea.fill({ color: 0xffffff, alpha: 0.001 });
    hitArea.eventMode = 'static';
    hitArea.cursor = 'pointer';
    this.addChild(hitArea);

    hitArea.on('pointerdown', (e) => {
      this.dragging = true;
      this.setFromPointer(e.globalX);
      e.stopPropagation();
    });

    hitArea.on('pointermove', (e) => {
      if (!this.dragging) return;
      this.setFromPointer(e.globalX);
    });

    hitArea.on('pointerup', () => { this.dragging = false; });
    hitArea.on('pointerupoutside', () => { this.dragging = false; });
  }

  private setFromPointer(globalX: number) {
    // 将全局 X 换算到轨道局部坐标
    const localX = globalX - this.getGlobalPosition().x;
    const ratio = Math.max(0, Math.min(1, localX / this.trackW));
    const newVal = Math.round(ratio * 100);
    if (newVal !== this._value) {
      this._value = newVal;
      this.updateVisual();
      this.onChange?.(this._value);
    }
  }
}

// ── MenuView ─────────────────────────────────────────────────────

type MenuPage = 'main' | 'settings';

export class MenuView extends Container {
  /** 外部绑定：点击"重开本局"并确认后触发 */
  onRestart: (() => void | Promise<void>) | null = null;
  /** 外部绑定：菜单关闭后触发 */
  onClose: (() => void) | null = null;

  private overlay: Graphics;
  private panel: Container;
  private mainPage: Container;
  private settingsPage: Container;
  private currentPage: MenuPage = 'main';

  // 确认弹窗（模态）
  private confirmDialog: Container | null = null;

  constructor() {
    super();
    // 全屏半透明遮罩，拦截点击
    this.overlay = new Graphics();
    this.overlay.rect(0, 0, W, H);
    this.overlay.fill({ color: 0x000000, alpha: 0.65 });
    this.overlay.eventMode = 'static';
    // 点击遮罩空白区域关闭菜单
    this.overlay.on('pointertap', () => this.hide());
    this.addChild(this.overlay);

    // 主面板（居中）
    const PW = 360;
    const PH = 300;
    this.panel = new Container();
    this.panel.x = (W - PW) / 2;
    this.panel.y = (H - PH) / 2;
    this.addChild(this.panel);

    // 面板背景
    const panelBg = new Graphics();
    panelBg.roundRect(0, 0, PW, PH, 14);
    panelBg.fill({ color: 0x0e1a2b, alpha: 0.97 });
    panelBg.stroke({ color: 0x4a90d9, width: 2 });
    panelBg.eventMode = 'static'; // 阻止穿透到遮罩
    panelBg.on('pointertap', (e) => e.stopPropagation());
    this.panel.addChild(panelBg);

    // 标题
    const titleText = new Text({
      text: '菜 单',
      style: { fill: '#ffd700', fontSize: 20, fontFamily: 'Arial', fontWeight: 'bold' },
    });
    titleText.anchor.set(0.5, 0);
    titleText.x = PW / 2;
    titleText.y = 18;
    this.panel.addChild(titleText);

    // 分割线
    const divider = new Graphics();
    divider.rect(24, 50, PW - 48, 1);
    divider.fill({ color: 0x334466, alpha: 0.8 });
    this.panel.addChild(divider);

    // 主菜单页
    this.mainPage = this.buildMainPage(PW, PH);
    this.panel.addChild(this.mainPage);

    // 设置页（初始隐藏）
    this.settingsPage = this.buildSettingsPage(PW, PH);
    this.settingsPage.visible = false;
    this.panel.addChild(this.settingsPage);

    // 默认隐藏
    this.visible = false;
  }

  // ── 主菜单页 ────────────────────────────────────────────────

  private buildMainPage(pw: number, _ph: number): Container {
    const page = new Container();
    const BW = pw - 80; // 按钮宽度
    const BH = 48;
    const startY = 72;
    const gap = 60;

    // "返回游戏"
    const btnResume = new Button('返回游戏', BW, BH, 0x4a90d9);
    btnResume.x = 40;
    btnResume.y = startY;
    btnResume.on('pointertap', () => this.hide());
    page.addChild(btnResume);

    // "设置"
    const btnSettings = new Button('设置', BW, BH, 0x3a6080);
    btnSettings.x = 40;
    btnSettings.y = startY + gap;
    btnSettings.on('pointertap', () => this.switchPage('settings'));
    page.addChild(btnSettings);

    // "重开本局"
    const btnRestart = new Button('重开本局', BW, BH, 0xb03030);
    btnRestart.x = 40;
    btnRestart.y = startY + gap * 2;
    btnRestart.on('pointertap', () => this.showConfirmDialog());
    page.addChild(btnRestart);

    return page;
  }

  // ── 设置页 ────────────────────────────────────────────────

  private buildSettingsPage(pw: number, _ph: number): Container {
    const page = new Container();

    const subtitleBgm = new Text({
      text: '🎵 背景音乐',
      style: { fill: '#aabbcc', fontSize: 14, fontFamily: 'Arial', fontWeight: 'bold' },
    });
    subtitleBgm.x = 40;
    subtitleBgm.y = 68;
    page.addChild(subtitleBgm);

    // BGM 滑块
    const bgmSlider = new Slider('音量', audioManager.bgmVolume, pw - 120);
    bgmSlider.x = 40;
    bgmSlider.y = 90;
    bgmSlider.onChange = (v) => {
      audioManager.setBgmVolume(v);
    };
    page.addChild(bgmSlider);

    const subtitleSfx = new Text({
      text: '🔊 音效',
      style: { fill: '#aabbcc', fontSize: 14, fontFamily: 'Arial', fontWeight: 'bold' },
    });
    subtitleSfx.x = 40;
    subtitleSfx.y = 158;
    page.addChild(subtitleSfx);

    // SFX 滑块
    const sfxSlider = new Slider('音量', audioManager.sfxVolume, pw - 120);
    sfxSlider.x = 40;
    sfxSlider.y = 180;
    sfxSlider.onChange = (v) => {
      audioManager.setSfxVolume(v);
    };
    page.addChild(sfxSlider);

    // "返回" 按钮
    const btnBack = new Button('返回', 120, 40, 0x2a4060);
    btnBack.x = (pw - 120) / 2;
    btnBack.y = 244;
    btnBack.on('pointertap', () => this.switchPage('main'));
    page.addChild(btnBack);

    return page;
  }

  // ── 确认弹窗 ────────────────────────────────────────────────

  private showConfirmDialog() {
    if (this.confirmDialog) return;

    const DW = 300;
    const DH = 170;
    const dialog = new Container();
    dialog.x = (W - DW) / 2;
    dialog.y = (H - DH) / 2;

    // 遮罩层（覆盖整个菜单）
    const mask = new Graphics();
    mask.rect(-dialog.x, -dialog.y, W, H);
    mask.fill({ color: 0x000000, alpha: 0.45 });
    mask.eventMode = 'static';
    dialog.addChild(mask);

    // 弹窗背景
    const bg = new Graphics();
    bg.roundRect(0, 0, DW, DH, 12);
    bg.fill({ color: 0x16213e, alpha: 0.98 });
    bg.stroke({ color: 0xd94a4a, width: 2 });
    bg.eventMode = 'static';
    bg.on('pointertap', (e) => e.stopPropagation());
    dialog.addChild(bg);

    const title = new Text({
      text: '重开本局',
      style: { fill: '#ff6666', fontSize: 17, fontFamily: 'Arial', fontWeight: 'bold' },
    });
    title.anchor.set(0.5, 0);
    title.x = DW / 2;
    title.y = 18;
    dialog.addChild(title);

    const desc = new Text({
      text: '当前游戏进度将全部重置，\n确认要重新开始吗？',
      style: {
        fill: '#ccddee',
        fontSize: 13,
        fontFamily: 'Arial',
        align: 'center',
        wordWrap: true,
        wordWrapWidth: DW - 40,
      },
    });
    desc.anchor.set(0.5, 0);
    desc.x = DW / 2;
    desc.y = 52;
    dialog.addChild(desc);

    // 取消
    const btnCancel = new Button('取消', 110, 40, 0x2a4060);
    btnCancel.x = 20;
    btnCancel.y = 112;
    btnCancel.on('pointertap', () => this.closeConfirmDialog());
    dialog.addChild(btnCancel);

    // 确认（红色）
    const btnConfirm = new Button('确认重开', 140, 40, 0xc03030);
    btnConfirm.x = 140;
    btnConfirm.y = 112;
    btnConfirm.on('pointertap', async () => {
      this.closeConfirmDialog();
      this.hide();
      sound.play('click');
      if (this.onRestart) {
        await this.onRestart();
      }
    });
    dialog.addChild(btnConfirm);

    this.confirmDialog = dialog;
    this.addChild(dialog);
  }

  private closeConfirmDialog() {
    if (this.confirmDialog) {
      this.removeChild(this.confirmDialog);
      this.confirmDialog.destroy({ children: true });
      this.confirmDialog = null;
    }
  }

  // ── 页面切换 ────────────────────────────────────────────────

  private switchPage(page: MenuPage) {
    this.currentPage = page;
    this.mainPage.visible = page === 'main';
    this.settingsPage.visible = page === 'settings';
    sound.play('click');
  }

  // ── 显示 / 隐藏 ──────────────────────────────────────────────

  show() {
    this.visible = true;
    this.switchPage('main');
    // 确保浮在最顶层
    const parent = this.parent;
    if (parent) {
      parent.removeChild(this);
      parent.addChild(this);
    }
    // 首次交互后启动 BGM
    audioManager.startBgm();
  }

  hide() {
    this.closeConfirmDialog();
    this.visible = false;
    this.onClose?.();
  }
}
