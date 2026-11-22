// Each note is [onset in seconds, Hz, duration, relative level, optional end Hz].
// The short switch click and the longer outcomes share the same soft attack.
const cues = {
  tap: {wave: 'sine', level: .14, notes: [
    [0, 880, .043, .78, 680], [.008, 1320, .035, .25, 1060],
  ]},
  finish: {wave: 'triangle', level: .22, notes: [
    [0, 587, .10, .44], [.085, 440, .14, .42], [.23, 196, .24, .68, 147],
  ]},
  win: {wave: 'triangle', level: .26, notes: [
    [0, 294, .30, .46], [.095, 370, .26, .49], [.19, 440, .32, .57],
    [.34, 587, .57, .65], [.35, 370, .44, .28], [.47, 880, .48, .24],
  ]},
  loss: {wave: 'triangle', level: .23, notes: [
    [0, 392, .25, .53], [.15, 349, .26, .50], [.32, 294, .58, .60],
    [.34, 147, .59, .40],
  ]},
  draw: {wave: 'sine', level: .24, notes: [
    [0, 392, .24, .62], [.22, 392, .36, .55], [.22, 294, .36, .32],
  ]},
  mvp: {wave: 'sine', level: .23, notes: [
    [0, 247, .36, .52, 294], [.12, 440, .40, .40], [.38, 587, .43, .33],
  ]},
};

const menus = '#welcome, #pause, #hud-editor, #visor-editor, #strike-panel, #squad-presentation, #match-result';

export class InterfaceAudio {
  constructor(engine) {
    this.engine = engine;
    this.active = new Set();
    this.lastTap = -Infinity;
    this.resumeTicket = 0;
  }

  get volume() {
    return this.engine.params.sound ? .65 * (this.engine.preferences.volumeInterface ?? .7) : 0;
  }

  bind(root) {
    // A click covers touch, mouse and keyboard activation exactly once. Capture
    // it before a menu button removes itself or stops event propagation.
    root.addEventListener('click', event => {
      const button = event.target.closest?.('button');
      if (!event.isTrusted || !button || button.disabled || button.closest('[hidden], [inert]')) return;
      if (button.id === 'strike-confirm') return; // Already has the dispatch sound.
      if (button.closest(menus) || button.matches('#map-button, #settings-button, #auto-reload')) {
        this.play('tap', true);
      }
    }, true);
    root.addEventListener('change', event => {
      const control = event.target;
      if (event.isTrusted && control.closest?.(menus) && control.matches('select, input[type=checkbox], input[type=radio], input[type=range], input[type=color]')) {
        this.play('tap', true);
      }
    });
    const refreshVolume = () => { if (this.output) this.output.gain.value = this.volume; };
    root.addEventListener('input', refreshVolume);
    root.addEventListener('change', refreshVolume);
    root.addEventListener('visibilitychange', () => {
      const ctx = this.engine.ctx;
      if (!ctx) return;
      if (root.hidden) {
        this.resumeTicket++;
        for (const source of this.active) source.stop();
        this.wasRunning = ctx.state === 'running';
        if (this.wasRunning) ctx.suspend().catch(() => {});
      } else if (this.wasRunning) {
        this.wasRunning = false;
        ctx.resume().catch(() => {});
      }
    });
  }

  play(kind, gesture = false) {
    if (document.hidden || this.volume <= 0) return;
    const now = performance.now();
    if (kind === 'tap') {
      if (now - this.lastTap < 55) return;
      this.lastTap = now;
    }
    // Only real gestures create or unlock the context. A frame callback never
    // builds a second engine or queues a late fanfare while Safari is suspended.
    const ctx = gesture ? this.engine.getContext() : this.engine.ctx;
    if (!ctx) return;
    if (ctx.state === 'running') {
      this.emit(ctx, cues[kind]);
    } else if (gesture && ctx.state !== 'closed') {
      const ticket = ++this.resumeTicket;
      ctx.resume().then(() => {
        if (ticket === this.resumeTicket && ctx.state === 'running' && !document.hidden && this.volume > 0 && performance.now() - now < 400) {
          this.emit(ctx, cues[kind]);
        }
      }).catch(() => {});
    }
  }

  emit(ctx, cue) {
    if (!this.output) {
      this.output = ctx.createGain();
      this.output.connect(ctx.destination);
    }
    this.output.gain.value = this.volume;
    const start = ctx.currentTime;
    for (const [delay, pitch, duration, level, endPitch] of cue.notes) {
      const source = ctx.createOscillator(), envelope = ctx.createGain();
      const at = start + delay, end = at + duration;
      source.type = cue.wave;
      source.frequency.setValueAtTime(pitch, at);
      if (endPitch) source.frequency.exponentialRampToValueAtTime(endPitch, end);
      envelope.gain.setValueAtTime(.0001, at);
      envelope.gain.linearRampToValueAtTime(cue.level * level, at + Math.min(.013, duration * .14));
      envelope.gain.exponentialRampToValueAtTime(cue.level * level * .32, at + duration * .43);
      envelope.gain.exponentialRampToValueAtTime(.0001, end);
      source.connect(envelope);
      envelope.connect(this.output);
      this.active.add(source);
      source.onended = () => {
        source.disconnect();
        envelope.disconnect();
        this.active.delete(source);
      };
      source.start(at);
      source.stop(end);
    }
  }
}
