# Alpine Rush

A solo, browser-based 3D skiing game bundled inside Archerbox at `#play/alpine-rush`. Three downhill trails (Sunny Summit, Pine Valley and Frost Peak), four cosmetic outfits, five named CPU rivals, Easy/Pro difficulty, chase/eye-view cameras, pause/restart, touch controls and device-local personal bests by trail and difficulty.

W, Up or Shift tucks; A/D or Left/Right steers across the trail; S/Down brakes; Space jumps; holding Q/E rotates in the air; V switches the camera; R recovers; Escape pauses/resumes. Gates provide a brief speed boost; missing them does not prevent finishing. Snow ramps launch the skier. Each landed half-turn earns 150 style points; style does not alter race placement. Rock bumps briefly slow a skier. Rankings use downhill progress and actual finish time. Easy CPUs move more slowly than Pro CPUs.

The pure rules module owns race progress, steering, collision checks, jump/landing state, gates, scoring and finish order. Rendering uses the existing shared Three.js runtime and the same course coordinate frame. All terrain, skier equipment, pines, chairlifts, gates, ramps and lodge are original code-generated models. No new dependencies or external service is required. Multiplayer is not advertised or enabled for this game.

The cover in `public/assets/alpine-rush.png` is captured from the game's actual scene using its `?cover=1` view. This view hides the menus and selects a thumbnail camera; it does not run a race.

Verification: `node --test tests/skiing.test.mjs tests/bundle.test.mjs`. Browser QA covers setup, keyboard movement, first-person camera, finish results, best times, restart, pause, responsive controls, catalog launch and return to the lobby.
