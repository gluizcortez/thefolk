import { GameController } from './game/controller';
import { GameView } from './game/GameView';
import { t } from './i18n';
import { FamilyCreator } from './ui/creator';
import { Hud } from './ui/hud';
import './ui/style.css';

const AUTOSAVE_MS = 30_000;

async function boot(): Promise<void> {
  document.title = t('app.title');
  const ctrl = new GameController();
  const hadSave = await ctrl.load(true); // continua de onde parou, se houver save

  if (import.meta.env.DEV) (window as unknown as { thefolk: GameController }).thefolk = ctrl;

  const hud = new Hud(document.getElementById('ui')!, ctrl);
  const view = new GameView(document.getElementById('game')!, ctrl, hud);
  hud.setThumbnailer((art) => view.thumbnail(art));
  hud.setSwatcher((tex, tall) => view.swatch(tex, tall));
  view.start();
  // bloco 5: sem save, o jogo começa na tela de criar família
  const creator = new FamilyCreator(document.getElementById('ui')!, ctrl, (look, wear) => view.portrait(look, wear));
  hud.openCreator = () => creator.show(true);
  if (!hadSave) creator.show(false);
  if (import.meta.env.DEV) (window as unknown as { thefolkCreator: FamilyCreator }).thefolkCreator = creator;
  if (import.meta.env.DEV) (window as unknown as { thefolkView: GameView }).thefolkView = view;

  window.setInterval(() => void ctrl.save(true), AUTOSAVE_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void ctrl.save(true);
  });
}

void boot();
