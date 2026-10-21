import type { Settings } from './types';
/** Local soundtrack + original synthesized Foley. No microphone or remote requests. */
export class AudioMixer {
  private music: HTMLAudioElement;
  private ctx?: AudioContext;
  private settings: Settings;
  constructor(settings: Settings) {
    this.settings = settings;
    this.music = new Audio(); this.music.hidden = true; this.music.dataset.soundtrack = 'wobbly-whisk'; document.body.append(this.music);
    this.music.src = this.music.canPlayType('audio/ogg') ? '/audio/wobbly-whisk.ogg' : '/audio/wobbly-whisk.mp3';
    this.music.loop = true; this.music.preload = 'none'; this.music.volume = settings.music;
  }
  start() { void this.music.play().catch(() => {}); this.ctx ??= new AudioContext(); void this.ctx.resume(); }
  pause() { this.music.pause(); }
  update(settings: Settings) { this.settings = settings; this.music.volume = settings.music; }
  effect(kind: string) {
    if (!this.ctx || !this.settings.effects) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const tones = kind === 'serve' ? [523, 659, 784, 1046] : kind === 'mistake' ? [220, 160, 110] : kind === 'disaster' ? [90, 80, 60, 120] : kind === 'mix' ? [350, 500] : kind === 'flip' ? [300, 700, 900] : [560, 700];
    tones.forEach((f, i) => {
      const o = ctx.createOscillator(), gain = ctx.createGain();
      o.type = kind === 'mistake' || kind === 'disaster' ? 'triangle' : 'sine';
      o.frequency.setValueAtTime(f, t + i * 0.065); o.frequency.exponentialRampToValueAtTime(f * 0.7, t + i * 0.065 + 0.14);
      gain.gain.setValueAtTime(0, t); gain.gain.setValueAtTime(this.settings.effects * 0.12, t + i * 0.065); gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.065 + 0.2);
      o.connect(gain); gain.connect(ctx.destination); o.start(t + i * 0.065); o.stop(t + i * 0.065 + 0.22);
    });
    if (['pour', 'splash', 'disaster'].includes(kind)) {
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
      const data = buffer.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const source = ctx.createBufferSource(), gain = ctx.createGain(), filter = ctx.createBiquadFilter();
      source.buffer = buffer; filter.type = 'lowpass'; filter.frequency.value = kind === 'disaster' ? 160 : 1400;
      gain.gain.value = this.settings.effects * 0.12; source.connect(filter); filter.connect(gain); gain.connect(ctx.destination); source.start();
    }
  }
  dispose() { this.music.pause(); this.music.src = ''; this.music.remove(); void this.ctx?.close(); }
}
