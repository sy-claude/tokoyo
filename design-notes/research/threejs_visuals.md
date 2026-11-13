# Japanese-mythology visual style in Three.js (WebGLRenderer), procedural-only, 60 fps on iPhone 12 / Pixel 6 class

Scope note: about 21 tool calls. Several primary pages failed to load: the Codrops PS1 article returned a client error, the Opera drum-synthesis article now redirects to a blog index, the Google Fonts license page had no license text, and the Bugnet article was an index page. Where a recipe below comes from implementer knowledge and not from a fetched source, it is placed under **Inferences** and marked "(implementer knowledge, verify)". The report writer should treat those as engineering recommendations, not cited facts.

---

## 1. Stylized shading options feasible on mobile (toon/cel, outlines, rim, sumi-e/ukiyo-e, paper, Ōkami-like, PS1, fog, sky, water)

### Takeaway
The cheapest robust base is cel/toon shading: MeshToonMaterial with a 2–3-texel gradientMap, or a small custom ramp shader. Add inverted-hull outlines (one extra draw per outlined mesh, no post pass) and a fresnel rim term. Screen-space edge detection and painterly post filters (Kuwahara) each cost a full-screen pass, which is the expensive part on phones. A PS1 look (vertex snapping plus a low-res render target) is a viable and even cheaper alternative, because it renders fewer pixels.

### Cited Findings
- MeshToonMaterial takes a `gradientMap` that is "a 2 or 3 pixel gradient" and quantizes lighting into bands. Custom shaders sample a 1D ramp with N·L, e.g. `texture(uRamp, vec2(NoL, 0.5))`. Bands can be hard two-tone, soft three-band, or include a rim-colored blush. — [Three.js From Zero s4-09 Stylized NPR](https://masterallarts.pages.dev/learn/threejs-from-zero/s4-09-stylized-npr/)
- Cel shading is described as "dead cheap and forgiving on low-end devices." — [Three.js From Zero s4-09](https://masterallarts.pages.dev/learn/threejs-from-zero/s4-09-stylized-npr/)
- Inverted-hull outline: render the mesh a second time with `material.side = THREE.BackSide`, push vertices out along the normal by the outline width, and fill black. Pros: one extra draw call, no post-processing. Cons: uniform width, and it can misbehave on sharp concave features. — [Three.js From Zero s4-09](https://masterallarts.pages.dev/learn/threejs-from-zero/s4-09-stylized-npr/)
- Screen-space edge detection compares neighboring depth and normal samples (Sobel or a cross pattern) and thresholds the result. It costs an extra full-screen post-process pass and is recommended when precision is needed. — [Three.js From Zero s4-09](https://masterallarts.pages.dev/learn/threejs-from-zero/s4-09-stylized-npr/)
- Rim light: `float rim = pow(1.0 - max(dot(N, V), 0.0), 2.0);` added as `rim * uRimColor * uRimStrength`. It is called a major stylistic cue for anime close-ups. — [Three.js From Zero s4-09](https://masterallarts.pages.dev/learn/threejs-from-zero/s4-09-stylized-npr/)
- Painterly options: a Kuwahara post filter samples four quadrants and outputs the mean of the lowest-variance one, which gives painterly blobs. Hatching blends four line-density textures by N·L band. For ink-wash looks, multiply the final color by a paper-grain texture. — [Three.js From Zero s4-09](https://masterallarts.pages.dev/learn/threejs-from-zero/s4-09-stylized-npr/)
- A sumi-e-in-3D case study (Unity/HLSL) used two approaches:
  - Voronoi-noise-perturbed lighting remapped through a six-step color ramp to make ink-like bands.
  - A simpler **unlit two-color vertical gradient** (light tint to dark tint, with band center and thickness) plus a paper-texture overlay.

  The Voronoi approach was dropped because it needed clean topology/UVs and caused shadow artefacts. The unlit gradient approach was simpler to produce. — [Forgotten Colors: capturing sumi-e in 3D](https://bentobaux.github.io/posts/forgotten-colors-capturing-sumi-e-in-3d)
- PS1 affine texture mapping in Three.js: a forum thread shows a vertex/fragment pair passing `uv * gl_Position.w` and dividing by `w` per fragment. An earlier attempt using `gl_Position /= gl_Position.w` glitched when vertices were off-screen. Caveat: the extraction model noted this snippet is mathematically equivalent to perspective-correct interpolation, so it may *not* produce the affine wobble. The reliable route is a `noperspective` varying (GLSL ES 3.0 / WebGL2), or passing uv unchanged with a manual correction removed. Test this. — [three.js forum: Affine Texture Mapping (PS1-style)](https://discourse.threejs.org/t/affine-texture-mapping-in-shader-ps1-style-graphics/5945)
- Existing PS1 resources for Three.js:
  - A Codrops tutorial "How to Create a PS1-Inspired Jitter Shader with React-Three-Fiber" (2024). The page failed to load, so its contents are not verified.
  - An npm package `playshader-one` ([npm](https://www.npmjs.com/package/playshader-one), [GitHub](https://github.com/BucketOSoftware/playshader-one)).
  - A gist by bandinopla ([gist](https://gist.github.com/bandinopla/497bcd86ba2bb662e0ab4cb47190748e)).

  Source: [Codrops PS1 jitter](https://tympanus.net/codrops/2024/09/03/how-to-create-a-ps1-inspired-jitter-shader-with-react-three-fiber/)
- Codrops (Sept 2026) published "Still: From Akira to Ink Wash, Building a Generative Garden in WebGPU". It is a recent ink-wash web reference, but it targets WebGPU, not WebGLRenderer. The page was not fetched. — [Codrops 2026](https://tympanus.net/codrops/2026/09/09/still-from-akira-to-ink-wash-building-a-generative-garden-in-webgpu/)
- Ōkami-style looks are being reproduced by indie developers and in Blender, which shows art-community interest. No WebGL-specific implementation was found. — [80.lv Okami-style sumi-e RPG](https://80.lv/articles/how-okami-style-traditional-sumi-e-art-brings-this-action-rpg-to-life/)

### Inferences
Items marked (IK) are implementer knowledge; verify them.

**Recommended primary look: "Sumi-e cel" (Ōkami-lite).** Each part is chosen so that the per-pixel cost stays small:
1. **Cel shading.** Use a custom `ShaderMaterial`, or `MeshToonMaterial` + `gradientMap`, with the gradient as a `DataTexture` of 3–4 texels and `minFilter = magFilter = THREE.NearestFilter`, `generateMipmaps = false`. Without Nearest filtering, the bands blur (IK). Build the DataTexture in code, e.g. `new Uint8Array([60, 160, 255])` with `RedFormat`, so no image file is needed (IK).
2. **Inverted-hull outlines.** Put them only on hero and enemy meshes and on large props. Use a shared black `MeshBasicMaterial({side: BackSide})` with an `onBeforeCompile` (or custom vertex shader) that does `position + normal * width`. Scale the width by view-space depth to get roughly constant pixel width (IK). Outlines double the draw calls of outlined meshes, so merge static props first. Three.js also ships `OutlineEffect` (examples/jsm/effects/OutlineEffect.js), which automates inverted hull for all materials. It is easy, but it renders the scene twice (IK).
3. **Rim/fresnel.** One `pow(1-N·V, k)` term (cited formula above). Use warm vermilion or gold for heroes and cyan for yokai.
4. **Paper grain.** Apply it in the final composite. The cheapest way is no post pass at all: add a screen-space term in every material via a shared GLSL chunk, `col *= 0.92 + 0.08 * hash(gl_FragCoord.xy * 0.5)` plus a low-frequency value noise for fibers (IK). Alternatively, use a full-screen quad with `MeshBasicMaterial` + a CanvasTexture of noise, `blending = MultiplyBlending`, drawn last. That is one cheap pass with no render target (IK).
5. **Ink bands.** Use a 3-step ramp from paper-white (#f2ead8) to ink (#1a1a1a), with a single accent hue per element (vermilion torii, gold, five-element colors). Low saturation plus limited accents reads as ukiyo-e/sumi-e and hides low poly counts.
6. **Gradient sky.** Use a large sphere (BackSide, `depthWrite=false`) with a fragment shader mixing 2–3 colors by `normalize(vWorldPos).y`. Optionally add a procedural sun disc and fbm clouds banded in ukiyo-e style. It is one draw call (IK). Three.js's `Sky` addon (examples/jsm/objects/Sky.js) is physically based and heavier; avoid it for this style (IK).
7. **Fog.** Built-in `scene.fog = new THREE.Fog(color, near, far)` is essentially free and works with built-in materials. Custom ShaderMaterials need `fog: true` + `#include <fog_pars_fragment>` / `<fog_fragment>`, or a hand-rolled fog (IK).
   - Height fog (mist in valleys, sumi-e "ma" negative space) works as a custom term: `fogAmt = smoothstep(far0, far1, dist) * exp(-max(worldY - h0, 0.0) * k)`. Inject it via `onBeforeCompile` into toon materials (IK).
   - Fog color = paper color is the single biggest "ink painting" cue, because distant mountains fade to paper (IK).
8. **Stylized water.** Use a flat plane with a vertex sine displacement (2–3 summed waves), a fresnel-based color mix, and toon-quantized specular. Add foam lines from `fract(dist * k - time)` near shore using a precomputed depth attribute, avoiding depth-texture reads, which cost a pre-pass. Skip `Water`/`Water2` addons: they use reflection render targets and are expensive on mobile (IK).
9. **Post-processing.** If used, use one combined pass (e.g. outline edges + vignette + grain in a single ShaderPass), not stacked EffectComposer passes. Each pass is a full-screen read/write; at DPR 1.5 on a 390×844 pt phone, that is about 585×1266 ≈ 0.74 MP per pass (IK).

**Alternative look: PS1 / "haunted retro."**
- Render to a `WebGLRenderTarget` at about 320×240–480×270 with NearestFilter, and blit it upscaled. Add a 4×4 Bayer ordered dither and color quantization (e.g. 5 bits per channel) in the blit shader.
- Snap vertices in the vertex shader: `vec4 p = projectionMatrix*mv; p.xy = floor(p.xy/p.w * res*0.5)/(res*0.5) * p.w;`.
- Use a `noperspective` varying for affine UVs (WebGL2 supports GLSL ES 3.00 `noperspective`, and three r18x uses GLSL3 when `glslVersion: THREE.GLSL3`). Large ground polygons must be subdivided, or affine warp gets extreme (IK).
- This is the *cheapest* option for fill-rate, because it shades about 0.1 MP instead of about 0.7–1 MP. It pairs well with yokai horror tone, but conflicts with an elegant sumi-e brand. Pick one look per project.

**Ukiyo-e flavor.** Use flat unlit fills with outlines, a posterized palette (indigo/Prussian blue, vermilion, ochre), gradient bands on sky and water (bokashi gradients), and stylized wave crests as instanced curved planes. This is mostly palette and gradient choice on top of the cel pipeline (IK).

### Gaps
- No measured mobile frame-time numbers were found for inverted hull vs. Sobel post vs. OutlineEffect on iPhone 12 or Pixel 6. The cost ranking above is qualitative.
- The Codrops PS1 tutorial content (exact snapping code) was not retrievable.
- No open-source WebGL Ōkami-like project with a verifiable code base was found in this pass.

---

## 2. Procedural modeling of Japanese environment props (torii, shimenawa, tōrō, iwakura, shinboku, shrine buildings, terrain, bamboo, petals)

### Takeaway
Build every prop from Three.js primitive geometries (Box, Cylinder, Cone, Torus, Tube/CatmullRom, Lathe, Extrude) in a factory function. Bake transforms into one geometry via `BufferGeometryUtils.mergeGeometries` with vertex colors, so each prop type is one draw call. Use `InstancedMesh` for repeats (lantern rows, bamboo, trees, rocks, petals).

### Cited Findings
- `mergeBufferGeometries` was renamed `mergeGeometries` in BufferGeometryUtils. — [Three.js Journey: Performance tips](https://www.threejs-journey.com/lessons/performance-tips)
- Instancing renders repeated objects in a single draw call with `InstancedMesh`, but only when geometry and material match. — [Codrops: Building Efficient Three.js Scenes (2025)](https://tympanus.net/codrops/2025/02/11/building-efficient-three-js-scenes-optimize-performance-while-maintaining-quality/)
- The sumi-e case study found that procedurally generated coordinates computed across merged children caused artefacts. Per-object static merging fixed it. Lesson: compute per-part attributes such as gradients *before* merging. — [Forgotten Colors](https://bentobaux.github.io/posts/forgotten-colors-capturing-sumi-e-in-3d)

### Inferences
Recipes (IK). All dimensions are in meters, assuming the player is about 1.7 m tall.
- **Torii (myōjin style).**
  - Two pillars: `CylinderGeometry(0.25, 0.3, 4, 12)`, slightly tapered and leaned inward about 2° (rotation.z ±0.035).
  - Kasagi (top lintel): a Box 6.2×0.3×0.45 bent upward at the ends. Either use a subdivided Box and displace y by `k*x^2` in a loop over position attributes, or extrude a curved `Shape`.
  - Shimaki: a second Box under the kasagi.
  - Nuki (lower tie beam): Box 5.6×0.22×0.18, protruding past the pillars.
  - Gakuzuka (center strut) and a small gaku plaque. Draw the plaque's text on a CanvasTexture.
  - Base rings (kamaki): black short cylinders.
  - Use vertex colors: vermilion #c8102e / #d23a1e, black kasagi #1b1b1b.
  - Merge everything into one geometry: about 300–600 triangles, one draw call. Rows of torii (Fushimi Inari tunnel) are InstancedMesh, so 100 gates = 1 draw.
- **Shimenawa (sacred rope).**
  - Make a `CatmullRomCurve3` that sags like a catenary between two points, and build a `TubeGeometry(curve, 64, r, 8)`.
  - Get the twisted-straw look by modulating the tube radius with `sin(u*N + angle*2)`, or by twisting 2–3 thinner tubes around the curve with phase offsets.
  - Shide (zig-zag paper streamers): flat white planes built as a 4-segment zig-zag `Shape` → `ShapeGeometry`, instanced along the rope.
  - Hanging straw tassels (kiri-sagari): thin cones.
- **Tōrō (stone lantern, kasuga style).** This is a vertical stack:
  - kiso (hexagonal base): `CylinderGeometry(r, r, h, 6)`
  - sao (pillar)
  - chūdai (middle platform)
  - hibukuro (light box): hexagonal, with emissive window faces
  - kasa (roof): `ConeGeometry(…, 6)` with flared edges from a `LatheGeometry` profile
  - hōju (jewel finial): a sphere with a pointed top from a Lathe

  Use grey vertex colors with per-vertex noise darkening (moss: green tint where normal.y>0.7). A warm point light per lantern is too expensive on mobile. Instead, use emissive window faces plus an additive glow sprite (IK).
- **Iwakura / megaliths.** Start from an `IcosahedronGeometry(r, 2–3)`. Displace vertices along the normal by 3D fbm noise (simplex), stretch non-uniformly, then call `computeVertexNormals()`. Flat shading (`flatShading: true`) reads as hewn stone and needs no normal maps. Tie a shimenawa around the largest rock. 5–10 variants instanced with random rotation/scale cover a whole field.
- **Shinboku (sacred tree).**
  - Trunk: a `TubeGeometry` along a noise-perturbed CatmullRom curve with radius decreasing by height, or a `LatheGeometry` with a wobble.
  - Roots: 4–6 small tubes splaying out.
  - Canopy: 5–12 displaced icosahedron "cloud puffs" (toon-shaded, flat, dark green), or alpha-tested billboard cards.
  - Wrap a shimenawa around the trunk.
  - Keep it to about 2–4k triangles total; it is a landmark.
- **Shrine building (honden / haiden).**
  - Base platform and posts: Boxes and Cylinders.
  - Walls: Boxes.
  - Irimoya/kirizuma roof: an `ExtrudeGeometry` of the roof cross-section `Shape` (curved eaves using quadraticCurveTo) extruded along the building length. A hip roof uses two extrusions mitred, or a custom BufferGeometry.
  - Chigi (crossed rafters) and katsuogi (logs on the ridge): Box/Cylinder instances.
  - Stairs: a loop of Boxes, merged.
  - Target total: about 2–5k triangles, one draw call per material.
- **Mountains/terrain.**
  - Use `PlaneGeometry(size, size, 128, 128)` rotated −90° X. Displace y with fbm or ridged noise (`1-abs(noise)`) in JS at load. Compute vertex colors by height/slope: rock grey on slopes, moss green on flats, white snow above a threshold.
  - Far "sumi-e mountains" are cheaper as 3–5 layered silhouette planes or ribbons at increasing distance. Use a ridged 1D noise profile, unlit, colored by fog/paper gradient (classic ink-wash depth layering). Each layer is one draw call and has no overdraw issue if opaque.
  - Use a JS simplex noise implementation inline (about 100 lines). The `simplex-noise` npm package is MIT, but writing it in code avoids dependencies.
- **Bamboo.** Use one segmented `CylinderGeometry` per culm with node rings (thin `TorusGeometry` or a radius bump every 0.4–0.6 m) and a slight lean. Instance 200–500 culms with `InstancedMesh`, using random height, lean, and color jitter via `instanceColor`. Leaves: instanced crossed quads clustered at the top, alpha-tested from a CanvasTexture leaf shape. Sway: in the vertex shader, offset by `sin(time + instancePhase) * height^2` (wind) via `onBeforeCompile` on the instanced material.
- **Falling petals/leaves (sakura, momiji).**
  - Use one `InstancedMesh` of a tiny petal geometry (2-tri quad, or a 4–6-tri folded petal) with 300–1000 instances.
  - Animate entirely in the vertex shader: `pos = base + vec3(sin(t*a+phase)*amp, -mod(t*fall + phase, H), cos(...))`, plus rotation by time. CPU cost is then zero per frame.
  - Use opaque or alpha-test, not blended, to avoid overdraw sorting. Pink #f6c1cc with a darker center (sakura). Red/orange for momiji in an autumn level.
- **Grass/ground cover.** Use instanced blades with a vertex wind shader. Limit to about 5–20k blades on mobile, near the camera only (IK; no source).

### Gaps
- No published three.js torii/shrine generator repository was located in this pass. Recipes are from implementer knowledge.
- No mobile-tested triangle counts for instanced vegetation were found.

---

## 3. Procedural characters and enemies (articulated primitives, procedural animation, yokai motifs, weapon trails)

### Takeaway
Characters should be hierarchies of `Object3D` groups holding primitive meshes (capsules, spheres, cones, boxes). They are animated procedurally with sine-based bob/sway, squash-stretch on scale, and simple two-bone IK (law of cosines) for feet and arms. Yokai designs built from lanterns, umbrellas, masks and eyes map naturally onto primitives and CanvasTexture faces.

### Cited Findings
- Rim light is a major stylistic cue for anime-style characters, and inverted-hull outlines add one extra draw per mesh. Character parts should therefore be merged or kept few. — [Three.js From Zero s4-09](https://masterallarts.pages.dev/learn/threejs-from-zero/s4-09-stylized-npr/)
- No dedicated source was fetched on procedural character rigs in three.js. The material below is implementer knowledge.

### Inferences
All items in this section are implementer knowledge (IK).
- **Rig pattern.** `root → hips → spine → head`, `hips → thighL → shinL → footL`, etc. Each part is a mesh with `CapsuleGeometry` (available in core three since r139) and a pivot at the joint, which you get by translating the geometry so its top is at the origin. Six to twelve parts per character is enough for readability at phone scale.
- **Draw-call control.** For many identical enemies, use `SkinnedMesh`-free instancing:
  - Option 1: one `InstancedMesh` per body part across all enemies of a type. 10 parts give 10 draws for N enemies.
  - Option 2: `BatchedMesh` (core since r159) for mixed geometries with one material.
- **Procedural animation.**
  - Walk cycle: `phase += speed*dt*k`. Leg swing angle is `sin(phase)*A`, knee bend is `max(0, sin(phase+π/2))*B`, hip bob is `abs(sin(phase))*h`, and arm swing is opposite to the legs.
  - Idle: breathing scale `1 + 0.03*sin(t*2)`.
  - Squash-stretch on jump/land/hit: `scale.set(1+s, 1-s, 1+s)` (volume-preserving approximation), with `s` driven by a damped spring `s'' = -k s - c s'`.
  - Hit reaction: a 0.1 s white flash (uniform `uHit` mixing to white) plus a knockback spring.
  - Hit-stop of about 50–80 ms (freeze time scale) sells impact at no GPU cost.
- **IK-lite.** For two-bone legs on uneven terrain, use the law of cosines on thigh/shin lengths to reach a foot target placed at the ground height under the hip. This is about 20 lines of code and robust.
- **Yokai built from primitives.**
  - **Chōchin-obake (paper lantern).**
    - Body: a `LatheGeometry` of a bulging profile with horizontal rib bands (TorusGeometry rings, or darker vertex colors on rings).
    - Face: one CanvasTexture with a big eye, mouth and lolling tongue (a Box/Capsule with a red emissive tip). The body is emissive warm orange plus an additive halo sprite.
    - Motion: bob `y = sin(t*1.5)*0.2`, sway rotation, tongue wag.
  - **Kasa-obake (umbrella).**
    - Canopy: `ConeGeometry(r, h, 12, 1, true)` with 12 ribs, or a Lathe for curvature.
    - Body: a single leg (cylinder) with a geta (two Boxes) and one big eye on a CanvasTexture or a sphere + iris disc.
    - Motion: hop with squash-stretch on landing.
  - **Oni mask (men).**
    - Face base: a squashed `SphereGeometry` (scale z 0.6).
    - Horns: Cones, slightly curved by vertex bending.
    - Brows: Boxes.
    - Eyes: gold spheres with black slit planes.
    - Fangs: small Cones.
    - Red #b22222 or blue #2a4d8f skin. Use it as a boss head or a floating mask enemy, and add a fresnel rim for menace.
  - **Hitotsume-kozō / eye motifs.** A white sphere eye with an iris disc tracking the player via `lookAt`. Many floating eyes = one InstancedMesh of spheres + instanced iris discs.
  - **Onibi / hitodama (will-o'-wisps).** An additive billboard with a radial gradient CanvasTexture, a teardrop-shaped tail via a shader stretching along velocity, blue-white color. Very cheap and highly thematic.
- **Weapon trails.** See section 4 (ribbon mesh sampling blade base/tip each frame).

### Gaps
- No cited mobile benchmark for BatchedMesh vs. per-part InstancedMesh was found.
- No open-source three.js yokai character project was located.

---

## 4. VFX (slash ribbons, hit sparks, additive particles, kekkai barrier, ofuda talismans with procedural kanji, pentagram circle, five-element colors, purification)

### Takeaway
Every effect can be built from four reusable primitives:
1. a **ribbon trail** (a dynamic BufferGeometry strip)
2. a **GPU particle pool** (`InstancedMesh` or `Points`, with animation in the vertex shader from spawn-time attributes)
3. **fresnel/energy shell shaders** on simple geometry (Dodecahedron/Icosahedron)
4. **CanvasTexture atlases** for glyphs and sigils, drawn once at startup

Keep everything additive and `depthWrite:false`, and keep particle sizes small: overdraw is the main mobile risk.

### Cited Findings
- The rim/fresnel formula `pow(1.0 - max(dot(N, V), 0.0), 2.0)` is the basis for energy shells. — [Three.js From Zero s4-09](https://masterallarts.pages.dev/learn/threejs-from-zero/s4-09-stylized-npr/)
- Post-processing can be disabled dynamically when frame rate drops, and a performance monitor can reduce DPR by 20% (`dpr*0.8`) on decline. Heavy VFX should be tiered the same way. — [Codrops: Building Efficient Three.js Scenes](https://tympanus.net/codrops/2025/02/11/building-efficient-three-js-scenes-optimize-performance-while-maintaining-quality/)

### Inferences
All items in this section are implementer knowledge (IK).
- **Sword slash ribbon.**
  - Each frame, record the blade base and tip world positions into a ring buffer of 12–24 samples.
  - Build a triangle strip (2 verts per sample) in a preallocated `BufferGeometry` with `DynamicDrawUsage`. Update `position.needsUpdate` and `setDrawRange`.
  - Give UV.x = age (0 at the newest sample). The fragment shader computes `alpha = (1-uvx)^2 * edgeFalloff(uvy)` with additive blending and a color gradient, e.g. white core → five-element color edge.
  - For smoother arcs, insert Catmull-Rom subdivided samples between frames, which matters at low frame rates.
  - An alternative for scripted attacks is a prebuilt arc mesh: a partial `RingGeometry(r0, r1, 32, 1, θ0, Δθ)` with a shader sweeping `uProgress`. It is very cheap, very stylish, and Ōkami's brush-stroke slash maps well to it.
  - For a brush-stroke look, distort the alpha edge with noise and use ink black on paper scenes. That is the "sumi slash" with *normal* blending, not additive.
- **Hit sparks.**
  - Use a pool of about 256–512 instances in one `InstancedMesh` of stretched quads, oriented along velocity in the vertex shader. Or use `THREE.Points` with a `gl_PointSize` attenuated by distance.
  - Write the spawn time, origin, velocity and color into instanced attributes when spawning. Compute the position in the shader as `p = o + v*t + 0.5*g*t^2`, fading by t/life.
  - This needs no per-frame CPU loops except writing new spawns (`updateRange`/`addUpdateRange` for partial uploads).
  - Add a 2–3 frame flash (an expanding additive ring billboard) and a screen shake.
- **Kekkai barrier (dodecahedron).**
  - Geometry: `DodecahedronGeometry(r, 0)`, which has flat pentagonal faces.
  - Shader: fresnel rim glow, plus edge lines from barycentric coordinates. Either convert to non-indexed and add a barycentric attribute, or draw a separate `EdgesGeometry` → `LineSegments`. Note that `linewidth` >1 is ignored in WebGL, so use thin glowing lines or a `Line2`/fat-lines addon.
  - Add a scrolling hex/kanji pattern via `fract(uv*N + time)` and a hit ripple (uniform `uHitPoint`, `uHitTime`, ring = `smoothstep` of the distance on the sphere minus `(t-hitTime)*speed`).
  - Material: `transparent:true, blending:AdditiveBlending, depthWrite:false, side:DoubleSide`. Draw the back faces dimmer for depth.
  - Keep the barrier from covering the full screen when the camera is inside it. Fade by camera distance, because full-screen additive = maximum overdraw.
- **Ofuda talismans with procedural glyphs.**
  - At startup, draw an atlas on a 512×512 or 1024×256 `CanvasTexture`. Each cell is a cream rectangle (#efe6cf) with a red border and kanji written by `ctx.fillText` using a loaded web font, e.g. 急急如律令, 封, 破, 浄, 臨兵闘者皆陣列在前, 木火土金水.
  - Wait for `document.fonts.load('64px "Yuji Syuku"')` before drawing, or the canvas will use a fallback font. Fallback to system serif (`"Hiragino Mincho ProN", "Yu Mincho", serif`) is acceptable.
  - Add a red vermilion seal stamp: a square with a rounded glyph, drawn with `globalAlpha` and noise speckles for ink texture.
  - Use an `InstancedMesh` of planes (slightly bent via vertex shader flutter) with a per-instance atlas-cell attribute to select UVs.
  - Motion: spiral orbit around the player, then a homing launch. These are opaque/alpha-tested, not blended, so overdraw is cheap.
- **Pentagram / onmyōdō ground circle (seiman, 晴明桔梗).**
  - Draw it on a CanvasTexture: concentric circles, a five-pointed star (`moveTo`/`lineTo` at 144° steps), five-element kanji at the vertices in their colors, and a ring of small glyphs.
  - Apply it to a `PlaneGeometry` lying on the ground (`polygonOffset` to avoid z-fighting). Use an additive shader with a rotating `uTime`, reveal by `uProgress` (`atan2` angle sweep), and a pulse.
  - Alternatively, use pure-shader SDFs: circle `abs(length(p)-r) < w` and a star from 5 line-segment SDFs. Resolution-independent, no texture, slightly more ALU.
- **Five-element (gogyō) palette.**
  - 木 wood: green #3fa34d / blue-green 青
  - 火 fire: red #d7263d
  - 土 earth: yellow/ochre #e0b43a
  - 金 metal: white/silver #f2f2f2
  - 水 water: black #1a1a1a, rendered as deep indigo/blue #1f3c88 in additive effects, since black is invisible additively. Use normal blending or a dark-core + blue-rim effect for water.
- **Purification (harae) effect.**
  - On enemy death, dissolve it via a noise threshold in its material: `if (noise(pos*k) < uDissolve) discard;` with a bright emissive edge where `noise - uDissolve < 0.05`.
  - At the same time, burst white/gold motes rising (particle pool) and spawn a few falling sakura petals.
  - Add a single bell-sound sync (section 6). Optionally add a radial white flash ring on the ground.
- **Ink splash on hit (sumi-e look).** Use flat black planes with a CanvasTexture of a procedurally drawn splat (random circles + radial strokes). Scale them up quickly, then fade, using normal blending. Instanced.

### Gaps
- No cited benchmarks for particle counts on iPhone 12 / Pixel 6 were found. The 256–2000 figures in section 7 are rules of thumb.
- No cited three.js ribbon-trail library was verified in this pass. MeshLine / three.meshline exist per general knowledge but were not fetched.

---

## 5. UI aesthetics in DOM/CSS (vertical text, Japanese brush/mincho fonts, licenses, size, fallbacks)

### Takeaway
Yuji Syuku, Zen Antique and Shippori Mincho are all on Google Fonts under the SIL Open Font License 1.1, which is free for commercial use and embedding. Full Japanese TTFs are very large: Shippori Mincho is about 8.4 MB per weight. Load them through the Google Fonts CSS API, which automatically serves unicode-range slices, or with `&text=` subsetting for titles. Always provide system mincho fallbacks.

### Cited Findings
- **Shippori Mincho.** SIL OFL 1.1, © 2021 The Shippori Mincho Project Authors, designer FONTDASU. Five static weights (400–800). TTF file size is about **8.4 MB per weight** (Regular 8,474 KB). — [Fontsource: Shippori Mincho](https://fontsource.org/fonts/shippori-mincho/about)
- **Yuji Syuku.** SIL Open Font License, © 2021 The Yuji Project Authors, designer Kinuta Font Factory. One style (400, static). On Google Fonts since 2021. — [serbyte: Yuji Syuku](https://www.serbyte.net/fonts/yuji-syuku)
- The "Yuji" series digitizes handwriting by calligrapher Yuji Kataoka. — [Google Fonts: Yuji Syuku](https://fonts.google.com/specimen/Yuji+Syuku/license)
- **Zen Antique.** Listed as Open Font License, designed by Yoshimichi Ohira. Its source lives in the googlefonts/zen-antique GitHub repo. — [serbyte: Zen Antique](https://www.serbyte.net/fonts/zen-antique); [rightfontapp: Zen Antique](https://rightfontapp.com/family/zen+antique); [googlefonts/zen-antique](https://awesome.ecosyste.ms/projects/github.com%2Fgooglefonts%2Fzen-antique)

### Inferences
All items in this section are implementer knowledge (IK).
- **License.** OFL 1.1 permits bundling and embedding in web pages and commercial games. You cannot sell the font file by itself, and modified versions cannot use the Reserved Font Name. Including the OFL text in credits is good practice. Fonts are external files, so if the "no external files" constraint is strict, prefer system fonts plus Canvas-drawn effects. Fetching from Google Fonts at runtime is a network dependency, not a bundled asset.
- **Loading strategy.**
  1. Title and logo: `https://fonts.googleapis.com/css2?family=Yuji+Syuku&text=百鬼夜行結界…&display=swap`. The `text=` parameter returns a tiny subset with only those glyphs.
  2. Body text: the normal CSS2 API, where Google serves many unicode-range WOFF2 slices so the browser downloads only the slices it needs.
  3. Self-hosting full TTFs (8 MB+) is not acceptable for mobile.
- **Fallback stack.** `font-family: "Shippori Mincho", "Hiragino Mincho ProN", "Yu Mincho", "YuMincho", "Noto Serif JP", "Noto Serif CJK JP", serif;`. iOS ships Hiragino Mincho; Android ships Noto Serif CJK on most devices.
- **Vertical text.** `writing-mode: vertical-rl; text-orientation: upright;` for scroll-like menus. `text-combine-upright: all` for 2-digit numbers (tate-chu-yoko). `font-feature-settings: "vert"` for proper vertical punctuation.
- **Style cues.**
  - Washi background: a CSS radial gradient plus SVG `feTurbulence` noise filter, all in code.
  - Vermilion hanko seal: a rounded square with `border: 3px solid #c0392b` and the kanji in a brush font, rotated −3°.
  - Ink brush-stroke HP bar: CSS mask with an SVG path, or `clip-path`.
  - Gold leaf accents: linear-gradient.
  - Fusuma-like panels: subtle borders.
  - Keep UI in DOM, not WebGL, for crisp text and zero GPU cost in the 3D pass, but avoid per-frame layout thrash. Update HP bars via `transform: scaleX()`.

### Gaps
- Exact WOFF2 slice sizes served by Google Fonts for these families were not measured.
- Zen Antique's license was confirmed only through aggregators (serbyte, rightfontapp), not the Google Fonts page itself. The Google Fonts license page fetch returned no license text.

---

## 6. Procedural audio with Web Audio API (taiko, clappers, shakuhachi, suzu bells, hits, ambient; iOS unlock)

### Takeaway
All required sounds can be synthesized from OscillatorNodes, noise AudioBuffers, BiquadFilters and gain envelopes, using classic drum-synthesis recipes as a starting point. On iOS:
- Create or resume the AudioContext inside a user-gesture handler.
- Expect Web Audio to be muted by the ringer/silent switch unless you use the experimental `navigator.audioSession.type = "playback"` or the silent-HTML-audio-loop workaround.

### Cited Findings
- **Kick recipe.** Triangle osc 120 Hz and sine osc 50 Hz, each with frequency and gain decaying exponentially to 0.001 over 0.5 s. — [Sonoport: Synthesising Sounds with Web Audio API](https://sonoport.github.io/synthesising-sounds-webaudio.html)
- **Snare recipe.** A noise buffer (4096 samples) through a highpass rising 100→1000 Hz over 0.2 s, plus a 100 Hz triangle oscillator. Note the page's noise used `Math.random()` (0..1), not −1..1, which is a bug to avoid. — [Sonoport](https://sonoport.github.io/synthesising-sounds-webaudio.html)
- **Hi-hat recipe.** Six square oscillators at 40 Hz × [2, 3, 4.16, 5.43, 6.79, 8.21] (inharmonic metallic ratios) → bandpass 10 kHz → gain 1→0.01 over 0.05 s → highpass 7 kHz. — [Sonoport](https://sonoport.github.io/synthesising-sounds-webaudio.html)
- **iOS ringer switch.** Web Audio plays on iOS's ringer channel and is silenced by the mute switch. The `unmute` library (MIT) works around this by looping a short silent HTML `<audio>` track while Web Audio plays, which moves iOS to the media channel. It also resumes the AudioContext on user interaction and pauses on page hidden via the Page Visibility API. On iOS it also checks focus, because Apple's implementation is buggy. — [GitHub swevans/unmute](https://github.com/swevans/unmute)
- **`navigator.audioSession.type`.** Accepts "auto", "playback", "transient", "transient-solo", "ambient" and "play-and-record". "playback" is an exclusive media-playback type. MDN marks it experimental and not Baseline. — [MDN: AudioSession.type](https://developer.mozilla.org/docs/Web/API/AudioSession/type)
- **WebKit bug history.** WebKit bug 237322 is titled "webaudio api is muted when the iOS ringer is muted." — [WebKit mailing list](https://lists.webkit.org/pipermail/webkit-unassigned/2024-September/1186593.html)
- Separately, WebKit has filed a bug about Web Audio going silent when closing another tab that had audio. — [WebKit bug 276687](https://bugs.webkit.org/show_bug.cgi?id=276687)

### Inferences
Recipes are implementer knowledge (IK); tune by ear.
- **Unlock pattern.** On the first `pointerdown`/`touchend`/`keydown`:
  1. `ctx = ctx || new AudioContext(); ctx.resume();`
  2. Play a 1-sample silent buffer.
  3. `if (navigator.audioSession) navigator.audioSession.type = 'playback';`
  4. Optionally apply the unmute-style silent `<audio>` loop. A silent WAV can be generated in code as a Blob URL, so it is not an external file.

  Also re-resume on `visibilitychange` → visible and on the next touch. A "Tap to start / 開始" title screen solves this cleanly.
- **Taiko (ōdaiko).**
  - Body: sine at about 60–80 Hz with pitch drop from about 110 Hz → 55 Hz over 0.15 s, and gain attack 0.002 s / decay about 0.8–1.2 s.
  - Skin slap: a short noise burst through a lowpass at about 1.5 kHz, decay 0.05 s.
  - Room: a short convolution reverb whose impulse response is generated in code (exponentially decaying noise buffer, 1.5 s).
  - Rim hit (kachi/ka): a short bandpassed noise at about 2–3 kHz plus a 900 Hz triangle blip, 40 ms.
- **Hyōshigi (wooden clappers) / mokugyo.**
  - Two to three sine/triangle partials at about 1.2 kHz, 2.6 kHz and 3.9 kHz (inharmonic, wood-like), very fast decay (30–80 ms), plus a click (1 ms noise).
  - Mokugyo: about 400–700 Hz with a bandpass, decay 0.15 s.
- **Suzu bells (shrine bell cluster) / rin (singing bowl).**
  - Additive synthesis with inharmonic partials. Bell-like ratios are roughly 1, 2.0, 2.76, 5.40, 8.93 (circular-plate approximation), or reuse the cited hi-hat ratios at higher base frequency for jingle.
  - Suzu: 5–8 small bells, each with random detune, 3–4 kHz base, decay 0.3–0.6 s, randomly staggered 5–30 ms.
  - Rin: base about 500–700 Hz, long decay 4–8 s, slight beating via two partials detuned 1–2 Hz.
- **Shakuhachi-like tone.**
  - A sine or triangle fundamental with a breath component: white noise → bandpass at the fundamental (Q≈5–10), mixed at about −12 dB.
  - Slow attack (0.15–0.3 s) and vibrato (LFO 5 Hz, ±10 cents, which fades in).
  - Characteristic meri pitch bends (glide down a semitone via `setTargetAtTime`), and a breathy "muraiki" noise burst on attack.
  - Use a pentatonic scale, e.g. miyako-bushi (in scale): D, E♭, G, A, B♭. Generative phrases are random walks on this scale with long rests ("ma").
- **Koto pluck (optional).** Karplus–Strong via an AudioWorklet, or approximated with a triangle + quick lowpass sweep. AudioWorklet works in modern Safari, but keep a fallback.
- **Hit sounds.** Layer a short noise burst (highpassed, 30 ms), a pitched thump (sine 150→60 Hz, 80 ms), and for sword swings a bandpass-swept noise "whoosh" (center 400→2000 Hz over 0.15 s). Randomize pitch ±5% per hit to avoid repetition.
- **Ambient generator.**
  - Wind: pink-ish noise → lowpass with a slowly LFO'd cutoff, 200–800 Hz.
  - Insects/cicadas: amplitude-modulated bandpassed noise around 4–6 kHz.
  - Occasional distant bell or shakuhachi phrase on a random timer.
  - Optional water stream: bandpassed noise with random gain flicker.
- **Performance.**
  - Reuse noise buffers (create once).
  - Use a single master `DynamicsCompressorNode`.
  - Cap simultaneous voices (e.g. 16–24), and throttle hit sounds to one per 30 ms.
  - Schedule with `ctx.currentTime`, not setTimeout, for rhythmic taiko loops (lookahead scheduler).

### Gaps
- The Opera dev article on Web Audio drum synthesis now redirects and could not be read.
- No authoritative source was fetched for shakuhachi/taiko-specific synthesis parameters. The values above are starting points.
- No source confirmed the exact Safari version that ships `navigator.audioSession`. MDN only says it is experimental and not Baseline. Check the MDN compatibility table.

---

## 7. Mobile performance budget (draw calls, triangles, shader complexity, overdraw) and examples/projects to cite

### Takeaway
Fill-rate (resolution × overdraw × fragment cost) is the dominant limiter on iPhone 12 / Pixel 6 class GPUs, so:
- Cap DPR at about 1.5.
- Avoid stacked post passes.
- Keep transparent particles small and few.
- Merge or instance aggressively to keep draw calls low.
- Build a runtime quality tier that drops DPR and effects when FPS falls.

### Cited Findings
- **Target frame rate.** At least 60 fps. To find headroom, unlock Chrome's frame cap and aim for about 150–200 fps on a good dev machine. Inspect draw calls with Spector.js, check `renderer.info`, and use stats.js for FPS. — [Three.js Journey: Performance tips](https://www.threejs-journey.com/lessons/performance-tips)
- **DPR caps.** Mobile max pixel ratio **1.5** (`Math.min(mobileMaxPixelRatio, devicePixelRatio)`). On performance decline, lower DPR by 20% and disable post-processing. Use `antialias:false` when using post-processing or when performance drops. Recommended GL context flags: `powerPreference:"high-performance"`, `alpha:false`, `antialias:false`, `stencil:false`, `depth:false` (the last only valid when a composer handles depth). — [Codrops 2025: Building Efficient Three.js Scenes](https://tympanus.net/codrops/2025/02/11/building-efficient-three-js-scenes-optimize-performance-while-maintaining-quality/)
- **Reference desktop scene.** 27 meshes, 49 shaders and 40k triangles ran at a stable frame rate. Dynamic lights are "performance-intensive". Stop rendering when `document.hidden`. — [Codrops 2025](https://tympanus.net/codrops/2025/02/11/building-efficient-three-js-scenes-optimize-performance-while-maintaining-quality/)
- **iOS DPR thread.** A three.js forum thread reports low FPS on iOS when the pixel ratio is set to the full `window.devicePixelRatio` (3 on recent iPhones). — [three.js forum: Low fps on iOS with devicePixelRatio](https://discourse.threejs.org/t/low-fps-on-ios-mobile-with-pixel-ration-set-as-window-devicepixelratio/4963)
- **Adaptive DPR thread.** Another thread discusses changing pixel ratio adaptively based on measured FPS. — [three.js forum: Changing pixelRatio based on fps](https://discourse.threejs.org/t/changing-pixelratio-based-on-fps-good-or-bad-idea/34563)
- **PlayCanvas guidelines.** PlayCanvas publishes general WebGL optimization guidelines covering draw calls, overdraw and mobile. Not fetched. — [PlayCanvas optimization guidelines](https://developer.playcanvas.com/user-manual/optimization/guidelines/)
- **NPR cost ranking.** Inverted hull = +1 draw per mesh; edge detection = +1 full-screen pass; cel shading is cheap on low-end devices. — [Three.js From Zero s4-09](https://masterallarts.pages.dev/learn/threejs-from-zero/s4-09-stylized-npr/)

### Inferences
The numeric budgets are rules of thumb (IK). Validate them on the real devices with `renderer.info.render.calls` / `.triangles` and stats.js.

**Proposed budget for 60 fps on iPhone 12 / Pixel 6** (WebGL2, DPR ≤1.5, ~0.7–1 MP framebuffer):

| Item | Target | Hard cap |
|---|---|---|
| Draw calls (incl. outline hulls) | ≤100 | 150–200 |
| Triangles on screen | 100–200k | ~300k |
| Lights | 1 directional (+ hemisphere/ambient) | no realtime point lights; fake with emissive + additive sprites |
| Shadows | none, or 1 directional with 1024² map, `PCFShadowMap`, only on hero/enemies; or blob shadows (dark circle decal), which are much cheaper | — |
| Post-processing passes | 0–1 combined pass | 2 |
| Particles (additive, small) | 500–2000 quads, each ≤ ~32 px | avoid full-screen transparent quads |
| Transparent overdraw | ≤ ~3× average in hot spots | — |
| Textures (all CanvasTexture/DataTexture) | atlases 512–1024², power-of-two | total < 32 MB GPU |

Further guidance (IK):
- **Shader complexity.**
  - Prefer `MeshToonMaterial`/`MeshLambertMaterial`/`MeshBasicMaterial` or small ShaderMaterials over `MeshStandardMaterial`/`MeshPhysicalMaterial`.
  - Avoid per-pixel fbm loops of more than 3–4 octaves on large surfaces. Bake noise into vertex colors or a DataTexture at load instead.
  - Use `precision mediump float` where possible; three uses highp by default, and `renderer` param `precision: 'mediump'` exists, but test for banding.
- **Antialiasing.** MSAA (`antialias:true`) on WebGL2 mobile is reasonably cheap at DPR 1–1.5 when there is no post-processing. With a render-target pipeline, use the RT's `samples: 4`, or rely on the outline look plus FXAA in the single combined pass.
- **Instancing and batching.** Use `InstancedMesh` (with `frustumCulled` adjusted: compute a bounding sphere for the whole instance set) and `BatchedMesh` (r159+) for varied static props sharing a material. Use `mergeGeometries` for static clusters per region chunk (to keep frustum culling useful).
- **CPU side.**
  - Avoid allocating Vector3s per frame.
  - Update instance matrices only when changed.
  - Use a fixed-timestep simulation.
  - Pause rendering on `visibilitychange`.
  - Simple sphere/capsule collision in code; no physics engine needed for an action game of this scope.
- **Quality tiers.**
  - High: DPR 1.5, outlines on, post pass on, 2k particles.
  - Low: DPR 1.0, outlines on heroes only, no post pass, 500 particles.
  - Auto-switch if the average frame time is above 18 ms over 2 s.
- **WebGPURenderer note.** For WebGLRenderer r18x specifically: the three.js project is moving toward WebGPURenderer/TSL. Stick to classic `ShaderMaterial`/`onBeforeCompile`, which still works in WebGLRenderer and is what most examples and AI training data cover. That makes it the more reliable choice for an AI implementer.
- **Examples to cite and inspect.** These are names of three.js repo examples per implementer knowledge; verify URLs at threejs.org/examples:
  - `webgl_materials_toon` (MeshToonMaterial gradient maps)
  - `webgl_effects_outline`, or OutlineEffect usage in `webgl_loader_mmd` (inverted-hull outline)
  - `webgl_instancing_performance`, `webgl_mesh_batch` (BatchedMesh)
  - `webgl_buffergeometry_drawrange` (dynamic ribbon/strip updates)
  - `webgl_points_sprites`, `webgl_custom_attributes_points` (particles)
  - `webgl_geometry_extrude_shapes`, `webgl_geometry_shapes` (roof profiles, plaques)
  - `webgl_geometry_teapot`-style Lathe usage (lanterns)
  - `webgl_postprocessing_sobel` (edge detection cost reference)
  - `webgl_materials_modified` (`onBeforeCompile` injection)

### Gaps
- No primary, device-measured three.js benchmark specific to iPhone 12 or Pixel 6 (draw calls/triangles at 60 fps) was found. The budget table is an engineering estimate.
- The full Three.js Journey "Performance tips" lesson is paywalled beyond the preview. Its remaining tips (pixel ratio, shadows, instancing) could not be cited from it.
- Exact URLs of the three.js example pages listed above were not fetched in this pass.
