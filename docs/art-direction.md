# Art direction and generated image provenance

Generated on 2026-09-06 with the built-in OpenAI `image_gen` tool, default built-in mode. Both raster assets were generated as new images, visually inspected, and copied into the project. No reference images, CLI/API fallback, external stock images, or Blender were used in this asset task.

## Assets

- `public/assets/arrakis-concept.png` — 1672 × 941 cinematic concept/title background.
- `public/assets/sand.png` — 1254 × 1254 fine warm sand base-color texture.

## Translation from concept to playable geometry

The concept's focal outpost is built from three progressively smaller stacked cylinders, in rough beige/ochre concrete. The broad lower cylinder has a thick rectangular entrance portal and a short sand-level ramp. Tiny dark horizontal slit windows and shallow panel seams establish scale. A slim antenna rises from the small top drum. Recreate these silhouettes in geometry rather than using the concept as a substitute for the actual 3D scene.

The aircraft has a long dark angular faceted fuselage, nearly black cockpit recesses, low articulated landing legs, and very long thin mechanical wings radiating from side hubs. The concept produced more than four wing-like spars; the in-game model should use the requested four principal wings for a cleaner silhouette.

The backdrop is an ensemble of dark burnt-ochre mesas with repeated horizontal strata and stepped tapering sections. Distant towers are lighter and less saturated under atmospheric haze. Sand forms gentle amber ridges. A low sun casts long shadows toward the foreground-left. Keep the traveller small against the architecture, in a dark sand-colored stillsuit with a draped cloak.

Suggested material colors: sand #C68B47, sunlit sand #E2AD64, concrete #9E7D51, mesa #795034, shadow rock #3F2D24, aircraft #302E28, dark metal #1F2425. Use warm key lighting, muted ambient illumination, high roughness, restrained bloom, and fine airborne dust.

The generated sand texture has even diffuse lighting and subtle curved low-contrast ripples. It was requested as seamless; exact edge continuity has not been mathematically guaranteed. Repeating at fine scale with additional procedural terrain displacement or procedural detail can reduce visible repetition.

## Concept generation prompt

```text
Use case: stylized-concept
Asset type: cinematic title-screen background and 3D modelling reference for a short isometric Dune-inspired role-playing game.
Primary request: a desolate Arrakis desert outpost at sunset, visually spectacular and physically believable. A sand-colored brutalist round outpost stands in front of tall stepped dark ochre rock formations. A grounded dark ornithopter has an elongated angular fuselage and four clearly visible extremely slender long mechanical wings. One lone stillsuit traveller stands on the rippled sand near the outpost.
Scene/backdrop: huge burnt amber dunes, monumental weathered mesa silhouettes receding into dusty atmosphere, an enormous empty desert under a dim pale sandy sky.
Style/medium: cinematic realistic game environment concept art, photoreal PBR material detail, exquisite composition, tangible scale, restrained science-fiction design.
Composition/framing: wide panoramic 16:9 landscape, slightly elevated oblique camera, outpost and aircraft toward center-right, lower-left region quiet enough for interface overlay, horizon near upper third.
Lighting/mood: dusty amber sunset from upper right, long deep rust shadows, softly glowing haze and airborne sand, dramatic but readable.
Color palette: antique gold sand, burnt ochre stone, dark charcoal aircraft, muted beige architecture, pale warm sky; no blue lights.
Materials/textures: fine wind-rippled sand; rough cast earthen concrete with recessed entrance and narrow slit windows; heavily weathered stratified rock; matte dark metal aircraft.
Constraints: architecture must be buildable from simple coherent 3D volumes; aircraft silhouette must read clearly; no text, captions, logos, watermark, UI, borders, guns in foreground, extra people, futuristic skyscrapers.
```

Original built-in output:
`C:\Users\MilanPincar\.codex\generated_images\01a0774a-d8f2-7190-bfc6-bd0f2a8c2cb9\exec-fe3bec0f-83f4-4a88-a14c-21ced6e951fb.png`

## Sand generation prompt

```text
Use case: stylized-concept
Asset type: seamless tileable square desert sand base-color texture for a Three.js PBR terrain material.
Primary request: top-down orthographic photograph of very fine warm golden desert sand, full frame, featuring subtle small wind ripples and a realistic fine grain. This texture will repeat across a large terrain, so make all four edges seamless and the pattern restrained.
Style/medium: photoreal scanned material texture, entirely flat 2D base-color map, premium video game environment surface.
Composition/framing: square, camera looking exactly straight down; uniform scale everywhere, no perspective.
Lighting/mood: entirely diffuse neutral even illumination, no directional light and no baked shadows, consistent brightness across the image.
Color palette: light warm golden ochre with subtle beige variation, low contrast.
Materials/textures: fine clean dry sand, low amplitude gently curved wind ripple pattern, minute natural grain.
Constraints: seamless tileable left-to-right and top-to-bottom; no rocks, objects, footprints, plants, text, logos, UI, watermark, horizon, large dune ridges, large dark areas, strong highlights or shadows.
```

Original built-in output:
`C:\Users\MilanPincar\.codex\generated_images\01a0774a-d8f2-7190-bfc6-bd0f2a8c2cb9\exec-21f42b30-31a5-4f29-bb06-a16a43420e3d.png`

## Additional sandstone surface

- `public/assets/rock.png` — 1254 × 1254 warm eroded sandstone base-color texture, generated on 2026-09-06 using the built-in OpenAI `image_gen` tool in default built-in mode. No reference images or CLI fallback were used.
- Inspected visually: horizontal ochre sediment bands, natural small fractures, fine grain, and moderately restrained contrast. Suitable for cliff surface detail with triplanar projection; requested seamless, but exact edge continuity has not been mathematically guaranteed.

### Sandstone generation prompt

```text
Use case: stylized-concept
Asset type: seamless tileable square sandstone rock base-color texture for triplanar mapping on Three.js desert cliffs.
Primary request: photoreal warm brown and ochre eroded sandstone rock face, with fine predominantly horizontal sediment striations and naturally irregular small hairline cracks. The surface should look genuinely weathered and ancient while maintaining restrained contrast for use on many differently shaped cliff meshes.
Style/medium: high-quality scanned physically based game material texture; flat 2D base-color map only.
Composition/framing: square image filled edge to edge with continuous rock surface, flat orthographic front view, no perspective, consistent texel scale, all four edges seamlessly tile.
Lighting/mood: perfectly even diffuse neutral illumination, no directional lighting, no baked highlights or cast shadows, consistent brightness.
Color palette: muted medium warm ochre-brown, toasted umber sediment bands, subtle dusty sandstone tan variation.
Materials/textures: fine horizontal sediment layers with naturally irregular fractured edges, micro-pitting, erosion, fine cracks and subtle small color variation; low-to-medium contrast, tactile geological detail.
Constraints: seamless left-to-right and top-to-bottom, no objects, stones lying on surface, sand floor, sky, horizon, plants, fossils, text, logos, UI, watermark, large holes, deep black crevices, visible shadows, or bright specular highlights.
```

Original built-in output:
`C:\Users\MilanPincar\.codex\generated_images\01a0774a-d8f2-7190-bfc6-bd0f2a8c2cb9\exec-fc442823-473e-4c58-bc90-bd7dcc29c908.png`

