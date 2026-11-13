# Comparable Console Action Games: Adoptable Design Patterns for a Soukaigi-Style Mobile-Browser Game

Scope: mechanics only (not story). Each section maps findings to a Soukaigi system: stance-charged specials, enemy-sealing barriers, talisman spells chosen by count, five-element weaknesses, region purification, and collectible crystals. Numbers are given only where a source stated them. Many fan wikis describe systems in words without numbers; those cases are listed under Gaps.

---

## Q1. Ōkami Celestial Brush: lessons for a "trace a pentagram" talisman spell on a touchscreen

### Takeaway
Ōkami pauses the game and turns the screen into a canvas. Each of its roughly 13 techniques is a very simple primitive shape: a line, circle, loop, arc, two horizontal lines, a U-shape, or a path drawn from a source object. The shapes depend on *what you draw on* (context) as much as on the shape itself. Ink is a small integer resource: 3 pots at the start, 10 at most, and pots refill over time. Reviewers still complained that patterns were not always recognized. A pentagram is much more complex than any Ōkami glyph, so a touch version needs strong tolerance or a guided/connect-the-dots approach.

### Cited Findings
- Activation: "The player pauses the game and calls up a canvas, then draws on the screen." The original used the left analog stick. Later ports added the Wii Remote, Joy-Con, touchscreen (Switch) and PlayStation Move, and a mouse was reported to work well on PC. — [Wikipedia: Ōkami](https://en.wikipedia.org/wiki/%C5%8Ckami)
- Wii version: one button draws free-form strokes and "the other draws a straight line from the starting point." This is a helper for straight-line glyphs. GameSpot said the brush controls "improves the pace of the game." — [Wikipedia: Ōkami](https://en.wikipedia.org/wiki/%C5%8Ckami)
- Recognition problems: reviewers reported "difficulty in getting the game to recognize the correct Celestial Brush patterns." — [Wikipedia: Ōkami](https://en.wikipedia.org/wiki/%C5%8Ckami)
- Number of techniques: "thirteen Celestial Brush techniques" in Ōkami, and the fandom wiki says 11 in Ōkamiden. Techniques are unlocked by completing constellations, and some upgrade to new patterns (for example, Inferno → Fireburst). — [Wikipedia](https://en.wikipedia.org/wiki/%C5%8Ckami); [Ōkami Wiki](https://okami.fandom.com/wiki/Celestial_Brush_techniques)
- Glyph vocabulary (all simple):
  - Power Slash = one straight line through the target
  - Sunrise = circle in the sky
  - Bloom = circle around a plant
  - Water Lily = circle on water
  - Cherry Bomb = circle with a line running out of it
  - Galestorm = swirl/loop
  - Crescent = arc in the sky
  - Veil of Mist = two horizontal lines (slows time "to a near-stop for four seconds")
  - Magnetism = U-shape linking two marked objects
  - Inferno, Waterspout and Thunderstorm = a path drawn *from* an existing fire, water or electricity source

  — [Ōkami Wiki: Celestial Brush techniques](https://okami.fandom.com/wiki/Celestial_Brush_techniques)
- Ink pots: 3 at the start, 10 maximum. More pots come from Praise, baskets and enemy drops. In Ōkami pots refill over time; in Ōkamiden they do not (except in Greenhorn mode). A basic technique costs 1 pot or half a pot, and secret techniques cost several. Infinite ink is available temporarily (Inkfinity Stone) or permanently (String of Beads). — [Ōkami Wiki: Ink Pot](https://okami.fandom.com/wiki/Ink_Pot)
- Design intent (producer Atsushi Inaba): the brush came from asking how players could "participate in this artwork instead of just watching it." — [Wikipedia: Ōkami](https://en.wikipedia.org/wiki/%C5%8Ckami)

### Inferences
- A touch talisman system should copy the **pause/slow-time canvas**. Drawing a pentagram during real-time combat on a phone is too hard. Pausing fully, or slowing time to about 10–20%, lets the gesture be a deliberate act and keeps the rhythm of Soukaigi's "pick a spell" moment.
- **Keep glyphs primitive.** A freehand pentagram (5 strokes, one continuous path with exact crossings) is far harder to recognize than Ōkami's 1-stroke shapes, and Ōkami's simple shapes still drew complaints. Options:
  1. Connect-the-dots: show 5 nodes (the five elements) and have the player swipe through them in star order. Recognition becomes a check of node order, which is nearly error-free.
  2. Freehand drawing with a template matcher such as the $1/$N unistroke recognizers (not researched here; listed as a gap).
- **Context-sensitive glyphs** (drawing from a fire source = fire spell) map well onto five elements: draw from or onto an elemental node or enemy to choose the element. This could replace Soukaigi's "spell chosen by count" with "spell chosen by stroke or target."
- An **integer ink resource (3→10 pots, regenerating)** is a clear, readable model for a talisman (札) count. Soukaigi's "number of talismans spent chooses the spell" could become "the number of ofuda/ink pots spent sets the spell tier."
- Ōkami's Wii "straight-line" helper button suggests offering **auto-straighten/snap** on touch, which matters most for pentagram edges.

### Gaps
- No source found giving Ōkami's recognition tolerance, its algorithm, or its exact ink refill rate.
- I did not confirm whether time fully stops or which visual filter (sepia/paper) is used; Wikipedia only says the game "pauses."
- $1/$N gesture recognizer accuracy figures were not researched.

---

## Q2. Nioh / Nioh 2: Ki, Ki Pulse, stances, Yokai Realm ≈ Soukaigi's 衰氣/旺氣 field gauge

### Takeaway
Nioh's Ki is a combined stamina and attack resource. After attacking, a timed button press (Ki Pulse) recovers some of the spent Ki. In Nioh 2, enemy Burst Attacks spawn a **Yokai Realm** pool that greatly reduces the player's Ki recovery and strengthens yokai. A Ki Pulse performed inside the realm cleanses it, and interrupting the Burst Attack prevents the realm from appearing at all. This is a close modern parallel to a corrupted field gauge (衰氣) that the player turns positive (旺氣) through skilled play.

### Cited Findings
- Ki is a stamina bar: "If your Ki reaches zero, you will not be able to attack until it recovers." Strong attacks cost more Ki. — [Nioh 2 Wiki: Combat](https://nioh2.wiki.fextralife.com/Combat)
- Ki Pulse: press R1 while blue lights gather around you after an attack. "The amount varies based on your timing. The maximum amount is determined by your Ki Gauge." — [Nioh 2 Wiki: Combat](https://nioh2.wiki.fextralife.com/Combat)
- Yokai Realm: inside it, your Ki recovery is "greatly reduced" and yokai powers are enhanced. A successful Ki Pulse in the realm cleanses it. The realm appears after an enemy Burst Attack, and none appears if you interrupt the attack. — [Nioh 2 Wiki: Combat](https://nioh2.wiki.fextralife.com/Combat)
- Skill-tree reward for purifying: "Purify Yokai Realm: Earth" (1 skill point, Low Stance) "Increases your Ki recovery speed when you perform a purification with a perfectly timed Ki Pulse." — [Nioh 2 Wiki](https://nioh2.wiki.fextralife.com/Purify+Yokai+Realm:+Earth)
- Burst Counter (R2 + Circle) costs 1 Anima. Interrupting an enemy Burst Attack with it inflicts "a large amount of Ki damage." — [Nioh 2 Wiki: Combat](https://nioh2.wiki.fextralife.com/Combat)
- Three stances:
  - High: attack power
  - Mid: defense and versatility
  - Low: dodging, low Ki use, keeps guard while moving

  Stances are switched with R1 + a face button. — [Nioh 2 Wiki: Combat](https://nioh2.wiki.fextralife.com/Combat)
- Soul Cores (Yokai Abilities): a Guardian Spirit holds 2 (later 3) cores. Each fires with R2 + a face button and costs a different amount of Anima. Anima is gained by landing melee attacks. — [Nioh 2 Wiki: Combat](https://nioh2.wiki.fextralife.com/Combat)

### Inferences
- **Turn 衰氣/旺氣 into a local field state, not only a global meter.** Enemies emit corrupted zones (衰). Inside a zone the player regenerates resources slowly and enemies are buffed. A well-timed action (a "Ki Pulse" analog, such as a timed stance release or a perfect talisman cast) converts the zone to 旺. This makes the field gauge a moment-to-moment tactical layer.
- **Interrupting a telegraphed enemy special prevents the corruption.** This gives a clear "counter window" that a mobile player can learn (Burst Counter pattern).
- **A timed post-attack button press** (Ki Pulse: blue particles converge, tap to recover) works well on touch as a single rhythm tap. The visual cue of converging particles is the timing signal.
- **Resource from offense** (Anima from melee hits) is a good model for charging talisman or special meters without grinding.

### Gaps
- No source gave the Ki Pulse timing window in frames or the exact reduction in Ki recovery inside the Yokai Realm.
- Yokai Shift duration and Amrita gauge numbers were not found.

---

## Q3. Onimusha, Ghost of Tsushima, Sekiro, DMC/Bayonetta, Brave Fencer Musashi, Kingdom Hearts

### Takeaway
Most of these games reward **precise defense** (deflect, perfect dodge, Issen) with a **temporary power state** (stagger, Witch Time, chained instant kills) and **signal danger with color or kanji telegraphs**. Several also map **stances or weapons to enemy archetypes**. These patterns line up with Soukaigi's stance-charged specials and five-element weaknesses.

### Cited Findings

**Sekiro (deflect and posture)**
- The deflect window is "12 frames by default (0.2 seconds before the attack hits)." Recent guard presses shrink it to as little as 4 frames, or 0 if the button is spammed. The spam penalty clears after 30 frames and immediately after a successful deflect. Pressing too early just gives a normal block. — [Sekiro Wiki: Deflection](https://sekiroshadowsdietwice.wiki.fextralife.com/Deflection)
- A deflect builds the enemy's Posture by a significant amount. Consecutive deflects in a short span increase Posture damage per deflect. Perilous attacks are flagged with a red "危" (danger) kanji. — [Sekiro Wiki: Deflection](https://sekiroshadowsdietwice.wiki.fextralife.com/Deflection)

**Bayonetta (Witch Time)**
- Triggered by "dodging an enemy's attack at the last possible moment."
- Durations by game:
  - Bayonetta 1: 2–4 s, extended until the current combo ends.
  - Bayonetta 2: 0.5–3 s base depending on the attack; enraged enemies halve it; every damage instance extends it with no cap (example: 4 s → 12 s).
  - Bayonetta 3: about 1 s base, ×4 on a Perfect Dodge, Perfect Block or Bat Within, ×6 with the Earring of Time.
- Witch Time gives a 1.5× combo-point bonus in Bayonetta 2/3.
- Bat Within: pressing dodge on the exact frame of being hit still triggers Witch Time.
- On the hardest difficulty, dodge-triggered Witch Time is disabled.

— [Bayonetta Wiki: Witch Time](https://bayonetta.fandom.com/wiki/Witch_Time)

**Onimusha: Way of the Sword (2026)**
- Issen is a high-timing counter that can be **chained across a group** if each strike is timed. It does not work on every attack.
- Oni Awakening makes the Issen timing window "extremely lenient," so the power state widens the skill window.
- Perfect dodges fill a Reflex meter; when it is full, the next dodge triggers slow motion.
- Bosses' pink unblockable attacks absorb your souls and power them up.

— [AllThings.How: Onimusha mechanics](https://allthings.how/onimusha-way-of-the-sword-hidden-mechanics-and-systems-explained/) (secondary guide; no numeric windows given)

**Ghost of Tsushima (stances)**
- Four stances, each strong against one enemy archetype:
  - Stone vs Swordsmen
  - Water vs Shieldmen
  - Wind vs Spearmen
  - Moon vs Brutes
- Heavy attacks in the matching stance add stagger damage. Stances are switched by holding R2.
- Stances are unlocked by killing or observing Mongol leaders (kill = 1 point, observing = 2 points).

— [GoT Wiki: Stances](https://ghostoftsushima.wiki.fextralife.com/stances); [GamingBolt](https://gamingbolt.com/ghost-of-tsushima-guide-all-stances-and-techniques)

- Standoff: started with D-pad Up when a "Flash of Insight" appears; a one-on-one duel with a film-style camera. Resolve (yellow orbs) heals or powers finishers, and a perfect parry restores some Resolve. — [GoT Wiki: Combat](https://ghostoftsushima.wiki.fextralife.com/Combat)

**Devil May Cry (Style rank)**
- Grades run from D to SSS. Each attack adds points, and "performing the same moves repeatedly will see diminishing returns."
- Inactivity drains the gauge, faster at higher grades.
- Penalty for being hit:
  - DMC1/2: rank lost completely
  - DMC4: drops two levels (A→C, S/SS/SSS→B)
  - DmC: the grade is held until the battle ends
- Rank at the time of an enemy's death decides its Red Orb drop.

— [DMC Wiki: Stylish Rank](https://devilmaycry.fandom.com/wiki/Stylish_Rank)

**Brave Fencer Musashi (1998, Square; a PS1 peer of Soukaigi)**
- The Fusion sword can "absorb an enemy's skill" and also absorbs Bincho energy, which powers spells. Lumina takes on elemental properties from **five elemental Scrolls**, each giving new skills.
- Legendary Armor parts unlock traversal abilities such as climbing and double jumps.

— [Wikipedia: Brave Fencer Musashi](https://en.wikipedia.org/wiki/Brave_Fencer_Musashi)

**Kingdom Hearts II (Reaction Commands)**
- A single context-sensitive Triangle prompt that appears in response to enemy techniques or nearby objects.
- Most are forgiving: "You can hold Triangle until the command starts, with no penalty." Only 3 in the game penalize mistimed input.
- There are 17 non-battle (field) commands.

— [KH Wiki: Reaction Command](https://www.khwiki.com/Reaction_Command)

### Inferences
- **Telegraph colors and kanji**, as in Sekiro's 危 and Onimusha's pink unblockables, fit an onmyōdō theme. Mark attacks that must be sealed or countered with a kanji or element-color sigil above the enemy.
- **Combine the reward states:** a perfect dodge or deflect starts a short slow-motion window (Witch Time, about 1–4 s) in which stance charges fill faster or a seal can be applied instantly. Onimusha shows that *widening the timing window* during a power state feels good and helps weaker players.
- **Penalize spamming the way Sekiro does** (window shrinks 12→4→0 frames on repeated presses, reset after 30 frames). This stops touch players from mashing the guard or counter button. A mobile game at 60 fps could use a more generous base (for example, 15–20 frames), because touch latency is higher. This is an inference, not sourced.
- **Map stances to archetypes, not just elements** (Ghost of Tsushima). Each Soukaigi stance or charge could add stagger against one enemy class, and the five elements apply on top.
- **KH-style reaction prompts** that can be pressed early with no penalty are ideal for mobile one-tap "seal now" or finisher actions.
- **Musashi's absorb** pattern (absorb an enemy skill, then use it) could be a seal → capture → shikigami/talisman loop: a sealed enemy becomes a summonable or elemental talisman.
- A **DMC-style rank** with diminishing returns for repetition, used as a crystal or reward multiplier, encourages using stances and talismans in varied ways.

### Gaps
- No frame data found for Onimusha Issen, the Ghost of Tsushima standoff, or whether time slows while switching stances in Ghost of Tsushima.
- No frame data for Witch Time trigger windows.
- No reliable data on soul colors in the classic Onimusha (2001) was retrieved this session.

---

## Q4. Charge/hold-release moves without accidental triggers

### Takeaway
I found only limited direct sourcing. Monster Hunter's Great Sword is a model hold-release design: charging is shown by visual flashes, there is a peak moment to release, and overcharging makes the attack *weaker*. Bayonetta and Kingdom Hearts show that forgiving input buffers reduce frustration. Soukaigi's "accidental special move" complaint is best solved by separating the charge input from the normal attack input and adding staged audio/visual cues. That solution is partly an inference.

### Cited Findings
- Monster Hunter 4U manual: "Charged Slashes will increase in power the longer you charge your attack. When you see a large flash of light, release the button for maximum damage" and "wait too long and it'll become weaker." — [Capcom MH4U manual](https://game.capcom.com/manual/MH4U/en/page-101.html)
- Nioh's Ki Pulse uses gathering blue light as the timing cue for a release-style input. — [Nioh 2 Wiki: Combat](https://nioh2.wiki.fextralife.com/Combat)
- Kingdom Hearts II reaction commands can be held early without penalty, showing forgiving input design. — [KH Wiki](https://www.khwiki.com/Reaction_Command)
- Sekiro's spam penalty shows how a game can actively discourage indiscriminate input. — [Sekiro Wiki](https://sekiroshadowsdietwice.wiki.fextralife.com/Deflection)

### Inferences (design recommendations, not sourced)
- **Dedicated charge gesture on touch:** long-press on a separate stance button, or press-and-hold on empty screen, never the attack button. Require a minimum hold time (for example, 0.3–0.4 s) before any charge visuals start, so taps never turn into a charge.
- **Clear charge stages:** 3 levels, each with a flash, rising pitch, haptic pulse, and a ring that fills around the thumb. Monster Hunter's "flash = release now" is the reference.
- **Cancel window:** sliding the finger off the button or onto a cancel zone discards the charge without spending resources.
- **Overcharge decay** (Monster Hunter) adds skill but may frustrate casual mobile players. A softer option is holding at maximum.

### Gaps
- No GDC talk or postmortem found that addresses the "accidental charge move" problem directly.
- No frame data on Monster Hunter charge levels was retrieved (the manual gives none).

---

## Q5. Enemy sealing/binding mechanics and balance

### Takeaway
The closest modern parallel found is Ghostwire: Tokyo (Tango Gameworks, Japanese spiritual theme). The player **cleanses torii gates** to lift a deadly fog that blocks exploration. Cleansing is a hold action that **a strong enemy can interrupt**, and guards must be cleared first. Nioh 2's realm cleansing and Burst Counter are the combat-scale equivalents. Paralysis in Nioh 2 is a natural "binding" status that breaks on the first hit, which keeps it balanced.

### Cited Findings
- Ghostwire: Tokyo
  - Torii gates (arch icon on the map) are cleansed with L2 (an animation plays) to remove "a hazardous fog spread across the map" that blocks exploring.
  - Enemy groups may guard a gate, and "a strong enemy can interrupt the cleansing."
  - Some areas require several smaller gates to be cleansed before the fog lifts.

  — [Twinfinite: Ghostwire Tokyo fog guide](https://twinfinite.net/guides/ghostwire-tokyo-how-clear-fog/)
- Nioh 2 Paralysed: "Prevents movement until the target is hit once." This is a binding effect that the follow-up hit consumes. — [Nioh 2 Wiki: Status Effects](https://nioh2.wiki.fextralife.com/Status+Effects)
- Interrupting a Burst Attack prevents the Yokai Realm, and the Burst Counter deals heavy Ki damage. — [Nioh 2 Wiki: Combat](https://nioh2.wiki.fextralife.com/Combat)

### Inferences
- **Make sealing interruptible and conditional.** Soukaigi-like seals should require weakening first (posture or Ki broken, or HP below a threshold). A channeled seal that a strong nearby enemy can interrupt rewards clearing adds first, as Ghostwire does.
- **A binding status should break on the first hit**, like Nioh's Paralysis. This prevents permanent stun-locks while still giving a free opening.
- **Multi-node purification** (Ghostwire's several small gates) suits Soukaigi's region purification gating. Each region has N barrier anchors (結界の要) to seal, and once all are cleared the region turns from 衰 to 旺 and the area opens up.

### Gaps
- Ghostwire: Tokyo's hand-sign (kuji-kiri) gesture inputs and its "core grab" exposed-core finisher were not covered by the fetched source.
- No balance numbers for sealing mechanics were found in any source.

---

## Q6. Five-element combat and communicating elemental advantage

### Takeaway
Nioh 2 uses five damage-type statuses plus a combination state (Confused), with clear percentage modifiers. Genshin Impact uses an aura/gauge model with exact multipliers (Vaporize/Melt 2.0× forward, 1.5× reverse). Brave Fencer Musashi used five elemental scrolls. A wuxing/gogyo system can borrow the clean numeric layering of Nioh and Genshin while showing advantage with icons and auras.

### Cited Findings
- Nioh 2 statuses (each fills by hitting with the matching damage type; each has an icon):
  - Scorched (fire): fast damage over time; dodging removes it early
  - Saturated (water): +20% physical damage taken
  - Electrified: slows attack, movement and item use
  - Purified: +50% Ki damage taken; removes Corruption; blocks new positive statuses
  - Corrupted: +35% Ki damage; attacker absorbs Ki; reduces yokai max Ki
  - Confused: triggered automatically by **any two** of Purity, Corruption, Scorched, Saturated or Electrified; +50% damage received

  — [Nioh 2 Wiki: Status Effects](https://nioh2.wiki.fextralife.com/Status+Effects)
- Genshin Impact elemental gauge:
  - Aura application has a 0.8× "Aura Tax" (1U→0.8U, 2U→1.6U, 4U→3.2U).
  - Decay per unit: 1U = 11.875 s, 2U = 7.5 s, 4U = 5.3125 s.
  - Duration ≈ 2.5 × GU + 7 s.
  - Amplifying reactions: Vaporize/Melt 2.0× forward, 1.5× reverse.
  - Gauge consumption: strong trigger 2×, weak trigger 0.5×, Swirl/Crystallize 0.5×.
  - Anemo and Geo cannot be applied as auras.

  — [KQM Elemental Gauge Theory](https://library.keqingmains.com/combat-mechanics/elemental-effects/elemental-gauge-theory)
- Brave Fencer Musashi: five elemental Scrolls imbue the Lumina sword and unlock skills. — [Wikipedia](https://en.wikipedia.org/wiki/Brave_Fencer_Musashi)

### Inferences
- **Use gogyo's two cycles as mechanics:**
  - 相剋 (overcoming): weakness hits deal about 1.5–2.0× (Genshin's range) and stagger.
  - 相生 (generating): applying element A, then the element it generates, amplifies or buffs. This is analogous to Genshin's aura→trigger, where order matters.
- **The "any two elements → Confused" rule** from Nioh 2 is a simple, readable combination rule for a mobile game: hitting an enemy with two different gogyo elements triggers 乱 (disorder), for example +50% damage taken.
- **Show auras on enemies.** A small element kanji or color ring (木火土金水) on the enemy, plus an arrow or flash when the player's equipped element beats it, and "弱点!" damage-number styling. All Nioh 2 statuses have icons, which confirms the icon convention.
- Keep a **short decay timer** on applied elements (Genshin's roughly 7–12 s) so combos must happen within a window.

### Gaps
- No Chinese wuxia/xianxia game (for example, Xuan-Yuan Sword or Gujian) with a documented wuxing combat system was researched this session.
- No source found with a UX study on how players read elemental advantage.

---

## Q7. Vertical collectibles and traversal without tedium

### Takeaway
Celeste's developer documented a set of invisible leniency techniques, including coyote time, jump buffering, half gravity at the jump apex, corner correction, and wall-jump distance tolerance (2 px, or 5 px for super wall jumps). Brave Fencer Musashi gated vertical exploration behind armor-part upgrades (climb, double jump). For a 3D mobile game, these leniency rules plus traversal upgrades turn high-ledge crystal collection from tedious to rewarding.

### Cited Findings
- Celeste (Matt Thorson / Maddy Thorson):
  - Coyote time: "You can still jump for a short time after leaving a ledge."
  - Jump buffering: a jump pressed just before landing fires on the landing frame.
  - "If you hold the jump button, the top of your jump has half gravity applied."
  - Jump corner correction and dash corner correction pop the player up onto ledges.
  - Wall jumps allowed from 2 px away, super wall jumps from 5 px away (at 320×180 resolution).
  - Lift momentum is stored for "a few frames."

  — [GIGAZINE (Celeste dev)](https://gigazine.net/gsc_news/en/20200317-celeste-action-feel-things)
- Brave Fencer Musashi: Legendary Armor parts grant climbing and double jumps, which gate exploration. — [Wikipedia](https://en.wikipedia.org/wiki/Brave_Fencer_Musashi)
- Kingdom Hearts II: context reaction commands include traversal moves such as "Ride the Wind" on a whirlwind, so a one-button context action carries the player upward. — [KH Wiki](https://www.khwiki.com/Reaction_Command)

### Inferences
- In 3D on mobile, use:
  - coyote time (about 0.1 s; not sourced in seconds)
  - a jump buffer
  - **automatic ledge grab/mantle** when the character's hands reach a ledge
  - half gravity at the apex while jump is held
  - a midair dash or a "spirit step" (霊歩) double jump unlocked mid-game, as Musashi did with armor parts
- Make collectibles **visible from a distance** with a light pillar or chime, and place them along **routes that teach a new traversal upgrade**.
- Use **context traversal objects** (KH "Ride the Wind" style), such as wind talisman updrafts or spirit-vine anchors, so high crystals become one-tap spectacles instead of precision platforming.
- Gate some crystals behind traversal abilities so the player returns later (Metroidvania loop). Show "unreachable for now" with a distinct icon to avoid frustration.

### Gaps
- No frame or second values for coyote time or jump buffer came from a primary source; the Celeste article gives none.
- No sources gathered on 3D-specific ledge-grab design (for example, Mario Odyssey or Zelda: BotW climbing stamina) or Game Maker's Toolkit analyses.
