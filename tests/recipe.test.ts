import { describe, expect, it } from 'vitest';
import { newRound, nextObjective, recipeReducer as reduce } from '../src/game/recipe';
import type { RoundState, StationId } from '../src/game/types';
function use(s: RoundState, station: StationId, timing = 0.5) { return reduce(s, { type: 'interact', station, timing }); }
function tick(s: RoundState, seconds: number) { for (let t = 0; t < seconds; t += 0.1) s = reduce(s, { type: 'tick', dt: 0.1 }); return s; }
function batter() {
  let s = newRound();
  for (const st of ['pantry', 'pantry', 'fridge'] as const) { s = use(s, st); s = use(s, 'bowl'); }
  for (let i = 0; i < 6; i++) s = use(s, 'bowl');
  s = use(s, 'fridge'); return use(s, 'stove');
}
describe('The Pancake Disaster — gameplay rules', () => {
  it('requires actual ingredients, mixing, butter and cooking before serving', () => {
    let s = newRound(); s = use(s, 'serve'); expect(s.served).toBe(0);
    s = use(s, 'bowl'); expect(s.mixed).toBe(0); s = use(s, 'stove'); expect(s.pan).toBe('empty');
    s = batter(); expect(s.ingredients).toEqual(['egg', 'flour', 'milk']); expect(s.mixed).toBe(6); expect(s.buttered).toBe(true);
  });
  it('plays a complete five-pancake round and only then awards success', () => {
    let s = batter();
    for (let i = 1; i <= 5; i++) {
      s = use(s, 'bowl'); s = use(s, 'stove'); expect(s.pan).toBe('first');
      s = tick(s, 4.1); s = use(s, 'stove'); expect(s.pan).toBe('second');
      s = tick(s, 3.1); s = use(s, 'stove'); expect(s.held).toBe('pancake');
      s = use(s, 'serve'); expect(s.served).toBe(i); expect(s.status).toBe(i === 5 ? 'won' : 'playing');
    }
    expect(s.flips).toBe(5); expect(s.remaining).toBeGreaterThan(300);
  });
  it('recovers from mistimed egg cracking and milk pouring', () => {
    for (const station of ['pantry', 'fridge'] as const) {
      let s = newRound(); s = use(s, station); s = use(s, 'bowl', 0.1); expect(s.ingredients).toHaveLength(0); expect(s.held).toBeNull();
      expect(s.mistakes).toBe(1); s = use(s, station); s = use(s, 'bowl', 0.6); expect(s.ingredients).toHaveLength(1);
    }
  });
  it('prevents duplicate ingredients and picking up with full hands', () => {
    let s = use(newRound(), 'pantry'); const held = s.held;
    s = use(s, 'fridge'); expect(s.held).toBe(held);
    s = use(s, 'bowl'); s = use(s, 'fridge'); s = use(s, 'bowl'); s = use(s, 'fridge'); s = use(s, 'bowl');
    expect(s.ingredients).toEqual(['egg', 'milk']); expect(s.held).toBe('butter');
    const duplicate = use({ ...s, held: 'egg' }, 'bowl'); expect(duplicate.ingredients).toEqual(['egg', 'milk']); expect(duplicate.held).toBe('egg');
  });
  it('early flips are recoverable and burned pancakes cannot be served', () => {
    let s = use(use(batter(), 'bowl'), 'stove'); s = use(s, 'stove'); expect(s.pan).toBe('first'); expect(s.mistakes).toBe(1);
    s = tick(s, 11.1); expect(s.pan).toBe('burned'); s = use(s, 'serve'); expect(s.served).toBe(0);
    s = use(s, 'stove'); expect(s.pan).toBe('empty'); expect(s.buttered).toBe(true);
    s = use(s, 'bowl'); s = use(s, 'stove'); expect(s.pan).toBe('first');
  });
  it('cannot collect an undercooked second side or overwrite held ingredients', () => {
    let s = use(use(batter(), 'bowl'), 'stove'); s = use(tick(s, 4.1), 'stove');
    s = use(s, 'stove'); expect(s.held).toBeNull(); s = tick(s, 3.2);
    s = use(s, 'pantry'); s = use(s, 'stove'); expect(s.held).toBe('flour'); expect(s.pan).toBe('second');
    s = reduce(s, { type: 'throw' }); s = use(s, 'stove'); expect(s.held).toBe('pancake');
  });
  it('has a no-timer cozy mode and respects prank opt-out', () => {
    let s = newRound('cozy'); s = tick(s, 10); expect(s.remaining).toBe(360);
    s = reduce(s, { type: 'prank', prank: 'butter', enabled: true }); expect(s.chaos).toBe(0);
    s = reduce(newRound(), { type: 'prank', prank: 'flour', enabled: false }); expect(s.chaos).toBe(0);
  });
  it('a disaster resets chaos while preserving the recipe and score', () => {
    let s = { ...batter(), chaos: 100, served: 2 }; s = tick(s, 0.1);
    expect(s.lastEvent).toBe('disaster'); expect(s.chaos).toBe(25); expect(s.served).toBe(2); expect(s.mixed).toBe(6);
  });
  it('cleaning lowers chaos and throwing never creates an unwinnable round', () => {
    let s = { ...batter(), chaos: 60 }; s = use(s, 'sink'); expect(s.chaos).toBe(35);
    s = use(s, 'bowl'); s = reduce(s, { type: 'throw' }); expect(s.held).toBeNull(); s = use(s, 'bowl'); expect(s.held).toBe('batter');
  });
  it('time expiry ends a classic round and end states reject further actions', () => {
    const s = reduce({ ...newRound(), remaining: 0.05 }, { type: 'tick', dt: 0.1 }); expect(s.status).toBe('lost'); expect(reduce(s, { type: 'interact', station: 'pantry' })).toBe(s);
    expect(reduce(s, { type: 'reset', mode: 'cozy' }).status).toBe('playing');
  });
  it('objective guides the chef through required actions in order', () => {
    expect(nextObjective(newRound()).station).toBe('pantry'); expect(nextObjective(batter()).station).toBe('bowl');
    expect(nextObjective({ ...batter(), pan: 'burned' }).station).toBe('stove'); expect(nextObjective({ ...batter(), held: 'pancake' }).station).toBe('serve');
  });
});
