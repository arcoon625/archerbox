# Ninja Rooftops

Solo 3D rooftop time trial, available from the Archerbox lobby or `#play/ninja-rooftops`.

Three skylines (Sunset District, Neon Heights, Cloud Temple) each have ten rooftops, four saved checkpoints, twenty collectible stars, a tall wall climb, a grapple gap, a moving platform, sweepers, and a finish gate. Easy widens the landing surfaces; Pro uses the narrower route. Personal bests are saved separately for every skyline and difficulty in browser storage. This game does not use Friends multiplayer.

WASD/arrows move relative to the camera. Shift sprints. Space jumps; tap it again against a wall to kick upward. Hold E near a gold ring to swing, then release E or press Space to leap off. Drag to look, V switches camera, R retries from the checkpoint, and Escape pauses. Phone controls provide a movement stick and Run, Grapple, and Jump buttons.

Physics runs at 120 fixed steps per second, independent of rendering. Roof sides collide, descending jumps land on top surfaces, and moving roofs carry the player. Falling or touching a sweeper returns to the saved checkpoint while retaining collected stars and elapsed time. The last checkpoint is required before finishing. A completed run stops the simulation and reports its time, falls, stars, and medal.

Validation: `node --test tests/ninja-rooftops.test.mjs tests/bundle.test.mjs`. The route controller traverses all ten roofs on all six skyline/difficulty combinations using movement, wall kicks, and grapple physics. Additional checks cover jump edges, moving-platform carry, rope constraints and release, checkpoint recovery, stars, medals, and a frozen finish. Desktop and 390px phone layouts were inspected in the in-app browser. The catalog cover is a screenshot of the actual game scene.
