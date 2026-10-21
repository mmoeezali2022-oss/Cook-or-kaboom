# Cook or KABOOM!

**Cook together. Mess up together. Laugh forever.**

An original browser cooking game. This first playable, **The Pancake Disaster**, is a complete **single-player** recipe in a warm, procedural 3D kitchen. It is a development prototype, not the full multiplayer production release described in the supplied design brief.

## Run locally

Requirements: Node.js 22.12+ (developed with Node 24.19), npm, and a modern WebGL-capable browser.

```sh
npm ci
npm run dev
```

Open the address printed by Vite. Choose **Play for free**, a chef and apron, and Classic or Cozy. No account, backend, API key, or database is needed.

```sh
npm run build       # strict TypeScript + production bundle in dist/
npm run preview     # serve that production bundle
npm test            # gameplay state-machine tests
npm run test:e2e    # real Chromium gameplay, camera, settings, export, touch-input, and comedy checks
```

Browser tests default to `/usr/bin/chromium`. Set `CHROMIUM_PATH` to another Chromium executable if necessary. The Playwright configuration starts or reuses Vite on port 5173. Tests use software WebGL and low graphics to remain useful in headless CI; this is not a device-performance benchmark.

## Your first shift

1. Use WASD/arrows or the **Kitchen map** to walk to the ingredient shelf. Pick up an egg with **E** or the action button.
2. At the mixing counter, press E to begin cracking, then again while the marker is in the striped sweet spot. Add flour from the shelf and milk from the fridge in the same way. Milk also has a timing interaction.
3. With empty hands, use the mixing bowl six times to whisk the batter.
4. Fetch butter from the fridge and use it at the stove. One pat seasons the whole batch.
5. Scoop batter from the bowl and use the stove. Flip after at least **4 seconds**, then collect the other side after **3 seconds**. Either side burns at **11 seconds**.
6. Carry the pancake to the serving table. Repeat until all five are served.

Mistimed ingredients can be collected again. Use a burned pan to clear it. Batter is renewable so mistakes do not exhaust the recipe. The sink discards your held item and lowers chaos. Classic has a six-minute simulation clock; Cozy has no timer and disables pranks. The clock pauses in menus and throttles long background-tab frames so returning to the browser does not instantly burn the kitchen.

| Action | Control |
| --- | --- |
| Move / sprint | WASD or arrows / Shift |
| Look / zoom | Drag scene / scroll |
| Interact | E or action button |
| Throw held item | T or toss control |
| Jump | Space or touch jump |
| Cycle back → front → first person | F5 or C, or camera button |
| Flour prank / mischief menu | Q / Mischief button |
| Emotes | G or Emote |
| Photo Studio | P or Photo |
| Pause / settings | Escape or pause button |
| Assisted station navigation | Kitchen map, then choose a station |

Touch layouts include a movement stick, jump, toss, and all cooking actions. Camera input uses dragging. Keyboard movement cancels assisted walking. No pointer lock or microphone permission is required.

## Implemented

- Live 3D kitchen and original articulated Marcus/Lina prototype meshes with tall silhouettes, thick hands, facial features, idle/walk/run animation, jumping, hat motion, and emotes.
- Three camera modes, dedicated first-person hands and held items, follow smoothing, basic obstruction limits, and camera sensitivity.
- Ingredient ownership, egg/milk timing, visible bowl/whisk, mixing state, buttered pan, two-sided cooking, flip animation, burns, clearing, serving, and honest end-of-round results.
- Optional cooldown-limited flour bursts and temporary butter slip hazards, a chaos meter, cleanup, and a recoverable flour disaster.
- Supplied looping **The Wobbly Whisk** soundtrack, original synthesized gameplay sounds, independent volume controls, and browser autoplay handling.
- Real WebGL photo capture at 1920×1080, 1080×1080, or 1080×1920; filters, caption, local PNG downloads, and native file sharing where supported.
- Responsive public content, recipe guide, chef selection and apron colors, local settings, quality profiles, reduced motion, high contrast, focus-managed dialogs, visual cooking cues, and touch controls.

## Deliberately later

Real multiplayer rooms, authoritative networking, voice, account/progression systems, full character customization, production facial rigs and active ragdolls, more recipes/maps, replay recording, advertising, and public deployment are not implemented. The second chef in the home diorama is a visual preview, not a simulated online player.

The original models are built in code and use articulated groups, not production skeletal/glTF character assets. Collision handling is a kinematic controller with kitchen AABBs plus ballistic throw effects; it is not a general rigid-body physics simulation. Photo Studio has crops, filters, caption, save and share; free camera orbit, stickers, timers, and a photo gallery remain future work. Mobile browser/device certification and human playtesting remain required before a public beta.

## Architecture

- `src/App.tsx`, `src/components/`: public site, dialogs, settings, HUD, setup, photo studio.
- `src/game/recipe.ts`: pure typed recipe rules, scoring, recovery, timing, chaos, objectives.
- `src/game/engine.ts`: renderer, input, movement/collision, cameras, animation, effects, capture.
- `src/game/models.ts`: original procedural kitchen, chefs, ingredients, and shared materials.
- `src/game/audio.ts`: local looping music and synthesized sound effects.
- `src/game/settings.ts`: validated, versioned browser-local preferences.
- `tests/`: meaningful rule and real-browser workflow checks.

See [the actual kitchen screenshot](docs/screenshots/kitchen.png), [architecture and production notes](docs/ARCHITECTURE.md), [asset provenance](docs/ASSETS.md), and [validation report](docs/VALIDATION.md).
