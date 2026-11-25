import './styles.css';
import { GameClient } from './net/GameClient.js';
import { AutoBattleController } from './auto/AutoBattleController.js';
import { World3DView } from './engine/World3DView.js';
import { HudController } from './ui/HudController.js';

async function bootstrap() {
  const root = document.getElementById('app');
  if (!root) return;

  const client = new GameClient();
  const autoCtrl = new AutoBattleController(client);

  let hud!: HudController;
  const worldView = new World3DView(document.createElement('div'), client, autoCtrl, () => {
    hud.refresh();
  });

  hud = new HudController(root, client, autoCtrl, worldView);
  hud.mount();

  (worldView as any).mountEl = hud.getViewportEl();
  await worldView.init();
}

bootstrap();
