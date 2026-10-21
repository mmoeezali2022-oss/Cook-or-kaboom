# Asset provenance

| Asset | Origin | Use / limitation |
| --- | --- | --- |
| Kitchen, chefs, ingredients, and particles | Original procedural geometry in `src/game/models.ts` / `engine.ts` | No third-party models or textures. Prototype meshes, not the reference illustration itself. |
| Pancake and character UI illustrations | Original SVG in `src/components/Artwork.tsx` | Original vector drawings made for this build. |
| Favicon / logo treatment | Original SVG and text treatment | Working project identity. |
| The Wobbly Whisk OGG / MP3 | User-supplied `Cook_or_KABOOM_Game_Music_Pack.zip` | Integrated locally with loop and independent volume. Source README says original waveform/noise synthesis without third-party samples. That claim has not been independently audited; confirm distribution rights before public release. Source metadata retained in `public/audio/SOURCE.txt`. |
| Design and character direction | User-supplied `Cook_or_KABOOM_Game_Design_Document_v1.pdf` | Read as supporting reference. The approved illustration on page 4 guided chef proportions/palette. The PDF and its illustrations are not redistributed in the public bundle. |
| Gameplay / UI sounds | Original Web Audio oscillator and filtered-noise synthesis | No external samples or voice recordings. |
| Three.js / React / React DOM | npm packages | MIT licenses retained in `public/licenses/`. |
| Lucide icons | `lucide-react` | ISC license; retain upstream license in dependency distributions. |
| DM Sans, Fredoka, Fraunces | `@fontsource` packages, bundled locally | SIL Open Font License. License files are included under `public/licenses/`. |

No AI image generation, commercial asset purchase, external soundtrack, or extracted copyrighted character was used. The WAV master, MIDI, and preview MP3 remain in the supplied attachment and are not shipped to browsers. Only the two web playback formats (approximately 3.76 MB total) are included.
