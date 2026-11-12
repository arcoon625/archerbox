# Jurassic Island dinosaur models

The six models are original procedurally sculpted game assets. Their colors,
markings and soft tissues are artistic reconstructions rather than claims that
extinct species' exact appearances are known.

The models use closed, smoothly interpolated cross sections, textured skin,
individual teeth and claws, eyelids, jointed legs, distance-driven walking,
breathing, moving jaws, flexible tails, frills, plates and armored scales.
Small static pieces are merged to reduce draw calls. The shared photo texture
is loaded locally, and the field-guide observatory pauses the underlying game.

Anatomical silhouette references:
- https://australian.museum/learn/dinosaurs/fact-sheets/tyrannosaurus-rex/
- https://www.nhm.ac.uk/discover/dino-directory/tyrannosaurus.html
- https://www.nhm.ac.uk/discover/dino-directory/Stegosaurus.html

## Generated skin asset

Mode: built-in `image_gen` image-generation tool.
Saved asset: `public/games/jurassic-island/assets/dinosaur-hide.png`

Prompt:
> Use case: photorealistic-natural. Asset type: seamless square PBR albedo texture for the skin of a living 3D dinosaur, filling the entire image edge to edge. Generate a very high detail orthographic macro scan of dry organic reptilian dinosaur hide: tiny irregular polygonal pebbled scales, small rounded interlocking scales of varied sizes, shallow delicate creases between clusters, scattered pores and tiny healed scratches. Restrained natural muted warm gray and olive-brown colors with gentle mottled pigment variation, no bold stripes or dramatic pattern. Flat, perfectly even diffuse illumination, no directional shadows, no gloss highlights, no baked ambient occlusion, no vignette, no gradient, no depth of field. All skin is sharp. Seamlessly tileable in both directions. No animal silhouette, no eye, no face, no objects, no writing, no grid, no borders. Natural organic photographic detail, not drawn, not plastic, not geometric honeycomb. This image will wrap around sculpted dinosaurs in a game.
