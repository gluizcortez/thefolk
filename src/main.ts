import Phaser from 'phaser';
import { GameController } from './game/controller';
import { HouseScene } from './game/HouseScene';
import { t } from './i18n';
import { Hud } from './ui/hud';
import './ui/style.css';

const AUTOSAVE_MS = 30_000;

async function boot(): Promise<void> {
  document.title = t('app.title');
  const ctrl = new GameController();
  await ctrl.load(true); // continua de onde parou, se houver save

  if (import.meta.env.DEV) (window as unknown as { thefolk: GameController }).thefolk = ctrl;

  const hud = new Hud(document.getElementById('ui')!, ctrl);
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#2b2420',
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
    scene: [new HouseScene(ctrl, hud)],
    banner: false,
  });

  window.setInterval(() => void ctrl.save(true), AUTOSAVE_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void ctrl.save(true);
  });
}

void boot();
