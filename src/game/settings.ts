import { DEFAULT_SETTINGS } from './types';
import type { Settings } from './types';
export function loadSettings(): Settings {
  const s = { ...DEFAULT_SETTINGS };
  try {
    const saved: Record<string, unknown> = JSON.parse(localStorage.getItem('cok-settings-v1') || '{}');
    for (const key of ['music', 'effects', 'sensitivity'] as const) if (typeof saved[key] === 'number' && Number.isFinite(saved[key])) s[key] = Math.max(key === 'sensitivity' ? 0.3 : 0, Math.min(key === 'sensitivity' ? 2 : 1, saved[key]));
    for (const key of ['reducedMotion', 'pranks', 'highContrast'] as const) if (typeof saved[key] === 'boolean') s[key] = saved[key];
    if (['auto', 'low', 'high'].includes(saved.quality as string)) s.quality = saved.quality as Settings['quality'];
    if (!localStorage.getItem('cok-settings-v1') && matchMedia('(prefers-reduced-motion: reduce)').matches) s.reducedMotion = true;
  } catch { /* Storage can be unavailable in privacy modes. Defaults still work. */ }
  return s;
}
export function saveSettings(settings: Settings) { try { localStorage.setItem('cok-settings-v1', JSON.stringify(settings)); } catch { /* Session settings remain usable. */ } }
