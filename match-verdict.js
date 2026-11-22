import {squadResult} from './squad-presentation.js';

// Milliseconds on the document clock, independent of the stopped match.
const GRADE_START = 500, GRADE_END = 1500;
const STAMP_START = 2400, STAMP_END = 3200;
const FADE_START = 5500, CUT = 6000, END = 6500;

const titles = {win: 'VICTORIA', loss: 'HUMILLACIÓN', draw: 'EMPATE'};
const phrases = {
  win: [
    'Esta ronda lleva tu firma.', 'Que se escuche en la otra base.',
    'Guarda ese último fotograma.', 'El marcador habla por ti.',
    'Hasta la radio pide la repetición.', 'La frecuencia es tuya.',
    'Hoy te toca presumir.', 'Puedes soltar el aire.',
    'Así se cierra una partida.', 'Esa se queda en los mejores momentos.',
    'La vuelta al hangar sabe mejor así.', 'El rival ya está pidiendo la revancha.',
  ],
  loss: [
    'Mejor cambiamos de frecuencia.', 'Esa repetición va a doler.',
    'Ni la interferencia tapó el marcador.', 'La revancha empieza en el menú.',
    'Esta vuelta al hangar va en silencio.', 'Te deben otra ronda.',
    'Respira. Vuelve a entrar.', 'Esta vez tocó escuchar la celebración.',
    'Quedó una cuenta pendiente.', 'Cierra el marcador cuando estés listo.',
    'Ese final se va a comentar.', 'La próxima se juega con memoria.',
  ],
  draw: [
    'Nos debemos el desempate.', 'Hasta el marcador quedó en tablas.',
    'Una ronda más habría dicho mucho.', 'La última palabra sigue pendiente.',
    'La revancha va por partida doble.', 'Hoy se comparte el marcador.',
    'El desempate tendrá que esperar.', 'Ni un punto de diferencia.',
  ],
};

const gradeFrames = [
  {filter: 'grayscale(0) blur(0px) brightness(1)'},
  {offset: .19, filter: 'grayscale(.10) blur(.6px) brightness(.98)'},
  {offset: .62, filter: 'grayscale(.88) blur(6.5px) brightness(.79)'},
  {filter: 'grayscale(1) blur(8px) brightness(.72)'},
];
const stampFrames = [
  {opacity: 0, transform: 'translateY(var(--stamp-lift)) rotate(var(--stamp-tilt)) scale(var(--stamp-near))', easing: 'cubic-bezier(.35,0,.75,.55)'},
  {offset: .42, opacity: 1, transform: 'translateY(-.035em) rotate(0deg) scale(1.055)', easing: 'ease-in'},
  {offset: .51, opacity: 1, transform: 'translateY(.025em) scale(var(--stamp-contact))', easing: 'ease-out'},
  {offset: .73, opacity: 1, transform: 'translateY(-.012em) scale(var(--stamp-rebound))', easing: 'ease-in-out'},
  {opacity: 1, transform: 'none'},
];

export class MatchEnding {
  constructor(panel, gameUI, squad) {
    this.panel = panel;
    this.gameUI = gameUI;
    this.squad = squad;
    this.title = panel.querySelector('h2');
    this.phrase = panel.querySelector('p');
    this.vignette = panel.querySelector('.verdict-vignette');
    this.black = panel.querySelector('.verdict-black');
    this.bags = new Map();
    this.effects = [];
    this.started = null;
    panel.addEventListener('keydown', event => {
      if (event.key === 'Tab') event.preventDefault();
      event.stopPropagation();
    });
  }

  get active() { return this.started !== null || this.squad.active; }

  nextPhrase(kind) {
    const bag = this.bags.get(kind) || {remaining: [], last: null};
    if (!bag.remaining.length) bag.remaining = [...phrases[kind]];
    const choices = bag.remaining.filter(line => line !== bag.last);
    const line = choices[Math.floor(Math.random() * choices.length)];
    bag.remaining.splice(bag.remaining.indexOf(line), 1);
    bag.last = line;
    this.bags.set(kind, bag);
    return line;
  }

  animate(element, frames, from, to, easing = 'linear') {
    const animation = element.animate(frames, {delay: from, duration: to - from, fill: 'both', easing});
    animation.startTime = this.started;
    this.effects.push(animation);
  }

  open(view, result) {
    this.close();
    if (result.reason === 'atomic') {
      this.squad.open(view, result);
      return;
    }
    const {outcome} = squadResult(result);
    const kind = outcome === 'Victoria' ? 'win' : outcome === 'Empate' ? 'draw' : 'loss';
    this.pending = {view, result};
    this.panel.dataset.outcome = kind;
    this.title.textContent = titles[kind];
    this.phrase.textContent = this.nextPhrase(kind);

    // Reuse the HUD editor's one-shot copy of the fully rendered world and weapon.
    // The gameplay loop is frozen, so its canvas also makes a fallback if 2D is unavailable.
    let image = view.renderer?.domElement;
    try {
      this.gameUI.capture();
      image = this.gameUI.screen;
    } catch {
      this.gameUI.releaseCapture();
    }
    this.black.style.opacity = '0';
    this.panel.hidden = false;
    document.body.classList.add('verdict-showing');
    this.panel.focus({preventScroll: true});
    this.started = document.timeline?.currentTime ?? performance.now();
    if (image) this.animate(image, gradeFrames, GRADE_START, GRADE_END);
    this.animate(this.vignette, [{opacity: 0}, {opacity: 1}], GRADE_START, GRADE_END, 'cubic-bezier(.43,0,.19,1)');
    this.animate(this.title, stampFrames, STAMP_START, STAMP_END);
    this.animate(this.phrase, [
      {opacity: 0, transform: 'translateY(.38em)'},
      {opacity: 1, transform: 'none'},
    ], STAMP_START + 300, STAMP_END, 'ease-out');
  }

  releaseStill() {
    this.pending = null;
    for (const effect of this.effects) effect.cancel();
    this.effects.length = 0;
    this.gameUI.releaseCapture();
    this.gameUI.screen.width = this.gameUI.screen.height = 1;
  }

  frame(now) {
    if (this.started === null) {
      this.squad.frame(now);
      return;
    }
    const elapsed = now - this.started;
    if (elapsed < FADE_START) return;
    if (elapsed < CUT) {
      this.black.style.opacity = (elapsed - FADE_START) / (CUT - FADE_START);
      return;
    }
    if (this.pending) {
      const {view, result} = this.pending;
      this.black.style.opacity = '1';
      this.panel.dataset.revealing = '';
      this.releaseStill();
      this.squad.panel.inert = true;
      this.squad.open(view, result);
      // Submit the visor behind solid black before uncovering it.
      if (elapsed < END) return;
    } else {
      this.squad.frame(now);
    }
    if (elapsed < END) {
      this.black.style.opacity = (END - elapsed) / (END - CUT);
      return;
    }
    this.hideVerdict();
    if (this.squad.active) this.squad.button.focus({preventScroll: true});
  }

  hideVerdict() {
    this.panel.hidden = true;
    delete this.panel.dataset.revealing;
    document.body.classList.remove('verdict-showing');
    this.squad.panel.inert = false;
    this.started = null;
  }

  close() {
    if (this.pending) this.releaseStill();
    if (this.started !== null) this.hideVerdict();
    this.squad.close();
  }
}
