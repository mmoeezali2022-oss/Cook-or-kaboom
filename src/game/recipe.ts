import type { Action, RoundState, StationId } from './types';
export const newRound = (mode: 'classic' | 'cozy' = 'classic'): RoundState => ({
  status: 'playing', mode, remaining: 360, held: null, ingredients: [], mixed: 0, buttered: false,
  pan: 'empty', heat: 0, served: 0, chaos: 0, mistakes: 0, flips: 0, throws: 0,
  message: 'Welcome, chef! Find an egg on the ingredient shelf.', event: 0, lastEvent: 'start',
});
function say(s: RoundState, message: string, lastEvent: RoundState['lastEvent'] = 'pickup'): RoundState {
  return { ...s, message, lastEvent, event: s.event + 1 };
}
function mistake(s: RoundState, message: string, amount = 15): RoundState {
  return say({ ...s, chaos: Math.min(100, s.chaos + amount), mistakes: s.mistakes + 1 }, message, 'mistake');
}
export function recipeReducer(state: RoundState, action: Action): RoundState {
  if (action.type === 'reset') return newRound(action.mode);
  if (state.status !== 'playing') return state;
  const s = { ...state, ingredients: [...state.ingredients] };
  if (action.type === 'tick') {
    // Bound simulation steps so a resumed background tab cannot instantly burn a round.
    const dt = Math.max(0, Math.min(action.dt, 0.25));
    if (s.mode === 'classic') s.remaining = Math.max(0, s.remaining - dt);
    if (s.remaining === 0) return say({ ...s, status: 'lost' }, 'Time is up. A delicious effort! Try another shift.', 'mistake');
    if (s.pan === 'first' || s.pan === 'second') {
      s.heat += dt;
      if (s.heat >= 11) return mistake({ ...s, pan: 'burned' }, 'That pancake went to the dark side. Clean the pan at the stove and try again!', 22);
    }
    if (s.chaos >= 100) return say({ ...s, chaos: 25 }, 'KABOOM! A flour-powered fireworks show. Your recipe is safe. Carry on, chef!', 'disaster');
    return s;
  }
  if (action.type === 'throw') {
    if (!s.held) return say(s, 'Pick up an ingredient first. Then aim and toss!');
    const item = s.held;
    return say({ ...s, held: null, throws: s.throws + 1, chaos: Math.min(100, s.chaos + 12) }, `${item === 'egg' ? 'Egg-spress delivery!' : 'Incoming ingredient!'} You can always collect another.`, 'splash');
  }
  if (action.type === 'prank') {
    if (!action.enabled || s.mode === 'cozy') return say(s, 'Mischief is off. Enjoy your peaceful kitchen.');
    return say({ ...s, chaos: Math.min(100, s.chaos + 25) }, action.prank === 'flour' ? 'POOF! The kitchen is wearing a little extra flour.' : 'Butter believe it! Mind that slippery patch.', 'splash');
  }
  const station = action.station;
  if (station === 'pantry' || station === 'fridge') {
    if (s.held) return say(s, 'Hands full! Use your ingredient, or toss it with T.');
    const item = station === 'pantry' ? (!s.ingredients.includes('egg') ? 'egg' : 'flour') : (!s.ingredients.includes('milk') ? 'milk' : 'butter');
    return say({ ...s, held: item }, `${item[0].toUpperCase() + item.slice(1)} in hand. ${item === 'butter' ? 'Take it to the stove.' : 'Take it to the mixing counter.'}`);
  }
  if (station === 'bowl') {
    if (s.held && ['egg', 'milk', 'flour'].includes(s.held)) {
      const item = s.held as 'egg' | 'milk' | 'flour';
      if (s.ingredients.includes(item)) return say(s, 'That ingredient is already in. No double yolks today!');
      if ((item === 'egg' || item === 'milk') && action.timing !== undefined && (action.timing < 0.35 || action.timing > 0.8)) {
        return mistake({ ...s, held: null }, item === 'egg' ? 'A little shell confetti! Fetch another egg and try the sweet spot.' : 'Oops, milk mustache! Fetch another carton and aim for the sweet spot.');
      }
      return say({ ...s, held: null, ingredients: [...s.ingredients, item] }, `${item === 'egg' ? 'A clean crack!' : item === 'milk' ? 'Perfect pour!' : 'Flour, meet bowl.'} ${s.ingredients.length === 2 ? 'All in! Press E six times to whisk.' : 'Bring the next ingredient.'}`, 'pour');
    }
    if (s.held) return say(s, 'Save that for the stove or serving table.');
    if (s.ingredients.length < 3) return say(s, 'Our batter needs one egg, flour, and milk. Check the recipe card.');
    if (s.mixed < 6) return say({ ...s, mixed: s.mixed + 1 }, s.mixed === 5 ? 'Silky batter! Press E to scoop a portion.' : `Whisk it real good! ${s.mixed + 1} / 6 stirs.`, 'mix');
    return say({ ...s, held: 'batter' }, 'Batter up! Take your portion to the buttered pan.');
  }
  if (station === 'stove') {
    if (s.pan === 'burned') return say({ ...s, pan: 'empty', heat: 0, chaos: Math.max(0, s.chaos - 10) }, 'Pan rescued. Scoop fresh batter from the bowl. No need to start over.', 'splash');
    if (s.held === 'butter' && s.pan === 'empty') return say({ ...s, held: null, buttered: true }, 'Sizzle! The pan is buttered for the whole batch.', 'pour');
    if (s.held === 'batter' && s.pan === 'empty') {
      if (!s.buttered) return say(s, 'Butter first! Toss this portion or return after buttering the pan.');
      return say({ ...s, held: null, pan: 'first', heat: 0 }, 'Batter is sizzling! Wait for bubbles, then flip at 4–8 seconds.', 'pour');
    }
    if (s.pan === 'first') {
      if (s.heat < 4) return mistake(s, 'Too soon! Let the bubbles form. Your pancake is still in the pan.', 8);
      return say({ ...s, pan: 'second', heat: 0, flips: s.flips + 1 }, 'Beautiful flip! Give the other side 3 seconds, then pick it up.', 'flip');
    }
    if (s.pan === 'second') {
      if (s.heat < 3) return say(s, 'Almost golden. Give the second side 3 seconds.');
      if (s.held) return say(s, 'Your hands are full! Toss the ingredient before picking up your pancake.');
      return say({ ...s, held: 'pancake', pan: 'empty', heat: 0 }, 'Golden and glorious. Take it to the serving table!', 'pickup');
    }
    return say(s, s.buttered ? 'Bring a scoop of batter from the mixing bowl.' : 'Bring butter from the fridge to season the pan.');
  }
  if (station === 'serve') {
    if (s.held !== 'pancake') return say(s, 'Only golden pancakes go on this plate. The syrup is standing by.');
    s.served += 1; s.held = null; s.chaos = Math.max(0, s.chaos - 12);
    if (s.served === 5) return say({ ...s, status: 'won' }, 'Five glorious pancakes! You are officially a Wobbly Kitchen graduate.', 'serve');
    return say(s, `Pancake ${s.served} served! ${5 - s.served} to go. Scoop more batter at the bowl.`, 'serve');
  }
  return say({ ...s, chaos: Math.max(0, s.chaos - 25), held: null }, 'Squeaky clean! Hands washed, spills cleared, chaos lowered.', 'splash');
}
export function nextObjective(s: RoundState): { title: string; detail: string; station: StationId } {
  if (s.held === 'pancake') return { title: 'Serve that beauty', detail: 'Take your pancake to the serving table.', station: 'serve' };
  if (s.pan === 'burned') return { title: 'Rescue the pan', detail: 'Use the stove to clear the burnt pancake.', station: 'stove' };
  if (s.pan === 'first') return { title: s.heat < 4 ? 'Wait for the bubbles…' : 'Flip it, chef!', detail: 'At the stove, flip between 4 and 8 seconds.', station: 'stove' };
  if (s.pan === 'second') return { title: s.heat < 3 ? 'Let the other side sizzle' : 'Perfectly golden!', detail: 'Pick up your pancake after 3 seconds.', station: 'stove' };
  if (s.held === 'butter' || s.held === 'batter') return { title: s.held === 'butter' ? 'Butter up the pan' : 'Pour your batter', detail: 'Take what you’re holding to the stove.', station: 'stove' };
  if (s.held) return { title: `Add ${s.held} to the bowl`, detail: 'Use the mixing counter. Aim for the sweet spot!', station: 'bowl' };
  if (!s.ingredients.includes('egg')) return { title: 'Every disaster starts with an egg', detail: 'Pick up an egg from the ingredient shelf.', station: 'pantry' };
  if (!s.ingredients.includes('flour')) return { title: 'A little flour power', detail: 'Pick up flour from the ingredient shelf.', station: 'pantry' };
  if (!s.ingredients.includes('milk')) return { title: 'Milk makes it fluffy', detail: 'Pick up milk from the fridge.', station: 'fridge' };
  if (s.mixed < 6) return { title: 'Give it a good whisk', detail: `${s.mixed} / 6 stirs. Use the bowl to mix.`, station: 'bowl' };
  if (!s.buttered) return { title: 'Let’s get sizzling', detail: 'Collect butter from the fridge for the pan.', station: 'fridge' };
  return { title: 'Batter up!', detail: 'Scoop another portion from the mixing bowl.', station: 'bowl' };
}
