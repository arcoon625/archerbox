# Laser Maze

First-person 3D obstacle adventure at `#play/laser-maze`. Training Vault, Prism Lab and Reactor Core use three deterministic, connected mazes with progressively more lasers. Each has cyan and amber keycards, a locked exit, checkpoints and laser relays.

W/S or up/down move forward and backward. A/D or left/right steer the camera smoothly; the phone joystick uses the same steering. Mouse dragging still looks around, Space jumps, holding C/Ctrl crouches, Shift runs, E uses a nearby relay, Q uses EMP, M toggles the map, R recovers to a checkpoint and Esc pauses. Phones have a movement joystick, drag-to-look, jump, a crouch toggle, relay button and a tappable EMP button.

Easy has route arrows and slower scanners. Expert has faster scanners, no arrows and a longer EMP cooldown. A relay disables every laser for seven seconds. EMP gives 4.5 seconds with an 18-second cooldown on Easy, or three seconds with a 24-second cooldown on Expert. Low beams can be jumped, high beams can be ducked, and pulse gates have safe off windows. Rotating and moving-height beams add variety.

Zaps add three seconds and restore the latest checkpoint without losing cards. Retries are unlimited. All movement and damage use fixed simulation steps. Pausing freezes the simulation, and completed runs cannot change or award again. Completing a mission earns one Archerbox coin through the shared wallet. Best times and medals save per mission and difficulty in this browser.

Validation: `node tests/laser-controls.test.mjs`, `node tests/laser-maze.test.mjs`, `node tests/laser-models.test.mjs`, `node tests/coins.test.mjs`, and `node tests/bundle.test.mjs`. An autonomous controller completes all six mission/difficulty combinations through normal movement, relay and EMP timing. Independent checks cover jump and crouch clearance, pulse windows, cooldowns, walls, reachable cards and exits, checkpoint recovery, frozen results, rendering bounds and reward deduplication. Desktop jumping/crouching and 390px phone controls were checked in the browser. The lobby cover is a screenshot of the actual game scene.
