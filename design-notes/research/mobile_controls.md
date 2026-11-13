# Touch Controls and UI for 3D Action Games on Smartphones (as of Nov 2026), Applied to a Landscape Three.js Browser Action Game

Scope note: Primary-source numbers from commercial games (exact dead zones, sprint thresholds, button pixel sizes) are mostly **not published**. Official docs and press cover features and settings, not values. Where this document gives numbers for the target game, they come from cited platform guidelines (Apple HIG, joystick-design references) or are labeled inferences. Research used about 30 tool calls. Several retrieved sources were thin, and the Gaps sections say where.

---

## 1. How top mobile action games lay out controls (joystick, buttons, dodge, lock-on, hold actions)

### Takeaway
The genre has settled on a standard layout. A left-side movement stick (players prefer floating/hybrid sticks to fixed ones) sits opposite a right-side cluster with a large Attack button, a Dodge button next to it, 2–3 skill/ultimate buttons, and jump/sprint where relevant. Camera is controlled by dragging any empty right-side area. Targeting is soft auto-lock by default, with configurable priority and an optional hard lock. "Hold" variants (charged attack, held skill) live on the same button as the tap action. Dodge is a dedicated button, not a swipe. Critics argue that touch limits these games to about "3 attacks and a dodge," so depth comes from timing (perfect dodge, switch counters) rather than input complexity.

### Cited Findings
- **Genshin Impact (mobile):** the left side of the screen controls movement. On-screen buttons are Elemental Burst, Elemental Skill, Normal Attack, Jump/Glide, and Sprint, plus a separate concentration/focus (Elemental Sight) button. At the time of that guide, players could not move the virtual d-pad or other on-screen buttons. Settings include camera sensitivity, ADS (aim) sensitivity, gyro aiming, and walk/run mode. Aiming in ADS with a bow can feel "tiresome and unresponsive" on some phones. — [TouchTapPlay: Genshin Impact mobile controls](https://www.touchtapplay.com/genshin-impact-mobile-controls-and-settings/)
- Genshin mobile does not allow full custom key bindings the way PC does. — [Sportsdunia](https://www.sportsdunia.com/gaming/genshin-impact-how-to-set-up-custom-controls) (Gap: I could not confirm whether later Genshin versions added button repositioning or resizing.)
- **Genshin complaints (Destructoid):** the joystick is "a fixed-place control pad rather than one that moves with your thumb," and the thumb covers too much of the screen. Attack, special, run, and jump are small and close together, so mis-taps happen, e.g. jumping off a cliff without deploying the glider. Proposed fixes: a floating joystick, larger buttons with more spacing, and controller support. — [Destructoid: Genshin Impact could use a few adjustments on mobile](https://vip-develop.destructoid.com/?p=260491)
- **Honkai Impact 3rd (hold vs tap on one button):** a normal attack is a tap. Holding Attack after a normal attack or dodge makes the character glow, and pressing Attack again launches a Combo attack. Some characters (Himeko, Bronya) instead use hold-to-charge, release-to-strike. — [Houkai Impact 3rd Wiki: Combat system](https://houkai3rd.fandom.com/wiki/Combat_system?oldid=8887)
- **HI3 Evade:** a dedicated Evade button. Tapping it rolls or slides, with a cooldown of about 1 s. The animation lasts about 1 s, with roughly 0.8 s of invincibility and a perfect-timing window of about 0.6 s. A perfect evade causes a 0.2 s slowdown ("Ultimate Evasion"/time fracture concept) and grants 2 EP. Some battlesuits replace Evade with hold-to-block, and releasing within 1 s of taking damage fires a counter skill. Parry is mapped onto the Ultimate button for some battlesuits. Switching characters (tag-in) can trigger a QTE if the target is floated, frozen, or stunned. — [Houkai Impact 3rd Wiki: Combat system](https://houkai3rd.fandom.com/wiki/Combat_system?oldid=8887)
- **Zenless Zone Zero:** a party of three with switching on one button press, and switching just before an enemy attack can trigger a counter. Each character has Normal Attack, Special, Ultimate, and a Dodge. A critic argues "you can't do advanced action mechanics with a touch-screen UI," because input is limited to tapping or holding regions, so games get "at most three attacks and a dodge" and complexity moves into RPG/gear systems. He cites Punishing: Gray Raven's colored-orb skill bar as a different solution: matching attack colors boosts skills. — [SuperJump: ZZZ shows the limits of mobile action games](https://superjumpmagazine.com/zenless-zone-zero-shows-the-limits-of-mobile-action-games)
- **Wuthering Waves (v1.2):** added "Custom Lock-On" under Settings → Control, where players set auto lock-on priority by **movement direction, camera direction, or distance**. v1.1 had already improved auto lock-on for some Resonators and Echo skills. — [Prydwen: WuWa 1.2 Developer Notes Summary](https://blog.prydwen.gg/?p=10131); also reported at [ProGameGuides](https://progameguides.com/wuthering-waves/custom-lock-on-and-120fps-are-coming-to-wuthering-waves-1-2/)
- **Diablo Immortal (mobile settings):** "Aiming – Primary Attack" can be switched on to show a crosshair, recommended mainly for ranged classes. Skill cancel can be set to "drag skill onto the cancel icon," a drag-off-to-cancel pattern for aimed skills. Settings are shared across characters. — [Mein-MMO: Best settings for Diablo Immortal on mobile](https://mein-mmo.de/en/the-best-settings-for-diablo-immortal-if-you-want-to-play-on-mobile,835234)
- **Arknights: Endfield (released 2026):** a hands-on review says touch controls are easy to pick up and make "dodging, chaining combos, and using ultimates… as easy as pie." The game doesn't demand constant movement. The reviewer's only complaints were about install size and performance, not controls. It ran at 30+ fps on a Galaxy S20 at low resolution. — [Pocket Gamer: Arknights Endfield hands-on](https://www.pocketgamer.com/arknights-endfield/hands-on)

### Inferences
- **Recommended layout for the target game (landscape):**
  - **Left half:** floating/hybrid movement stick.
  - **Right side, bottom corner:** big Attack button (tap = combo, hold = charge stance). Release fires the charged move. Show charge tiers with a ring fill on the button. This follows HI3's tap/hold-on-one-button model.
  - **Immediately adjacent:** Dodge/Step and Jump. Air Boost should be the same button as Dodge or Jump while airborne (a context swap, like Genshin's Jump→Glide) rather than a new button.
  - **Arc above Attack:** 2 skill buttons, **Barrier (結界)** and **Talisman (符)**, with Talisman entering the drawing mode.
  - **Small target near the top right or above the arc:** Lock-on toggle. Tapping an enemy on screen could also lock it.
- Keep combat buttons to about 5–6 (Attack, Dodge, Jump, Barrier, Talisman, Lock), matching the "3 attacks and a dodge" ceiling critics describe. Depth should come from timing (perfect dodge with a slowdown like HI3's 0.2 s, charge timing), not from more buttons.
- Use a dodge **button**, not a swipe. Every surveyed game uses a dedicated dodge button. A swipe on the camera region would conflict with camera drag.
- Adopt WuWa-style soft-lock priority (movement direction > camera direction > distance) as the default auto-target. Keep hard lock as an opt-in toggle.

### Gaps
- No primary source gave exact dead zones, sprint thresholds, button pixel sizes, or screen-percentage positions for Genshin, WuWa, ZZZ, PGR, or Endfield. These are not in official docs, and I found no UI teardown with measurements.
- I could not verify how ZZZ's or PGR's mobile dodge works in detail (e.g., whether a perfect dodge is time-slowed on mobile the same way as on PC/console), or whether Genshin added button customization in later versions.
- I found no GDC talk from miHoYo/HoYoverse or Kuro specifically on touch-control design.

---

## 2. Touch target sizes, thumb reach, safe areas, multitouch

### Takeaway
Apple HIG specifies **44×44 pt as the default control size (28×28 pt minimum)**, with **about 12 pt padding around bezeled elements and about 24 pt around unbezeled ones**. In mobile Safari, 1 CSS px ≈ 1 pt, so these map directly to CSS pixels. Joystick references recommend a base diameter of about 120–140 px at 1080p with a dead zone of 10–15% of the radius, and an activation zone covering the left about 40% of the screen. Track multitouch per pointer ID so move, camera, and button presses can run at the same time.

### Cited Findings
- Apple HIG (Accessibility, updated 2025): for iOS/iPadOS the **default control size is 44×44 pt and the minimum is 28×28 pt**. "Consider spacing between controls as important as size": about **12 pt padding around elements with a bezel** and about **24 pt around the visible edges of elements without a bezel**. — [Apple HIG: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- Apple HIG also says to use the simplest gesture possible for frequent interactions and avoid custom multifinger gestures. It says to **offer on-screen alternatives to gestures**. For games, it suggests difficulty accommodations such as adjusting reaction time or enabling control assistance, and pairing audio cues with haptics. — [Apple HIG: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- Virtual joystick guidance (abratabia):
  - **Placement modes:** static, dynamic, and hybrid (default position, but jumps to the touch within a larger activation zone and returns on release), which "many commercial mobile games use."
  - **Activation zone:** example of "the left 40 percent" of the screen.
  - **Dead zone:** about 10–15% of the base radius (0.12 in the example), with the output rescaled as `(distance − deadZone) / (maxRadius − deadZone)`.
  - **Size:** base radius 60–70 px and knob radius 25–30 px at about 1920×1080 internal resolution, i.e. a base diameter of 120–140 px. Max displacement equals the base radius.
  - **Response curve:** linear default. Quadratic gives more precision at low speeds. Offer a slider.
  - **Visuals:** base about rgba(255,255,255,0.15), knob about 0.4. Hide a dynamic stick when idle and highlight the rim at max displacement.
  - **Multitouch:** store the touch identifier at activation and handle only that finger's move/end, so other fingers can press buttons. Handle touchcancel and off-canvas exits.

  — [Abratabia: Virtual joystick](https://www.abratabia.com/game-controls/virtual-joystick.php)
- A 2025 Phaser joystick modeled on Brawl Stars uses dynamic repositioning: the stick "moves to wherever the player first touches." Input is limited to the left side of the screen to avoid conflicts with action buttons, and output is normalized to [-1, 1]. — [Phaser news, Dec 2025](https://phaser.io/news/2025/12/i-built-the-best-virtual-joystick-for-phaserjs)
- Material Design's minimum touch target of 48×48 dp is widely cited, but the m3.material.io page did not render for me (JS-only), so I could not verify it directly here. — [Material 3: Structure](https://m3.material.io/foundations/designing/structure) (unverified fetch)

### Inferences
- **Concrete sizes for the target game (CSS px ≈ pt on iOS; a typical landscape phone viewport is about 844×390 to 932×430 CSS px):**
  - **Primary Attack button:** about 72–84 px diameter. This is well over 44 because it is hit repeatedly and blind.
  - **Dodge and Jump:** about 60–64 px.
  - **Skill buttons (Barrier, Talisman):** about 52–56 px.
  - **Lock-on and menu:** at least 44 px. Visual icons can be smaller, but the invisible hit area should still be at least 44 px.
  - **Spacing:** keep at least 12 px gaps (HIG bezel padding), and expand hit areas into the gap with nearest-button resolution.
- **Joystick:** don't scale the 1080p values (120–140 px) linearly to a 390 px-tall CSS viewport; that would give about 45 px, which is too small. Size by physical thumb travel instead: base diameter about 110–130 CSS px, knob about 50 px, dead zone 0.12 × radius.
  - **Walk/run threshold:** about 0.5–0.6 of normalized magnitude for walk vs run. The game-specific threshold is unverified; see Gaps.
  - **Sprint:** auto-sprint when the stick is held at above 0.9 magnitude for more than about 0.3–0.5 s, or a separate sprint toggle.
- **Activation zones:** joystick = left 40–50% of the width, excluding the top HUD band. Camera drag = everything in the right half not covered by a button.
- **Safe areas:** use `viewport-fit=cover` and `env(safe-area-inset-left/right/bottom)` to pad HUD clusters away from the notch/Dynamic Island and the home indicator in landscape. Keep a gap of about 16–24 px from the bottom edge so buttons don't trigger the iOS home gesture. (The CSS env() API is standard; I did not fetch a source for it this session.)
- **Thumb reach in landscape:** both thumbs rest in the bottom corners. The most reachable area is about the bottom 60% of height and outer 30% of width on each side. Put the highest-frequency buttons (Attack, Dodge) closest to the bottom-right corner, and secondary skills on an arc above them. This is ergonomic reasoning; I found no measured study for landscape phones.

### Gaps
- I found no peer-reviewed or industry-measured thumb-reach heatmap for landscape phone gaming in this search.
- Material's 48 dp figure is not verified by fetch here.

---

## 3. Camera assistance on mobile (recenter, lock-on framing, auto-rotate, sensitivity, gyro)

### Takeaway
Shipping games expose camera sensitivity sliders, separate aim sensitivity, and gyro aiming (Genshin). They also offer soft-lock targeting with configurable priority (WuWa). I found no specific default values or recenter algorithms in public sources. Camera assist design therefore has to come from first principles.

### Cited Findings
- Genshin Impact mobile settings include camera sensitivity, ADS (aim) sensitivity, and an option to turn on gyro aiming. — [TouchTapPlay](https://www.touchtapplay.com/genshin-impact-mobile-controls-and-settings/)
- Wuthering Waves' auto lock-on priority can be based on movement direction, camera direction, or distance (v1.2). — [Prydwen: WuWa 1.2 notes](https://blog.prydwen.gg/?p=10131)
- Apple HIG asks developers to be gentle with camera motion and to respect Reduce Motion. That guidance is aimed at visionOS but is relevant to auto-camera. — [Apple HIG: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)

### Inferences
- **Camera drag:** use a pointer in the right-side free area. Map horizontal drag to yaw at about 0.25–0.35°/CSS px and vertical drag to pitch at about 0.15–0.25°/CSS px. Clamp pitch to about −30° to +60°. Offer a sensitivity slider (0.5×–2×) and an invert-Y option. Apply light smoothing (lerp about 0.3–0.5 per frame at 60 fps), and no acceleration by default.
- **Auto-rotate during movement:** while the stick has a lateral component and the camera hasn't been touched for about 1–1.5 s, slowly yaw the camera behind the character (about 60–90°/s, scaled by lateral input). Pause auto-rotate for about 1.5–2 s after any manual camera drag.
- **Lock-on framing:** frame the midpoint between player and target, biased toward the player (about 0.35–0.4 of the way to the target). Raise the camera pitch slightly and widen distance as the separation grows.
  - **While locked,** horizontal camera drag swaps targets: a flick of more than about 40 px picks the next enemy in that screen direction.
  - **Break lock** when the target is dead, when it is more than about 25–30 m away, or when it stays occluded for more than about 1 s.
- **Soft-lock (default):** when Attack is pressed, choose a target with WuWa-style priority. Score enemies inside about 8 m by angle to stick direction (if moving), otherwise by angle to camera forward, then by distance. Snap the character's facing toward the target (about 60° max correction).
- **Recenter:** double-tap on empty camera area, or tap the Lock button when no enemy is present, snaps the camera behind the player.
- **Gyro:** optional, off by default. Use it only for aiming moments (e.g., while drawing or aiming the barrier placement), via DeviceOrientationEvent. iOS requires `DeviceOrientationEvent.requestPermission()` from a user gesture. This is general platform knowledge that I did not re-verify this session.
- **Reduce Motion:** honor `prefers-reduced-motion` by disabling auto-rotate and camera shake.

### Gaps
- I found no published default camera sensitivity values (°/px) or auto-recenter timings for Genshin, WuWa, or ZZZ. The values above are design proposals, not sourced data.

---

## 4. Gesture recognition for spell casting (pentagram talisman)

### Takeaway
For a pentagram drawn **through fixed on-screen points**, a **node-connection (point-to-point) system** is more robust and more readable on a small phone than free-form shape recognition. If free drawing is wanted, the $-family recognizers are the standard lightweight choice. $P/$Q ignore stroke order and direction, which suits a "draw the star" spell. Okami on Switch shows that finger-drawing works better than stick-drawing, but it forces an awkward grip in handheld play.

### Cited Findings
- **$P Point-Cloud Recognizer** (Vatavu, Anthony, Wobbrock, ICMI 2012): a 2D stroke recognizer for rapid prototyping that represents gestures as **unordered point clouds**. It matches them via an approximation of the Hungarian assignment problem, so it ignores stroke count, order, and direction, which handles unistrokes and multistrokes the same way without $N's combinatorics. The demo uses one template per gesture for 16 gestures. Successors: **$Q**, optimized for low-power mobiles, reported **142× faster** with slightly improved accuracy; and **$P+**, more accurate and tuned for low-vision users. It won the ICMI 2012 Outstanding Paper award and the 2022 Ten-Year Impact award. — [UW ACE Lab: $P](https://depts.washington.edu/acelab/proj/dollar/pdollar.html); paper PDF: [ICMI '12](https://faculty.washington.edu/wobbrock/pubs/icmi-12.pdf)
- **Okami HD (Switch):** handheld players can paint Celestial Brush strokes with a finger on the touchscreen instead of with the analog stick, which makes you "clumsily draw crooked circles." Downsides: you must take your left hand off the console or stretch your thumb to the middle of the screen. The reviewer failed a water-lily stroke 5 times with the Pro Controller, then passed on the first try by touch. He called the painting mechanic "sometimes wonky." — [Engadget: Okami HD on Switch](https://www.engadget.com/2018-08-17-nintendo-switch-okami-hd.html)
- Apple HIG says complex gestures are hard for many people and that apps should offer on-screen alternatives to gestures. — [Apple HIG: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)

### Inferences
- **Recommended talisman implementation (node-connection):**
  - **Entering the mode:** tapping the Talisman button enters "seal-drawing mode." Slow time to about 0.1–0.25× rather than fully pausing, which keeps tension, as HI3's evade slowdown does. Alternatively pause entirely on an "assist" difficulty. Okami's original design freezes the scene during brush mode; that is general knowledge, not confirmed by the fetched review.
  - **Nodes:** show 5 nodes at the vertices of a pentagram centered in the screen. Diameter should be about 40–45% of viewport height (about 160–180 CSS px on a 390 px-tall viewport) so both thumbs can reach. Place it **slightly right of center** for right-thumb drawing, or mirror it in left-handed mode.
  - **Hit radius:** each node about 44–56 CSS px (at least the HIG 44 pt). A node "captures" when the finger enters within the radius, with a snapping line.
  - **Order:** accept any start node and either direction. Validate by the **edge set** (the 5 star edges: vertex i → i+2 mod 5), not by stroke order. This mirrors $P's order/direction invariance. Allow lifting the finger mid-figure within a grace time (about 0.4 s) to continue.
  - **Tolerance and failure:** fail if a non-star edge is drawn (e.g., the pentagon perimeter i → i+1), or on timeout (about 3–4 s of real time). Allow optional "partial seals" with weaker effect for 3–4 edges.
- **Free-drawing alternative:** sample pointer points, resample to N=32 (the $Q/$P typical range), and match against star templates with $Q. Reject if the score exceeds a threshold tuned in playtests. Because $P/$Q are direction- and order-invariant, any way of drawing the star passes.
- **Accessibility fallback:** offer a "quick-cast" option (long-press the Talisman button, or auto-trace) for players who cannot draw. This follows the HIG's on-screen alternative principle.
- Draw the trail with an ink-brush stroke and give a haptic tick per captured node (Android `navigator.vibrate(10)`; see section 6 for iOS).

### Gaps
- I did not retrieve sources for Harry Potter: Wizards Unite's spell tracing, Magic Touch: Wizard for Hire, or Infinity Blade's swipe system. Their recognition tolerances and time-slow behavior are therefore unverified here.
- I did not confirm $P's default resampling N or published accuracy figures from the fetched page.

---

## 5. Common player complaints and how top games solved them; accessibility and customization

### Takeaway
The recurring complaints are fixed joysticks that don't follow the thumb, small and crowded buttons that cause mis-taps, unresponsive aiming, and shallow combat depth. Fixes in the genre include floating/hybrid sticks, larger and better-spaced buttons, configurable lock-on priority, controller support, crosshair or aim toggles, and drag-to-cancel for skills.

### Cited Findings
- **Fixed joystick, small and close buttons, mis-presses, no controller support** (Genshin). — [Destructoid](https://vip-develop.destructoid.com/?p=260491)
- **Bow aiming with ADS** is tiresome and unresponsive on some phones; gyro aiming is offered as an option. — [TouchTapPlay](https://www.touchtapplay.com/genshin-impact-mobile-controls-and-settings/)
- **Touch caps combat depth** at "three attacks and a dodge." — [SuperJump](https://superjumpmagazine.com/zenless-zone-zero-shows-the-limits-of-mobile-action-games)
- **Lock-on frustration** was addressed via a lock-on priority setting (WuWa 1.2). — [Prydwen](https://blog.prydwen.gg/?p=10131)
- **Skill-cancel by dragging to a cancel icon** and an aim crosshair toggle (Diablo Immortal). — [Mein-MMO](https://mein-mmo.de/en/the-best-settings-for-diablo-immortal-if-you-want-to-play-on-mobile,835234)
- **Accessibility guidance (HIG):** customizable layouts and control assistance, reaction-time adjustment, conveying information with more than color, Reduce Motion support, and haptics paired with audio cues. — [Apple HIG: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- A joystick reference recommends letting players resize the joystick and choose a sensitivity curve. — [Abratabia](https://www.abratabia.com/game-controls/virtual-joystick.php)

### Inferences
- **Must-have settings for the target game:**
  - A layout editor: drag buttons, scale 70–150%, opacity 20–100%, and save and reset.
  - Left-handed mirror.
  - Joystick mode (fixed/floating/hybrid, defaulting to hybrid) and joystick size.
  - Camera sensitivity X and Y, invert Y, auto-rotate on/off, and lock-on priority.
  - Charge hold threshold, i.e. tap vs hold cutoff. Default about 200–250 ms; this is a design proposal.
  - Talisman mode: draw, assisted, or quick-cast.
  - Haptics on/off and a reduced-motion toggle.
- **Hold vs tap disambiguation on Attack:** fire the light attack on **release** if the hold is under about 200 ms, or fire it immediately on press and treat a continued hold as a charge start (as HI3 does after combos). Charge stages at about 0.5 s and 1.2 s are design values to tune.
- **Drag-off to cancel** (Diablo-style) works for Barrier placement. Press and hold Barrier, a ground reticle appears, drag the finger to position it (or it follows the stick and camera), release to place, and drag onto an "×" zone to cancel.
- **Dodge vs Boost:** on the ground, Dodge = step in the stick direction (or backstep with neutral stick). Airborne, the same button = Boost dash. This keeps the button count down.

### Gaps
- Large-scale complaint data (e.g., app store review mining) for 2025–2026 titles was not found in this search.

---

## 6. Web-specific implementation: Pointer Events, iOS gestures, joystick libraries, haptics

### Takeaway
Use **Pointer Events** keyed by `pointerId`, with `touch-action: none` on the game canvas or HUD so the browser does not steal gestures and fire `pointercancel`. Treat `pointercancel` like `pointerup`. **iOS has no Vibration API in any browser.** The only web haptic on iOS is a fragile hack that clicks a hidden `<input type="checkbox" switch>`, so haptics must be progressive enhancement.

### Cited Findings
- **MDN `touch-action`:**
  - `none` = the browser handles no pan or zoom gestures.
  - `manipulation` = pan and pinch-zoom allowed, but double-tap zoom disabled, which removes the click delay.
  - When the browser starts handling a gesture, a Pointer Events app gets **`pointercancel`**. Setting `touch-action` declares which gestures the app will handle. Touch Events apps use `preventDefault()` but should still set `touch-action` so the browser knows the intent up front.
  - Changing `touch-action` mid-gesture has no effect on that gesture.
  - The browser intersects the values of the touched element and its ancestors.
  - Baseline "widely available" since Sept 2019.

  — [MDN: touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action)
- **MDN multi-touch with Pointer Events:** cache events per `pointerId`. Route `pointerup`, `pointercancel`, `pointerout`, and `pointerleave` to the same handler. Set `touch-action: none` on the body to prevent default touch behavior. (MDN's sample declares `logEvents` twice, which is a SyntaxError if copied verbatim.) — [MDN: Multi-touch interaction](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events/Multi-touch_interaction)
- **Joystick multitouch:** store the identifier at activation and process only that finger's events. Handle cancel and off-canvas. — [Abratabia](https://www.abratabia.com/game-controls/virtual-joystick.php)
- **Vibration API support:** Chrome and Samsung Internet on Android have full support, and Firefox and Opera are Android-only. **iOS does not support it in any browser**, since all use WebKit. As of 2026 Apple has not indicated plans to support it. It requires a secure context, stops when the page loses focus, and may be throttled or capped at about 10 s. — [web-haptics docs: Browser support](https://www.mintlify.com/lochie/web-haptics/advanced/browser-support)
- **iOS Safari haptic workaround:** the WebHaptics library creates a hidden `<input type="checkbox" switch>` and clicks its label, which triggers iOS's built-in switch-toggle haptic tick. Multi-step patterns are done as multiple clicks. The author calls it a hack that may break if Apple deems it misuse. WebKit opposes the Vibration API. — [azukiazusa.dev: iOS Safari で触覚フィードバックを実現する WebHaptics](https://azukiazusa.dev/blog/ios-safari-web-haptics.md)
- Apple HIG recommends pairing haptics with audio cues and never relying on a single channel. — [Apple HIG: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)

### Inferences
- **Input architecture:**
  - Use one full-screen transparent HUD layer over the Three.js canvas, with `touch-action: none` and `user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;`.
  - On `pointerdown`, route by region and the button under the point:
    - **Left zone** → claims as the joystick pointer (only if none is active).
    - **Button hit** → claims as that button's pointer.
    - **Otherwise (right zone)** → claims as the camera pointer (only if none is active).
    - **Drawing mode** → any pointer is the draw pointer.
  - Store `Map<pointerId, role>`. Call `setPointerCapture(pointerId)` so a finger sliding off a button keeps its role, which is needed for hold-charge and drag-to-aim Barrier.
  - Treat `pointercancel` and `lostpointercapture` as release, and reset all on `visibilitychange` and `blur`.
- **Blocking iOS gestures:**
  - Add `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">`.
  - Call `preventDefault()` on `gesturestart` (iOS pinch) and `touchmove` with `{passive:false}` as belt-and-braces.
  - Set `overscroll-behavior: none` on html and body.
  - Use the Fullscreen API where available. iPhone Safari does not support element fullscreen for non-video elements; installing as a PWA (standalone display) is the practical route. Both are general platform knowledge, not re-verified this session.
  - Use the Screen Orientation lock where supported, and otherwise show a "rotate to landscape" overlay.
- **nipplejs-like joystick:** implement in-house (about 100 lines) using the abratabia parameters, or use nipplejs in `dynamic`/`semi` mode. nipplejs's API was not fetched this session.
- **Haptics wrapper:** use `navigator.vibrate` if present (Android). Patterns:
  - Node capture: 8–12 ms.
  - Hit confirm: 15–20 ms.
  - Perfect dodge: [20, 30, 20].
  - Seal complete: [30, 40, 60].

  On iOS, either skip haptics or opt in to the switch hack behind a setting. Always pair with audio and visual cues.

### Gaps
- I did not verify the minimum iOS version for `<input switch>` (believed to be Safari 17.4/18 era) or whether it fires a haptic when the click is not from a direct user gesture.
- nipplejs's current maintenance status and options were not checked.
- iOS Safari's 2026 support for the Screen Orientation lock and element Fullscreen on iPhone was not verified this session.
