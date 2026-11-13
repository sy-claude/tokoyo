# Game Feel Parameters and Third-Person Camera / Lock-On Design for a 3D Melee Action Game (60 Hz fixed update)

Context: the goal is to avoid Soukaigi's (1998) "sluggish, weak hit feedback, poor jump, disorienting camera" problems. All frame counts below are given at 60 fps unless stated otherwise. Conversions: 1 frame at 60 Hz = 16.7 ms, and 1 frame at 30 fps = 33.3 ms.

Source quality note: I used 19 tool calls. Primary or near-primary sources were found for Smash Bros hitlag (community wiki that reverse-engineered the formulas), Sakurai's own Famitsu column (fan translation), Elden Ring i-frames (community wiki), Bayonetta Witch Time durations (fan wiki) and Celeste's forgiveness mechanics (developer's own article). Several requested items could not be confirmed with numbers: Nesky's 50 rules, Eiserloh's exact shake constants, DMC5 and Sekiro frame data, and Arkham or God of War token counts. They are listed under Gaps and must not be treated as sourced.

## 1. Hit feedback: hit stop, shake, flash, knockback

### Takeaway
Hit stop should scale with damage or attack weight, up to a cap. Sakurai's Smash freezes the attacker and the victim for the same time, makes the victim shake (horizontally on the ground, vertically in the air) with decaying amplitude, and lets the attacker creep forward slightly. Smash Ultimate's formula is `(damage×0.65+6)` frames, capped at 30. That puts light hits at about 6–9 frames and heavy hits at about 15–20 frames at 60 fps. These are useful anchors for light, heavy and finisher tiers.

### Cited Findings
- Sakurai's reason for hit stop: both characters "momentarily freeze, emphasizing the power of impact." Damage is the main factor in its length (stronger attacks pause longer). Each attack can also carry its own modifier. Examples: Marth's sword tip gets extra hitstop, projectiles get less, and electric attacks get more. A hard cap exists, and "the hitstop period will never exceed this limit." — [Source Gaming translation of Sakurai's Famitsu column vol. 490](https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/) (official designer statement, fan translation)
- In Smash, attacker and victim freeze for "the exact same amount of time." The attacker also vibrates slightly, unlike in most fighting games where only the victim shakes. The attacker moves "extremely slowly" during hitstop, like slow motion, and this can be turned off per move. — [Source Gaming / Sakurai](https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/)
- Shake direction: grounded characters vibrate side to side and airborne characters vibrate up and down, so feet don't clip into the floor. Hurtboxes stay in place during the shake so hits don't whiff. Shake intensity scales with camera distance and gradually decreases during the freeze. The flinch pose blends into the hurt animation over "four frames" during hitstop. — [Source Gaming / Sakurai](https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/)
- Sakurai's YouTube video "Eight Hit Stop Techniques" covers: (1) shake the victim strongly, (2) keep the hitbox fixed, (3) shake horizontally on the ground and vertically in the air, (4) decay the shake gradually, (5) control the hit stop amount, (6) interpolate into the damage pose, (7) keep the attacker moving slightly, (8) scale the shake by camera distance. — [Nintendo Wire summary](https://nintendowire.com/news/2022/12/12/this-week-in-sakurai-12-5-12-11-fine-tuning-hit-stop-and-cheating-the-system/); [GoNintendo](https://www.gonintendo.com/contents/13581-sakurai-s-latest-game-dev-video-features-8-hit-stop-techniques)
- Smash hitlag formulas (community reverse-engineered, 60 fps frames, d = damage %):
  - Melee: `floor(d/3+3)`, capped at 20 frames.
  - Brawl and Smash 4: `floor(d×0.3846+5)×h`, capped at 30 frames.
  - Ultimate: `floor((d×0.65+6)×h×e×s)`, capped at 30 frames.
  - Electric attacks get ×1.5.
  - Crouch cancel gets ×0.67.
  - Shielding gets ×0.67.
  - Example at 15% damage: 8 frames in Melee, 10 in Brawl and Smash 4, 15 in Ultimate. — [SmashWiki: Hitlag](https://www.ssbwiki.com/Hitlag)
- Smash also cuts hitlag in free-for-alls. When accumulated hitlag is over 10 frames, a multiplier applies: 0.925 with 3 players, 0.862 with 4, 0.75 with 8. The purpose is to let third parties act. — [SmashWiki: Hitlag](https://www.ssbwiki.com/Hitlag); this matches Sakurai's stated reason in [Source Gaming](https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/)
- Freeze timing and edge cases:
  - The attacker freezes on the frame the hit lands. The victim freezes on the first frame of the flinch animation and shakes.
  - The attacker still gets hitlag if the target is invincible.
  - Hits with no damage get no hitlag.
  - On a perfect shield, only the attacker gets hitlag. — [SmashWiki: Hitlag](https://www.ssbwiki.com/Hitlag)
- Third-person camera practice from Batman: Arkham Asylum: the camera offsets to the side while exploring, then zooms out and centers in combat. It also centers while sprinting. — [Game Developer: third-person camera problems](https://www.gamedeveloper.com/design/third-person-camera-view-in-games-a-record-of-the-most-common-problems-in-modern-games-solutions-taken-from-new-and-retro-games)

### Inferences
- Suggested hit stop tiers at 60 Hz, extrapolated from the Smash Ultimate formula with typical action-game damage. These are my recommendations, not sourced values from a melee 3D game.
  - Light: 4–6 frames (67–100 ms).
  - Medium: 7–9 frames.
  - Heavy: 10–14 frames.
  - Finisher or launcher: 15–20 frames.
  - Hard cap: about 20–30 frames.
  - Against multiple enemies, scale down so multi-hit sweeps don't feel stuttery. This mirrors Smash's player-count reduction.
- Who freezes: attacker and victim by default, both for the same time (Sakurai). Exceptions:
  - World, VFX and camera keep a small amount of motion.
  - The attacker keeps sliding at about 5–10% speed (Sakurai's "slow motion" movement).
  - The victim shakes with decaying amplitude. Shake horizontally if grounded and vertically if airborne.
- Hit stop needs a local time scale per entity, not a global `Time.timeScale = 0`. Otherwise a sweep hitting several enemies can't freeze each victim on its own, and UI and audio stall. Input must keep buffering during hit stop.
- Trauma-based shake (Eiserloh's GDC 2016 talk "Juicing Your Cameras With Math", [GDC Vault](https://gdcvault.com/play/1023146/Math-for-Game-Programmers-Juicing)). From memory of the talk and common implementations, not verified in this session:
  - Keep `trauma` in the range 0–1. Each hit adds to it. It decays linearly at about 0.8–1.5 per second.
  - Shake magnitude is `trauma²` (or `trauma³`).
  - Offsets and rotation use smooth Perlin noise rather than random noise.
  - Rotational shake matters most in 3D. Suggested limits: about 1–3° for light hits and 5–10° for big hits, and about 0.1–0.5 m translation.
  - Treat these numbers as tuning starting points.
- Never shake the camera on every light hit. Reserve it for heavy hits, finishers, and hits taken by the player. This also prevents motion sickness (see section 5).

### Gaps
- Vlambeer's "Art of Screenshake" (Jan Willem Nijman) was not fetched. Its techniques (bigger bullets, hit flash, permanence, sleep frames, camera kick) are well known but not cited here.
- No Capcom or PlatinumGames interview with exact DMC or Bayonetta hit stop frame counts was found.
- Eiserloh's exact constants were not retrieved. The gamejuice.pages.dev guide was a placeholder page.
- No sourced values were found for hit flash duration, knockback distance, damage number style, particle counts, or sound layering. Common practice is a white or additive flash for 1–3 frames (about 50 ms) on the victim, plus a layered impact sound (transient, body, sweetener) with ±5–10% pitch randomization. This is unsourced.

## 2. Attack frame data, combo and cancel windows, input buffer

### Takeaway
Structure every attack as startup, active, then recovery, with explicitly flagged cancel windows (into the next combo hit, dodge, jump or special) and an input buffer that keeps working during hit stop. No 3D-action frame data (DMC5, Bayonetta) was obtained from a citable source in this session.

### Cited Findings
- Sakurai's Famitsu column "Learn to Count Frames" (vol. 552) argues that designers must think in frames. — [Source Gaming](https://sourcegaming.info/2018/05/18/learn-to-count-frames-sakurais-famitsu-column-vol-552/) (search result only; not fetched)
- Celeste uses jump buffering: "If you press and hold the jump button a short time before landing, you will jump on the exact frame that you land." — [Maddy Makes Games, "Celeste & Forgiveness"](https://maddymakesgames.com/articles/celeste_and_forgiveness/index.html) (developer primary source; no numeric value given)

### Inferences
- Recommended data schema per attack: these are design defaults for a 60 Hz action game based on general fighting and action conventions, not sourced numbers.

| Field | Light | Heavy | Finisher |
|---|---|---|---|
| startup (frames) | 5–8 | 12–20 | 15–25 |
| active (frames) | 2–4 | 3–6 | 4–8 |
| recovery (frames) | 10–16 | 20–30 | 30–45 |
| combo-input window opens | from active start (buffered) | same | n/a |
| combo-chain point (next attack can start) | ~recovery frame 4–8 | ~recovery frame 8–12 | none |
| dodge-cancel allowed from | first frame after active (or even during startup for light) | after active + 4–6 frames | after active + 8–12 frames |
| hitstop (frames) | 4–6 | 10–14 | 15–20 |

- Input buffer: queue the most recent action press for about 6–10 frames (100–167 ms). Give dodge priority over attack when both are buffered. The buffer must keep counting through hit stop, otherwise inputs pressed during the freeze are lost, which feels sluggish.
- A "sluggish" feel usually comes from long uncancelable recovery and dodge being locked out. In a Soukaigi-style remake, light-attack recovery should be cancelable into dodge almost immediately.

### Gaps
- No citable DMC5, Bayonetta or Ninja Gaiden frame data (startup, active, recovery, buffer lengths) was found.
- No official statement on input buffer length in a commercial 3D action game was found.

## 3. Dodge / step: distance, duration, i-frames, perfect dodge

### Takeaway
Elden Ring's roll gives 13–14 i-frames at 30 fps (about 0.43–0.46 s), and Quickstep gives 15 (about 0.5 s). The Bayonetta series turns a last-moment dodge into Witch Time slow-motion lasting about 1–4 s. That is the canonical perfect-dodge reward.

### Cited Findings
- Elden Ring (community wiki, frame counts at 30 fps):

| Move | Condition | I-frames at 30 fps | Approx. duration |
|---|---|---|---|
| Roll | Light or medium load | 14 | ≈0.46 s |
| Roll | Heavy load | 13 | ≈0.43 s |
| Roll | With Windy Crystal Tear or Crucible Feather talismans | 17 / 16 | — |
| Backstep | — | 7–8 | — |
| Quickstep skill | Against NPCs | 15 | ≈0.5 s |
| Quickstep skill | Against players | 19 | — |

  The wiki warns that doubling to get 60 fps counts "won't always yield accurate data." — [Elden Ring wiki: Invincibility Frames](https://eldenring.wiki.gg/wiki/Invincibility_Frames) (community-measured)
- Bayonetta Witch Time (fan wiki):
  - Trigger: dodging "at the last possible moment," or Bat Within (pressing dodge on the frame you would be hit).
  - Bayonetta 1: 2–4 s.
  - Bayonetta 2: 0.5–3 s per enemy attack, extendable by damage.
  - Bayonetta 3: about 1 s base. A Perfect Dodge or Perfect Block gives ×4.
  - It is disabled or restricted on the hardest mode (Non-Stop ∞ Climax). — [Bayonetta Wiki: Witch Time](https://bayonetta.fandom.com/wiki/Witch_Time)
- Bayonetta's Dodge Offset (holding an attack through a dodge without losing the combo) is a known 3D-action technique for chaining combos through evasion. — [Bayonetta Wiki: Dodge Offset](https://bayonetta.fandom.com/wiki/Dodge_Offset) (search result, not fetched)

### Inferences
- Recommended dodge for a responsive DMC or Bayonetta-feel action game at 60 Hz. This is my synthesis, not sourced.
  - Total duration: about 20–28 frames (0.33–0.47 s).
  - Distance: about 3–5 m.
  - I-frames: about 10–16 frames, starting on frame 1–3.
  - Recovery: about 6–10 frames, cancelable into attack.
  - Perfect-dodge window: the last 6–10 frames (100–167 ms) before an enemy hitbox becomes active. Reward with about 1.5–3 s of enemy slow-mo at about 0.2–0.3× time scale, or a counter.
- For accessibility, offer an easy mode with a wider perfect-dodge window (for example 12–15 frames).
- Souls-style (weighty, about 26–28 i-frames at 60 fps, a long roll and a stamina cost) suits a deliberate game. For a game fixing "sluggishness," lean toward the shorter, cancelable Bayonetta/DMC style.

### Gaps
- No sourced numbers were found for DMC5 dodge, Sekiro deflect window, or Genshin dash i-frames. Sekiro's deflect is widely reported as about 0.2 s, and Genshin dash i-frames at about 0.3 s, but neither is verified here.
- No numeric frame window for Bayonetta's Witch Time trigger was found.

## 4. Movement and jump

### Takeaway
Celeste's developer documents the standard forgiveness set: coyote time, jump buffering, half gravity at the jump apex while holding jump, and corner correction. The article gives no numbers, so values must come from tuning (community-standard coyote time is about 100 ms, or 6 frames at 60 Hz).

### Cited Findings
- Celeste's forgiveness mechanics:
  - Coyote time: "You can still jump for a short time after leaving a ledge."
  - Jump buffering: pressing jump shortly before landing makes you jump on the landing frame.
  - Apex half gravity: "If you hold the jump button, the top of your jump has half gravity applied."
  - Corner correction: bonking a corner "wiggle[s] you to the side around it."
  — [Maddy Makes Games, "Celeste & Forgiveness"](https://maddymakesgames.com/articles/celeste_and_forgiveness/index.html) (primary; no numeric values given)
- Motion and nausea: camera vertical bobbing and lateral rotation are cited as problematic. One suggested fix is a stabilized camera that follows vertically only after the character passes a height threshold (for example, after a jump). — [Game Developer](https://www.gamedeveloper.com/design/third-person-camera-view-in-games-a-record-of-the-most-common-problems-in-modern-games-solutions-taken-from-new-and-retro-games)

### Inferences
These are recommended config defaults (unsourced tuning starting points, 60 Hz):

| Parameter | Value |
|---|---|
| Coyote time | 6 frames (100 ms) |
| Jump buffer | 6–9 frames (100–150 ms) |
| Variable jump height | On early release, multiply upward velocity by 0.4–0.5 |
| Fall gravity multiplier | 1.5–2.5× rise gravity |
| Apex half-gravity | Applies while \|vy\| < threshold and jump is held |
| Terminal fall speed | Capped |
| Jump rise time | ≈0.3–0.4 s; "snappy" 3D action jumps peak quickly |
| Air control | 50–80% of ground acceleration |
| Air dash | Optional, 1 per airtime; ~0.2 s, ~4 m, gravity suspended |
| Ground acceleration | Reaches max run speed in ≈0.1–0.15 s (6–9 frames) |
| Deceleration | ≈0.05–0.1 s |
| Turn speed | ≥720°/s for responsive; snap to input direction at attack start |

- Root motion versus code-driven movement: use code-driven locomotion (responsive, tunable). Use root motion, or curve-driven displacement authored in data, only for attacks and dodges, so distances stay consistent. Allow attacks to rotate toward the input or lock-on direction during the first few startup frames.

### Gaps
- No primary source gave numeric coyote or buffer values in this session. The Celeste developer statements are qualitative, and frame values appear only in secondary blogs (e.g., [bugnet.io](https://bugnet.io/blog/coyote-time-and-input-buffering-explained), not fetched).

## 5. Third-person camera and lock-on

### Takeaway
Nesky's GDC 2014 talk ([GDC Vault](https://gdcvault.com/play/1020460/50-Camera); [YouTube](https://www.youtube.com/watch?v=C7307qRmlMI)) is the canonical reference, but its individual rules were not retrievable as text. Documented practical solutions:
- Center and zoom out in combat (Arkham).
- Dither or fade occluding foliage (Witcher 3).
- Use whisker raycasts to route around obstacles (A Hat in Time).
- Avoid camera bob and lateral sway, which cause nausea.

### Cited Findings
- Nesky: "Cameras are most noticeable when they fail." He worked as thatgamecompany's "feel engineer," a role focused on Journey's camera and controls. — [Game Developer video summary](https://gamedeveloper.com/design/video-50-common-game-camera-mistakes----and-how-to-fix-them); [Game Developer camera article](https://www.gamedeveloper.com/design/third-person-camera-view-in-games-a-record-of-the-most-common-problems-in-modern-games-solutions-taken-from-new-and-retro-games)
- Combat framing: Batman: Arkham Asylum offsets the camera while exploring, then zooms out and centers during combat. It also centers while sprinting so more of the area is visible. The article suggests temporarily centering when entering a fight, then restoring the camera. — [Game Developer](https://www.gamedeveloper.com/design/third-person-camera-view-in-games-a-record-of-the-most-common-problems-in-modern-games-solutions-taken-from-new-and-retro-games)
- Obstruction handling — [Game Developer](https://www.gamedeveloper.com/design/third-person-camera-view-in-games-a-record-of-the-most-common-problems-in-modern-games-solutions-taken-from-new-and-retro-games):
  - Witcher 3 makes foliage near the camera transparent (dithering).
  - Super Mario Sunshine shows a silhouette of the character through walls.
  - For Honor lets the camera pass through geometry and shows a "Cut-Out View" edge indicator.
  - A Hat in Time uses "Camera Whiskers," which detect nearby objects and steer the camera around them.
  - Sphere colliders make the camera bounce off walls and enemies (cited in Assassin's Creed Syndicate and Dark Souls 3). This is a known failure mode.
  - Final Fantasy XV's foliage can hide combat.
- Targeting and lock-on: Elder Scrolls Online's target disc sits at screen center rather than at the character's view center, which caused misses. — [Game Developer](https://www.gamedeveloper.com/design/third-person-camera-view-in-games-a-record-of-the-most-common-problems-in-modern-games-solutions-taken-from-new-and-retro-games)
- Motion sickness: caused by a mismatch between camera and character motion, especially lateral rotation and vertical bobbing (Tsurumi Roppyaku cited). Gears of War 4's running shake is a cited example. Fixed cameras (Super Mario 3D World, God of War era) are more stable but limit exploration. — [Game Developer](https://www.gamedeveloper.com/design/third-person-camera-view-in-games-a-record-of-the-most-common-problems-in-modern-games-solutions-taken-from-new-and-retro-games)
- Sakurai scales hit shake by camera distance, so the same impact reads the same at any zoom. — [Nintendo Wire](https://nintendowire.com/news/2022/12/12/this-week-in-sakurai-12-5-12-11-fine-tuning-hit-stop-and-cheating-the-system/)

### Inferences
Recommended camera config (unsourced tuning defaults):

**Follow and framing**
- Orbit (spring-arm) camera: distance 4–6 m out of combat, 6–9 m in combat.
- Pivot at shoulder height (about 1.4–1.6 m), with a small lateral offset (0.3–0.5 m) that goes back to 0 in combat (Arkham rule).
- Position follow damping: critically damped spring, about 0.1–0.2 s to settle. Rotation follow should be stiffer than position.
- Vertical follow: dead zone so the camera doesn't follow every jump hop (the stabilization rule above). Follow vertically only when grounded height changes or when airborne for longer than about 0.5 s.

**Auto-recenter**
- After 1.5–3 s with no stick input while moving, slowly rotate behind the player at about 60–90°/s.
- Never auto-rotate against active player input. Offer a manual recenter button (R3 or L).
- This rule is commonly attributed to Nesky's talk, but that attribution was not verified.

**FOV**
- Console or PC: 60–75° vertical.
- Mobile in landscape at small physical screen size: ≥70° horizontal-equivalent is common so enemies stay visible. Expose a slider.

**Obstruction**
- Spherecast (radius ≈0.2–0.3 m) from pivot to camera. Pull the camera in fast (≈0.05 s) and ease back out slowly (≈0.3–0.5 s).
- Exclude enemies and small props from the collision mask, which avoids the Souls/AC "bouncing" failure. Dither-fade those objects instead.
- Silhouette the player when occluded.

**Lock-on (hard lock)**
- Aim the camera at a weighted point, for example `lerp(player, target, 0.3–0.5)`, so both stay on screen. Raise pitch and pull back when the target is large or close.
- Clamp so the player stays in the lower-center third.
- Target selection score: angle from camera forward × distance weighting, preferring on-screen targets within about 20–30 m.
- Switching: a right-stick flick past about 0.7 deflection picks the nearest target in that screen direction. Add a cooldown of about 0.2–0.3 s between flicks.
- Break the lock automatically when the target is out of line of sight for more than about 1–2 s or beyond max range.

**Soft lock (no button)**
- On attack start, snap or rotate the player toward the best enemy within about 45–60° of stick direction and about 3–5 m. This is the default for crowd fights.
- Hard lock is for single strong enemies or bosses.

**Off-screen threats**
- Use edge-of-screen arrow indicators for enemies about to attack from off-screen. Tie them to the telegraph (section 6), and flash them when the attack is imminent.

**Anti-nausea**
- No camera bob while running.
- Limit shake rotation, and give a shake-intensity option (0–100%).
- Avoid sudden large FOV changes. Ease FOV over ≥0.3 s.
- Avoid camera cuts during player control.

### Gaps
- The text of Nesky's 50 rules could not be retrieved; GDC Vault and YouTube have no fetchable transcript, and the mirror sites were spam. Examples commonly attributed to the talk include: don't fight player input, don't let the camera pass through walls, avoid auto-rotating the camera in ways that disorient, and keep the horizon level. These are unverified.
- No sourced numeric lock-on parameters (target weighting, flick thresholds) from a shipped game were found.
- No sourced FOV recommendations for mobile were found.

## 6. Enemy readability: telegraphs, attack tokens, aggression management

### Takeaway
"Attack ticket" or token systems that limit how many enemies attack at once are standard in crowd melee games, including Marvel's Spider-Man 2. Tickets can be weighted by attack type, so a strong attack costs more tickets. Published token counts and telegraph durations for Arkham or God of War were not found.

### Cited Findings
- Attack-ticket systems are "often used in games with encounters that have between six or more active enemies." Marvel's Spider-Man 2 (2023) is cited as an example. Tickets can be assigned per attack type, so stronger attacks cost more. Dark Souls Remastered is described as having less orchestrated concurrency. Left 4 Dead 2's AI Director manages pacing by player "stress." — [Signals and Light: "How do simultaneous enemy attacks work?"](https://signalsandlight.substack.com/p/how-do-simultaneous-enemy-attacks)
- The "battle circle" approach: enemies circle the player, and only a few step in to attack, so the player feels surrounded while being attacked by few. — [Tuts+ Battle Circle AI](https://code.tutsplus.com/battle-circle-ai-let-your-player-feel-like-theyre-fighting-lots-of-enemies--gamedev-13535t) (search result; not fetched)

### Inferences
Recommended defaults (unsourced):

**Attack tokens**
- Global attack-token pool of 2 for normal play (1 on easy, 3 on hard). Light attacks cost 1 and heavy or grab attacks cost 2.
- Re-issue cooldown of 0.5–1.5 s per enemy after attacking.
- Enemies without a token keep 4–8 m away and strafe or taunt, with ranged enemies on their own separate pool.

**Telegraphs**
- Wind-up of 0.4–0.8 s (24–48 frames) for normal melee enemies, and 0.8–1.5 s for heavy or unblockable attacks.
- Use a distinct visual and audio cue (for example a red flash or glint) about 0.3–0.5 s before the hitbox becomes active.
- Attacks from off-screen must be telegraphed through the screen-edge indicator and a sound, or delayed until the enemy is on-screen.

**Pacing and fairness**
- Give no damage to the player during the player's own hit stop.
- Enemy aggression should scale with the player's recent damage taken, a stress-based director in the style of Left 4 Dead.

### Gaps
- Arkham's "freeflow" counter-window values and its limit on simultaneous attackers were not found from a primary source.
- God of War (2018) token or aggression numbers were not found.

## 7. Minimap, compass and waypoints against disorientation

### Takeaway
No sources were fetched on this topic in this session. Recommendations below are design inferences only.

### Cited Findings
- (none retrieved)

### Inferences
- Provide a top-of-screen compass strip with an objective marker, plus an optional rotating minimap (player-up). On the compass, show enemies within about 15–20 m as red ticks, which doubles as an off-screen threat indicator.
- Add a "point camera toward objective" button (for example, hold L3). Many 3D games use one, and it works well with auto-recenter.
- Use a world-space waypoint pillar or beacon visible above geometry, and distinct landmark silhouettes (towers, torii, pagodas for a Japanese setting) so players can orient by sight.
- After a cutscene or camera cut, keep the player's facing and screen-direction continuity (the 180° rule) so stick input still maps intuitively.

### Gaps
- No primary sources were found for minimap, compass, or waypoint studies.
