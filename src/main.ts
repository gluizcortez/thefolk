import { AudioDirector } from './audio/director';
import { AudioEngine } from './audio/engine';
import { loadPrefs } from './audio/prefs';
import { GameController } from './game/controller';
import { GameView } from './game/GameView';
import { t } from './i18n';
import { FamilyCreator } from './ui/creator';
import { Hud } from './ui/hud';
import { TownPanel } from './ui/town';
import './ui/style.css';

const AUTOSAVE_MS = 30_000;

async function boot(): Promise<void> {
  document.title = t('app.title');
  const ctrl = new GameController();
  const hadSave = await ctrl.boot(); // continua de onde parou, se houver save (bloco 7: na vaga em uso)

  if (import.meta.env.DEV) (window as unknown as { thefolk: GameController }).thefolk = ctrl;

  const hud = new Hud(document.getElementById('ui')!, ctrl);
  const view = new GameView(document.getElementById('game')!, ctrl, hud);
  hud.setThumbnailer((art) => view.thumbnail(art));
  hud.setSwatcher((tex, tall) => view.swatch(tex, tall));
  view.start();
  // bloco 7: miniatura da casa para os jogos salvos
  ctrl.snapshot = () => view.snapshot();

  // bloco 7: som. O navegador só libera o áudio depois de um clique ou tecla.
  const engine = new AudioEngine(loadPrefs());
  const director = new AudioDirector(ctrl, engine, (x, y) => view.hearing(x, y));
  hud.setAudio(engine);
  const unlock = () => engine.unlock();
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  let lastAudio = performance.now();
  const audioLoop = (now: number) => {
    director.update(Math.min(0.25, (now - lastAudio) / 1000));
    lastAudio = now;
    requestAnimationFrame(audioLoop);
  };
  requestAnimationFrame(audioLoop);
  if (import.meta.env.DEV) (window as unknown as { thefolkAudio: AudioEngine }).thefolkAudio = engine;
  // bloco 5: sem save, o jogo começa na tela de criar família
  const creator = new FamilyCreator(document.getElementById('ui')!, ctrl, (look, wear) => view.portrait(look, wear));
  hud.openCreator = () => creator.show(true);
  // bloco 15: a tela do bairro (vista na tela do jogo, painel por cima)
  const town = new TownPanel(document.getElementById('ui')!, ctrl, view.town);
  town.newFamilyAt = (lotId) => creator.showForLot(lotId);
  if (!hadSave) creator.show(false);
  if (import.meta.env.DEV) (window as unknown as { thefolkCreator: FamilyCreator }).thefolkCreator = creator;
  if (import.meta.env.DEV) (window as unknown as { thefolkView: GameView }).thefolkView = view;

  window.setInterval(() => void ctrl.save(true), AUTOSAVE_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void ctrl.save(true);
  });
}

void boot();
