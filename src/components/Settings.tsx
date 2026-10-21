import { Volume2, Music2, Accessibility, SlidersHorizontal, Keyboard } from 'lucide-react';
import type { Settings as SettingsType } from '../game/types';
export function Settings({ settings, update }: { settings: SettingsType; update: (s: SettingsType) => void }) {
  const set = <K extends keyof SettingsType>(key: K, value: SettingsType[K]) => update({ ...settings, [key]: value });
  return <div className="settings-form">
    <p className="muted">Your kitchen, your comfort. Preferences stay on this device.</p>
    <h3><Music2 size={18} /> Sound & music</h3>
    <label className="range-row"><span>Background music <strong>{Math.round(settings.music * 100)}%</strong></span><input aria-label="Music volume" type="range" min="0" max="1" step="0.01" value={settings.music} onChange={e => set('music', +e.target.value)} /></label>
    <label className="range-row"><span><Volume2 size={15} /> Sound effects <strong>{Math.round(settings.effects * 100)}%</strong></span><input aria-label="Sound effects volume" type="range" min="0" max="1" step="0.01" value={settings.effects} onChange={e => set('effects', +e.target.value)} /></label>
    <h3><Accessibility size={18} /> Make yourself comfortable</h3>
    <label className="toggle-row"><span>Reduced motion<small>Quieter animations and instant camera follows</small></span><input type="checkbox" checked={settings.reducedMotion} onChange={e => set('reducedMotion', e.target.checked)} /></label>
    <label className="toggle-row"><span>High contrast<small>Stronger borders and interaction indicators</small></span><input type="checkbox" checked={settings.highContrast} onChange={e => set('highContrast', e.target.checked)} /></label>
    <label className="toggle-row"><span>Harmless mischief<small>Allow flour bursts and butter slips in Classic</small></span><input type="checkbox" checked={settings.pranks} onChange={e => set('pranks', e.target.checked)} /></label>
    <h3><SlidersHorizontal size={18} /> Graphics & camera</h3>
    <label className="select-row">Graphics quality<select value={settings.quality} onChange={e => set('quality', e.target.value as SettingsType['quality'])}><option value="auto">Automatic</option><option value="low">Low · fewer particles, no shadows</option><option value="high">High · detailed shadows</option></select></label>
    <label className="range-row"><span>Camera sensitivity <strong>{settings.sensitivity.toFixed(1)}×</strong></span><input aria-label="Camera sensitivity" type="range" min="0.3" max="2" step="0.1" value={settings.sensitivity} onChange={e => set('sensitivity', +e.target.value)} /></label>
    <details className="control-details"><summary><Keyboard size={17} /> Keyboard controls</summary><p>WASD / arrows: move · Drag: look · Shift: run · Space: jump · E: interact · T: throw · F5 / C: camera · Q: flour prank · G: emotes · P: photo · Esc: pause.</p><p>Prefer a pointer? Use the kitchen map to walk to any station, then the action button to cook.</p></details>
  </div>;
}
