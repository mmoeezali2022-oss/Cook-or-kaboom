# Architecture, deployment, and next milestones

## First-playable boundaries

React handles menus and text HUDs; Three.js owns the scene and frame loop. The engine emits a compact UI view at roughly 12 Hz so gameplay does not rerender React on every frame. Recipe logic is a pure reducer with explicit actions and is independent of the renderer. Player movement is responsive and collision-checked; visual wobble never randomizes the input.

The game stores no server data. Recipe state is held in memory, preferences are validated before loading from `cok-settings-v1`, and local storage failure falls back to session preferences. Photo exports are rendered locally at the requested aspect ratio/resolution and never uploaded. Static React content does not use `dangerouslySetInnerHTML`. No keys, accounts, microphone permission, analytics, or ads are configured.

Geometry and shader materials are intentionally simple. Floors and backsplash tiles use instancing. Shadows and pixel ratio scale with graphics quality; the low profile disables shadows and reduces particles. Both compressed soundtrack formats are available, with the browser selecting one. Loading music starts only on a user gesture. Real-device frame pacing, thermal behavior, and touch ergonomics need testing before broad mobile claims.

## Static deployment (manual, not performed)

`npm ci && npm run build` creates `dist/`. Deploy that directory to a static host over HTTPS; no Node runtime is required for this solo version. There are no external runtime assets, font CDNs, private APIs, or environment variables. A free static hosting tier can be sufficient for initial testing within its bandwidth limits. No hosting account was configured or charged.

Before a public release:

- Confirm rights to distribute the supplied music and final character assets.
- Choose the production origin, add its real canonical URL, sitemap and robots policy, and review public legal/contact content for the actual operator. Those details are not invented in this build.
- Test Chrome/Edge/Firefox/Safari and real Android/iOS devices; verify audio autoplay, WebGL fallback, downloads, native sharing, screen readers, and touch ergonomics.
- Use standard host security headers, HTTPS, correct content types, compression, and immutable caching for hashed assets. Keep `index.html` revalidated. A static-only version needs no cookies or credentials.
- Do not add ad scripts until eligibility, privacy/consent, age treatment and placements are reviewed. Nothing in this build establishes AdSense approval.

A production CSP must account for bundled fonts, same-origin media, inline Three.js canvas styles, generated `data:` PNG previews, and browser-native file downloads. Apply and test a policy on the chosen host rather than copying an untested header.

## Next: real two-player kitchens

Do not synchronize client-reported scores or blindly relay transforms. Introduce a Node/TypeScript room service (Colyseus or equivalent) as a separate module. Keep renderer inputs separate from the pure recipe rules and move critical actions to the authoritative server.

1. Version the protocol and validate every message. Server owns stations, ingredient ownership, cooking timers, recipe progression, prank settings/cooldowns and score. Add caps on action rate, message size and movement speed.
2. Use cryptographically random invitation tokens, room capacity limits, per-connection authentication, private room access checks and idle cleanup. Never publish private room state in listings.
3. Predict local movement, reconcile to server state, interpolate other chefs, and use server-monotonic cooking time. Test simultaneous pickups, disconnects, host departure, reconnection and expired invitations.
4. Run two separate clients against the real backend, cook a complete round together, then test latency and dropouts before calling multiplayer complete.
5. Add voice only after networking works. WebRTC requires explicit mic opt-in, signaling, mute/deafen, per-player controls, and tested STUN/TURN connectivity. TURN credentials must be short-lived; hosting/relay traffic may have recurring costs. No voice services are configured now.

Production skinned models can replace the articulated procedural chef groups while keeping the movement/input and recipe interfaces. Proper Rapier-based controlled slips and rigid-body props can then replace the deliberately bounded prototype effects without changing recipe validation.

## Content roadmap

First improve human playtest observations and device performance. Then ship two-player invite rooms, fuller facial/hand animation, an accessible remapping system, and richer photo camera controls. Additional recipes, cultural food content, progression, public social features, ads, and purchases come after the shared kitchen is reliable and fun. No paid infrastructure has been provisioned.
