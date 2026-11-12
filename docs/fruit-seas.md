# Fruit Seas

A solo 3D pirate RPG at `#play/fruit-seas`, with keyboard, mouse and touch controls.

## Islands and quests

| Island | Unlock | Opponents | Quest money | Per enemy |
|---|---:|---|---:|---:|
| Starter Island | Level 1 | Bandits | $300 | $20 |
| Port Meridian | Level 10 | Harbor smugglers | $700 | $40 |
| Marine Fort | Level 20 | Marines | $1,400 | $70 |
| Ember Cay | Level 35 | Ember fruit raiders | $2,600 | $110 |
| Storm Citadel | Level 50 | Storm fruit adepts | $4,500 | $160 |

Accept a quest from an island captain, defeat five local enemies, and return to that captain. Each claimed quest pays the listed money, one level, three stat points, and one Archerbox coin. Kills before accepting a quest do not count. Quests from another island must be finished there. Ferries offer all five destinations and enforce level gates; travel to unlocked islands is free.

There are six enemies per island. Bandits and smugglers use melee attacks. Marines wear white/blue uniforms, carry flintlocks, and telegraph aimed projectiles. Ember and Storm enemies have distinctive outfits and alternate fruit projectiles with ground eruptions/lightning. Ground warning circles give the player a second to leave the impact area. Shots can be dodged or stopped by buildings. Enemies respawn after nine active world seconds.

## Weapons, fruits and stats

The Port Meridian weapon shop retains the free cutlass, $400 Slingshot, $1,000 Flintlock, and $5,000 Sniper. Ranged weapons have unlimited ammunition with shot cooldowns.

| Fruit | Price | Level | Z | X |
|---|---:|---:|---|---|
| Slow Slow | $600 | 10 | Slow: 8 base damage, 70% slow for 6 seconds | Time Stop: 10 seconds |
| Glacier | $1,800 | 10 | Iceberg: 50 base damage after 0.9 seconds | Frostbite: 10 base damage per second for 5 seconds |
| Ember | $2,800 | 20 | Fireball: 40 base damage | Flame Ring: 65 base damage, 7m area |
| Sand | $4,200 | 20 | Sand Lance: 35 base damage, 3s slow | Sandstorm: 12 base damage per second for 5s, 6m area |
| Storm | $6,500 | 35 | Lightning: 70 base damage | Thunderstorm: 30 base damage per pulse, 3 pulses, 6m area |
| Gravity | $9,000 | 50 | Meteor: 100 base damage after 1.2s, 5m area | Gravity Well: 8 base damage per second for 5s, 7m pull area |

Every **Fruit power point adds two damage to every hit/tick**. For example, ten points makes Iceberg deal 70 damage and Frostbite deal 30 each second, for 150 total. Time Stop remains ten seconds. Fruit points also lower cooldowns by 2% each, capped at 50%. Casts record damage when launched, so upgrading during a paused projectile does not change its stored damage. The fruit shop, bag and tooltips show damage with current stats. Other stats add two cutlass damage, ten max HP, or three ranged damage per point.

Buy a fruit in Port Meridian, then eat it. Owned fruits stay in the bag; switching is free and never resets cooldowns. Slow Slow is the weakest damaging fruit and offers control. Player attacks keep working in Time Stop; enemy movement, enemy projectiles, windups, status timers and respawns freeze. Menus and hidden tabs pause all gameplay.

## Persistence and verification

The new save uses `archerbox-fruit-seas-v2` / version 2. If no new save exists, startup reads the existing `archerbox-fruit-seas-v1` save and migrates it. Earlier levels, money, gear, points, quests and fruit ownership are preserved; the additional enemy roster and absent effect arrays are filled from defaults. The legacy key is left untouched, so an older game tab cannot overwrite the expanded adventure. Ongoing projectiles, hazards, frost damage, meteor damage and time freezes are saved. Defeated players return to their island dock without losing progression. Captains, shops and docks are safe healing zones. Stable voyage/quest receipts prevent duplicate coin payouts.

Run `node tests/fruit-seas.test.mjs`, `node tests/fruit-seas-expansion.test.mjs`, `node tests/bundle.test.mjs` and `node tests/coins.test.mjs`. Expansion checks exercise every quest tier/gate, older-save migration, all eleven damaging fruit moves at multiple stat levels, timed damage, gravity pulls, marine fire, dodgeable fruit warnings, and frozen enemy projectiles. Browser fixtures under ignored `.sites-runtime` use an in-memory save and wallet, never the user's actual game progress.

## Your Archerbox avatar

Fruit Seas uses the saved Avatar Studio look, including skin tone, expression, headwear, face accessories, clothes, footwear and pet. The existing pirate body is the fallback until an avatar is saved. Avatar changes are checked at entry and periodically, including while menus are open. Outfit refreshes keep the current weapon attached to the new right hand; walking, attacking, pets and animated accessories continue to animate. Avatar appearance is read separately from the voyage save, so changing an outfit does not alter levels, money, quests or combat stats. The previous avatar geometry/materials/textures are disposed after moving the weapon to the replacement rig. Run `node tests/fruit-seas-avatar.test.mjs` to check outfit loading, live refresh, fallback, animation and weapon retention.
