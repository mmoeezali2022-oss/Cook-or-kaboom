# First playable validation

Validated on **21 October 2026** in the current cloud machine. This is evidence for a single-player development milestone, not certification of a public multiplayer release.

## Environment and repeatability

- Node.js **24.19.0**, npm **11.9.0**, Chromium **154.0.8037.57** on Linux.
- `bash scripts/setup-cloud.sh`: passed. A fresh `npm ci` installed the locked dependencies, followed by the production build and all 11 gameplay-rule tests. No keys, database, backend, or external runtime services were needed.
- The development server started on port 5173; local application and soundtrack requests returned HTTP 200.
- The compiled production app was separately served on port 4173. Selecting **Lina**, the **sage apron**, **Cozy mode**, walking to the sink, cleaning, collecting milk, and throwing it all passed without page errors. Bundled OGG, MP3, and license assets returned HTTP 200. The temporary production preview was stopped after validation; the development server remains available in the current session.
- Necessary `install_script` and `start_skill` were successfully persisted to the cloud environment draft. Saving does not publish that draft or prove restoration in a fresh task. The user must review/save it in environment settings and publish the environment.

## Gameplay rules: 11 passing tests

`npm test` exercises real recipe transitions and failure conditions:

- Required ingredients, mixing, butter, two cooking sides, and serving prerequisites.
- A complete five-pancake round; success occurs only after the fifth serving.
- Mistimed egg/milk recovery, duplicate rejection, and full-hand handling.
- Early flips, burning, pan clearing, and fresh-batter recovery.
- Undercooked second sides and safe ownership of held ingredients.
- Cozy timing and prank opt-out.
- Chaos disaster recovery without losing recipe progress.
- Sink cleanup and ingredient replacement after throwing.
- Classic timeout, terminal states, restart, and objective guidance.

## Browser workflows: 4 passing scenarios

The first three scenarios passed together in a 3.3-minute run; the fourth was then added and passed in a targeted 21.5-second run. No gameplay code changed between these runs.

1. **Full Classic cooking round:** navigate the actual kitchen, collect and prepare each ingredient, whisk six times, butter the pan, cook and flip both sides, and serve all five pancakes through the UI. The win dialog appeared. Photo Studio produced a real image and the PNG download completed. The downloaded file had a valid PNG signature and **1920×1080** dimensions.
2. **Desktop controls and preferences:** F5/C cycled all three cameras; keyboard movement reached a station; throwing cleared held ownership; Cozy rejected pranks; pause/resume worked; music/settings persisted. The real audio element advanced playback, looped, and used the requested volume. Square and story images decoded at **1080×1080** and **1080×1920**.
3. **Touch interaction at 390×844:** an actual emulated touch sequence moved the virtual joystick to a station; assisted walking collected an egg; a touchscreen press completed the timed cracking interaction; leaving returned to the homepage. The page had no horizontal overflow. This is browser emulation, not a physical phone benchmark.
4. **Classic comedy:** flour raised chaos; the shared prank cooldown disabled butter temporarily; a butter patch caused a recoverable slip; walking to and using the sink reduced chaos; the emote menu returned to gameplay.

The tests use Chromium with software WebGL, low graphics, one worker, and the recipe's real cooking timers. The complete recipe has a seven-minute runner allowance for slow software renderers; assertions and in-game recipe requirements are unchanged.

## Visual and asset checks

- Inspected desktop home/setup/game views, first-person hands, the mobile homepage and kitchen, and an actual exported kitchen photograph.
- Original models follow the supplied reference's tall chef silhouettes, warm palette, oversized hats and hands. These remain procedural prototypes, not finished production skinned assets.
- The OGG and MP3 files decoded with ffprobe at approximately **99.31 / 99.34 seconds**. Supplied provenance metadata and open-source font/icon/library licenses are retained. Human listening across devices and legal distribution review before publication remain separate tasks.
- Fixed geometry is batched by material, floor/backsplash tiles are instanced, low graphics reduces resolution and disables shadows, and low-quality initialization disables MSAA. Fast interaction debouncing uses wall-clock time; timed touch input evaluates the displayed marker.

## Remaining limitations

- Chromium was tested. Firefox, Safari, Edge, real Android/iOS devices, screen-reader workflows, and network/GPU performance under real hardware have not been certified.
- No human playtest, sustained mobile frame-rate, thermal, memory-growth, or large-scale concurrency benchmark has been performed. The cloud renderer's timings are not a mobile/desktop FPS claim.
- The successful build reports Vite's large-chunk warning: approximately **833 KB raw / 235 KB gzip** for the combined JavaScript bundle, chiefly the 3D engine and React. Further caching/splitting and device measurements belong before public release.
- Real multiplayer, voice, accounts/progression, production rigging/ragdolls, additional recipes/maps, advanced photo editing, advertising, and payments remain later milestones.
- Project files are prepared locally in an initially empty repository. No commit, GitHub push, hosting deployment, or environment publication was performed. Fresh-task restoration has not been tested.
