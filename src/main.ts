import { GameController } from './game/controller';
import { GameView } from './game/GameView';
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
  const view = new GameView(document.getElementById('game')!, ctrl, hud);
  hud.setThumbnailer((art) => view.thumbnail(art));
  view.start();
  if (import.meta.env.DEV) (window as unknown as { thefolkView: GameView }).thefolkView = view;

  window.setInterval(() => void ctrl.save(true), AUTOSAVE_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void ctrl.save(true);
  });
}

void boot();
