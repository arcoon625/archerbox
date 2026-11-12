# Creature Vault

An original solo card pack and collection game at `#play/creature-vault`. It has 24 illustrated creatures across six elements, three themed packs, five rarity tiers, and Standard/Holo/Prism finishes. The artwork is original and the game focuses on collecting rather than battles. HP and power describe the cards. All packs are unlimited and free.

Each pack contains five cards. Slots 1–3: 72% Common, 28% Uncommon. Slot 4: 35% Common, 45% Uncommon, 20% Rare. Slot 5: 70% Rare, 25% Epic, 5% Legendary. After eleven consecutive packs without a Legendary, slot 5 guarantees one. Within a rarity, a pack chooses its featured elements 80% of the time when that rarity has a matching creature; otherwise it chooses from the full rarity pool. Thus any creature can appear in any pack.

Legendary cards are always Prism. Epic cards are 80% Holo and 20% Prism. Rare cards are 50% Standard, 45% Holo, and 5% Prism. Uncommon cards are 85% Standard and 15% Holo. Common cards are Standard. Finishes are cosmetic; the binder retains the best finish found for a creature.

Duplicates increase copy counts and award stardust (5/10/20/50/100 by rarity). Missing cards can be crafted for 30/60/120/250/500 stardust. Crafting never consumes an owned card, cannot be repeated for an owned creature, and waits until the current pack is finished. Crafted Legendary cards are Prism and crafted Epic cards are Holo. Search, element and rarity filters, collected/missing/favorites views, rarity/power sorting, card inspection, favorites, a three-card showcase, and six cosmetic milestones are included.

Cards are awarded once when the pack is opened and saved alongside its reveal state under `archerbox-creature-vault-v1` in localStorage. Refreshing a partly revealed pack restores it without awarding it again. Reveal actions only change reveal flags; finishing only clears the pending pack. Malformed saves are validated against the fixed card catalog. Other tabs on the same origin receive storage updates. This is browser-local progress, not account/cloud storage. A visible warning appears when persistence fails.

Mouse, touch, and native button keyboard interactions are supported. The interface includes reduced-motion support, sounds that can be muted, accessible reveal labels that hide unrevealed card names, and narrow phone layouts. The lobby has a Cards category and supports a per-game format label without changing other games’ 3D labels. A rendered card fan supplies the catalog cover.

Checks: `node --test tests/creature-vault.test.mjs tests/bundle.test.mjs`. The game tests exercise 900 pulls across all packs, every card’s availability, rarity and Legendary guarantees, duplicate dust, repeat-action guards, saved reveals, crafting, finishes, binder filtering, favorites, showcase limits, and malformed saves. Browser QA covered a partial reveal and refresh, all three pack types, duplicate rewards, card inspection, favorite/showcase selection, crafting an undiscovered card, element filtering, and desktop/390px phone layouts.

Artwork assets and the full built-in image generation prompt set are documented in `docs/creature-vault-art.md`.
