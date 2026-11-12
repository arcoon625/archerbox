# Avatar realism update

The avatar now uses an adapted, cropped version of the Infinite 3D head scan by Lee Perry-Smith (CC BY 3.0), with its bundled color and tangent normal maps. Shader-based eye openings add detailed irises and corneal highlights while retaining the scan’s eyelids and automatic blinking. The neck is tapered and its material blends into the selected body tone. Six expressions and all eight saved skin colors remain supported. Hair has a fitted scalp, 1,000 fine swept strands and sideburns. Skin uses smaller pore relief; fabric uses a soft sheen. Baseball caps now have a fitted crown, curved stitched bill and embroidered badge.

The rig and its wardrobe are remapped together to give the avatar longer legs and a smaller head. All 300 existing items keep their IDs, colors and attachment positions. Head, hair and accessories share a head pivot. Saved outfits, avatar storage, prices and purchased items do not change. Pets retain their existing shapes.

The studio has neutral fill, a warm key and a rim light, a larger preview and Full body / Face close-up camera buttons. Dragging, zooming, expressions, poses, purchases and saving remain available. Portrait cropping includes instanced hair and eyebrows. The head geometry and credited source textures are bundled with the site. No third-party servers are used at runtime. Skin textures preload in the editor; games use shaded geometry until their local texture request finishes, and stale requests do not attach textures to disposed models. The remaining wardrobe and hair geometry are generated locally.

The same model loads in Fruit Seas, Hide and Seek and Color Rush. Fruit Seas uses remapped hand mounts to keep equipped weapons in the hand. Outfit disposal releases instanced graphics buffers and all unique textures/materials/geometries; game cleanup calls the same shared disposal function.

Verification:

- `tests/avatar.test.mjs`: every one of the 300 catalog items, 50 complete outfits, finite geometry, storage, search, material and torso normal checks.
- `tests/avatar-realism.test.mjs`: all skin tones and expressions, proportions, irises, blinking and walking, hand mounts, finite instance matrices, a rendering budget, resource disposal and hair visibility in portrait previews.
- `tests/fruit-seas-avatar.test.mjs`: saved looks, fallback, live outfit changes, equipment retention and the real shared model.
- Local browser checks for face/full-body views, headwear removal, a darker skin tone, waving, hair fit and avatar saving. The QA editor uses in-memory storage to leave the user's saved wardrobe untouched.

The retry also tapers full-length trousers around the knees and ankles, reshapes their printed panels to the fabric and retains common thumbnail shaders to reduce repeated compilation. Source credits, the original license and a description of modifications are in `public/avatar/assets/ATTRIBUTION.md`; the studio links to these credits. Geometry data is a synchronous typed-array module, so all existing game avatar builders retain their synchronous API.
