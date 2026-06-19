import { Application } from 'pixi.js';
import { SceneManager } from './core/SceneManager.js';
import { LobbyScene } from './scenes/LobbyScene.js';
import { MainScene } from './scenes/MainScene.js';
import { BattleScene } from './scenes/BattleScene.js';
import { ShopScene } from './scenes/ShopScene.js';

// 竖屏设计分辨率（9:19.3，近似 390×844）
const DESIGN_W = 390;
const DESIGN_H = 844;

async function boot() {
  const app = new Application();
  await app.init({
    background: '#1a1a2e',
    resizeTo: window,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });
  document.getElementById('app')!.appendChild(app.canvas);

  // 竖屏优先：保持设计分辨率比例，四周留黑边（letterbox）
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
