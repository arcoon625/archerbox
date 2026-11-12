# Disaster Island

Solo 3D survival adventure at `#play/disaster-island`, with seven named CPU survivors. Palm Bay, Harbor Point and Summit Camp have different landmark layouts and a natural high ridge, climbable lookout stairs, cabins and a concrete shelter.

A Surprise expedition shuffles four different disasters. Individual disaster selections run one practice round. Each round gives ten seconds to prepare, then 36 seconds of Easy weather or 42 seconds on Storm. Surviving earns one Archerbox coin. A lost round can continue to a fresh round, and final records save per island, selection and difficulty in this browser.

- Flood: water rises, submerged heads deplete air, then health. High terrain and lookout platforms stay above the flood.
- Tornado: a visible moving funnel pulls and lifts nearby actors and can destroy wooden buildings. Concrete shelter reduces wind damage.
- Meteors: warning circles precede impacts. Roofs absorb hits, but repeated impacts can destroy them. CPUs try to find cover and avoid visible warning zones.
- Earthquake: buildings flash amber before collapsing. Their physical collision and roof support disappear when destroyed, so actors fall. Nearby debris and long falls can cause damage.

W/S or up/down move, A/D or left/right steer the camera, Space jumps, Shift runs, mouse dragging looks, V changes chase/eye view, and Esc pauses. Touch controls provide a steering joystick, run toggle, jump and camera buttons. Health, air, a map, safety beacons and first-aid kits help players react.

Validation: `node tests/disaster-island.test.mjs`, `node tests/disaster-models.test.mjs`, `node tests/coins.test.mjs`, and `node tests/bundle.test.mjs`. A test player survives all 24 island/disaster/difficulty combinations through movement. Separate cases check unsafe flood positions, actual tornado damage and lift, intact and broken roof cover, falling supports, wall collision, jump edges, four-round reset, frozen results and deduplicated survival rewards. The catalog cover is a screenshot of the actual game scene.
