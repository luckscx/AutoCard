import { Application } from 'pixi.js';
import { SceneManager } from './core/SceneManager.js';
import { LobbyScene } from './scenes/LobbyScene.js';
import { MainScene } from './scenes/MainScene.js';
import { BattleScene } from './scenes/BattleScene.js';
import { ShopScene } from './scenes/ShopScene.js';

async function boot() {
  const app = new Application();
  await app.init({
    background: '#1a1a2e',
    resizeTo: window,
    antialias: true,
  });
  document.getElementById('app')!.appendChild(app.canvas);

  const sm = new SceneManager(app);
  sm.register('lobby', new LobbyScene(sm));
  sm.register('main', new MainScene(sm));
  sm.register('battle', new BattleScene(sm));
  sm.register('shop', new ShopScene(sm));

  await sm.goto('lobby');
}

boot().catch(console.error);
