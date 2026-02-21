import { Container, type Application } from 'pixi.js';

export abstract class Scene extends Container {
  abstract onEnter(data?: any): void | Promise<void>;
  onExit(): void {}
}

export class SceneManager {
  private scenes = new Map<string, Scene>();
  private current: Scene | null = null;
  private app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  register(name: string, scene: Scene) {
    this.scenes.set(name, scene);
  }

  async goto(name: string, data?: any) {
    if (this.current) {
      this.current.onExit();
      this.app.stage.removeChild(this.current);
    }
    const next = this.scenes.get(name);
    if (!next) throw new Error(`Scene not found: ${name}`);
    this.current = next;
    this.app.stage.addChild(next);
    await next.onEnter(data);
  }

  get currentScene() { return this.current; }
}
