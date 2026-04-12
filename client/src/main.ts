import { Application } from 'pixi.js';
import { SceneManager } from './core/SceneManager.js';
import { LobbyScene } from './scenes/LobbyScene.js';
import { MainScene } from './scenes/MainScene.js';
import { BattleScene } from './scenes/BattleScene.js';
import { ShopScene } from './scenes/ShopScene.js';

// 设计分辨率（16:10）
const DESIGN_W = 960;
const DESIGN_H = 600;

async function boot() {
  const app = new Application();
  await app.init({
    background: '#1a1a2e',
    resizeTo: window,
    antialias: true,
    resolution: window.devicePixelRatio || 1,  // 适配高DPI/Retina屏
    autoDensity: true,                          // canvas CSS尺寸不随resolution放大
  });
  document.getElementById('app')!.appendChild(app.canvas);

  // 根据窗口尺寸等比缩放 stage，保持 16:10 设计分辨率，四周留黑边（letterbox）
  function fitStage() {
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const scale = Math.min(winW / DESIGN_W, winH / DESIGN_H);
    app.stage.scale.set(scale);
    app.stage.x = (winW - DESIGN_W * scale) / 2;
    app.stage.y = (winH - DESIGN_H * scale) / 2;
  }

  fitStage();
  window.addEventListener('resize', fitStage);

  const sm = new SceneManager(app);
  sm.register('lobby', new LobbyScene(sm));
  sm.register('main', new MainScene(sm));
  sm.register('battle', new BattleScene(sm));
  sm.register('shop', new ShopScene(sm));

  await sm.goto('lobby');
}

boot().catch(console.error);
