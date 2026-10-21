export type Ingredient = 'egg' | 'flour' | 'milk' | 'butter';
export type HeldItem = Ingredient | 'batter' | 'pancake';
export type StationId = 'pantry' | 'fridge' | 'bowl' | 'stove' | 'serve' | 'sink';
export type CameraMode = 'back' | 'front' | 'first';
export type ChefPreset = 'marcus' | 'lina';
export interface Settings {
  music: number; effects: number; reducedMotion: boolean; quality: 'auto' | 'low' | 'high';
  sensitivity: number; pranks: boolean; highContrast: boolean;
}
export interface RoundState {
  status: 'playing' | 'won' | 'lost'; mode: 'classic' | 'cozy'; remaining: number;
  held: HeldItem | null; ingredients: Ingredient[]; mixed: number; buttered: boolean;
  pan: 'empty' | 'first' | 'second' | 'burned'; heat: number;
  served: number; chaos: number; mistakes: number; flips: number; throws: number;
  message: string; event: number; lastEvent: 'start' | 'pickup' | 'pour' | 'mix' | 'flip' | 'serve' | 'mistake' | 'splash' | 'disaster';
}
export type Action =
  | { type: 'interact'; station: StationId; timing?: number }
  | { type: 'tick'; dt: number }
  | { type: 'throw' }
  | { type: 'prank'; prank: 'flour' | 'butter'; enabled: boolean }
  | { type: 'reset'; mode: 'classic' | 'cozy' };
export const DEFAULT_SETTINGS: Settings = { music: 0.2, effects: 0.5, reducedMotion: false, quality: 'auto', sensitivity: 1, pranks: true, highContrast: false };
export const CAMERA_NAMES: Record<CameraMode, string> = { back: 'Third person · back', front: 'Third person · front', first: 'First person' };
export const ITEM_NAMES: Record<HeldItem, string> = { egg: 'Egg', flour: 'Flour', milk: 'Milk', butter: 'Butter', batter: 'Pancake batter', pancake: 'Golden pancake' };
export const STATIONS: { id: StationId; name: string; x: number; z: number; hint: string }[] = [
  { id: 'pantry', name: 'Ingredient shelf', x: -3.7, z: -3.2, hint: 'Pick up eggs & flour' },
  { id: 'fridge', name: 'Fridge', x: -6, z: -1.6, hint: 'Pick up milk & butter' },
  { id: 'bowl', name: 'Mixing counter', x: 0, z: -3.2, hint: 'Make pancake batter' },
  { id: 'stove', name: 'Stove', x: 3.4, z: -3.2, hint: 'Butter, pour & flip' },
  { id: 'serve', name: 'Serving table', x: 5.7, z: 0.6, hint: 'Serve your pancakes' },
  { id: 'sink', name: 'Sink', x: -5.8, z: 2.2, hint: 'Clean up & lower chaos' },
];
