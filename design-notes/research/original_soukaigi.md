# 双界儀 (Soukaigi, Square / Yuke's, PS1, 1998): design reference dossier

Note on method and reliability:
- Most sources were read through WebFetch, which summarizes pages. Quotes marked "verbatim" were given as quotes by the fetch tool. Everything else is a paraphrase of the page.
- Pages that could not be read: ニコニコ大百科 (fetch error), raw ja.wikipedia (direct download blocked by the network proxy, so only the WebFetch summary was available), Hardcore Gaming 101 (site under maintenance), and Famitsu's own review page (not fetched).
- Main sources used:
  - [ja.wikipedia 双界儀](https://ja.wikipedia.org/wiki/双界儀) (WP-JA)
  - [ゲームカタログ@Wiki](https://w.atwiki.jp/gcmatome/pages/6771.html) (GC)
  - [en.wikipedia Soukaigi](https://en.wikipedia.org/wiki/Soukaigi) (WP-EN)
  - [GameSpot import review](https://www.gamespot.com/reviews/soukaigi-import-review/1900-2549379/) (GS)
  - [xneo.jp 双界儀完全攻略](https://xneo.jp/sokaigi/) (XN), a fan strategy page
  - [電撃オンライン retrospective](https://dengekionline.com/elem/000/001/725/1725957/) (DO)
  - [fan site my-niiku](http://www5b.biglobe.ne.jp/~my-niiku/sc_soukai/m1.html) (MN)
  - [小説家になろう essay wishing for a remake](https://ncode.syosetu.com/n1237eq/) (NC)
  - [3rd-in pedia](https://pedia.3rd-in.co.jp/wiki/%E5%8F%8C%E7%95%8C%E5%84%80) (3P)

## 1. PS controller mapping and how moves are input

### Takeaway
No source I could read gives a full button map. Only fragments are confirmed:
- The shoulder buttons control the camera and the quick 180° turn.
- L1/R1 handle targeting and lock-on, and lock-on replaces turning during boss fights.
- L2+R2 together make you look up.
- Holding the attack button charges 奥義.
- Down on the D-pad guards. This conflicts with the GC page's wording "forward movement with guard," so treat it as uncertain.

The inputs for ○×△□ remain a gap.

### Cited Findings
- "The shoulder buttons control the camera and allow your character to do quick 180-degree turns." (verbatim) — [GS](https://www.gamespot.com/reviews/soukaigi-import-review/1900-2549379/)
- Lock-on (L1/R1) exists only in boss fights. While locked on, normal turning and 反転 (the 180° turn) are disabled. — [WP-JA](https://ja.wikipedia.org/wiki/双界儀)
- L1 or R1, held, keeps the camera on the target and aims. Tapping it repeatedly helps line up attacks. L1/R1 is also mentioned in connection with 結界. — [XN](https://xneo.jp/sokaigi/) (fan guide; summarized wording, so the 結界 link is uncertain)
- L2+R2 makes the character look upward, which is used to spot ガラン石 placed high up. — [XN](https://xneo.jp/sokaigi/)
- Down on the D-pad guards, which is used against charging enemies. — [XN](https://xneo.jp/sokaigi/). GC lists 移動術 as "camera rotation, forward movement with guard, 180-degree turn, side step, back step, jump, high-speed forward boost, mid-air 宙返り." — [GC](https://w.atwiki.jp/gcmatome/pages/6771.html). The exact guard input is unclear.
- Holding × or ○ enters the 封陣展開 state (the talisman array), with temporary invulnerability. — [XN](https://xneo.jp/sokaigi/). In 封陣符, you draw the array with one button press, then add 咒符 (talismans) with further presses. Where you stop decides the effect. — [GC](https://w.atwiki.jp/gcmatome/pages/6771.html)
- 奥義: hold the attack button and the character cycles through 3–5 stances. Release on a stance to fire that technique. Each use costs 奥義マテリア, which drop from defeated enemies. — [GC](https://w.atwiki.jp/gcmatome/pages/6771.html). Attacks don't land on you during the 奥義 animation, so it doubles as an emergency dodge. — [WP-JA](https://ja.wikipedia.org/wiki/双界儀)
- Mashing the attack button chains the basic combo. — [WP-JA](https://ja.wikipedia.org/wiki/双界儀)
- Context decides the attack type. Standing gives 基本攻撃. Moving forward gives ダッシュ攻撃. During ブースト gives ブースト攻撃. Rising gives ジャンプ弾道攻撃, a projectile. Falling gives 空中攻撃. After the mid-air 宙返り turn gives 宙返り攻撃, a strike straight down. Being hit triggers 全方位攻撃, a counter in all directions. — [WP-JA](https://ja.wikipedia.org/wiki/双界儀); [GC](https://w.atwiki.jp/gcmatome/pages/6771.html)
- ブースト (神通足) is a horizontal leap that does not follow a parabola. The jump can be turned mid-air. — [WP-JA](https://ja.wikipedia.org/wiki/双界儀)
- Recommended movement chain: jump → 宙返り → boost → 宙返り. This suggests moves chain in the air for long-distance crossings. — [XN](https://xneo.jp/sokaigi/) (fan tip)
- The START menu has 地図 (map), 再戦 (retry), 変更 (change), and 放棄 (abandon). Only 地図 keeps your progress. — [XN](https://xneo.jp/sokaigi/). This seems to contradict GC's complaint that the game has no map. The "地図" entry may be a stage-selection map rather than an in-stage map; unverified.
- Control feel, per GameSpot: "Think Battle Arena Toshinden and Tomb Raider combined, and you're halfway there." "Trying to align with your enemies is difficult at best and frustrating at its worst." (verbatim) — [GS](https://www.gamespot.com/reviews/soukaigi-import-review/1900-2549379/)

### Inferences
- The control model is tank-like, close to early Tomb Raider: you turn the body or rotate with the shoulders and push forward, and steps are discrete. GameSpot's alignment complaint fits a game with no free analog strafing and no lock-on outside bosses.
- One button does several jobs depending on state (attack becomes dash, boost, rising, falling or flip attack). Charging 奥義 by holding the same button is the likely cause of the "accidental 奥義" complaint.

### Gaps
- The ○×△□ assignments for attack, 旺氣弾, jump, boost and 結界, and how side/back steps are input (double-tap? D-pad plus a button?), are unconfirmed. DualShock analog support is also unconfirmed. Sources to check: the manual scan (psxdatacenter SLPS-01291 page) or 公式ガイドブック完全版.

## 2. Stage list, structure and the minute-to-minute loop

### Takeaway
There are 10 episodes (話), each tied to a real sacred site and an old month name. The loop:
1. Choose a stage on the map.
2. Pick one character, using the suitability ratings.
3. Spend カケラ on upgrades.
4. Explore a large field, killing 寄り神 and breaking ガラン石 to push the regional gauge from 衰氣 (red) toward 旺氣 (blue).
5. Once the gauge reaches yellow or higher and you reach a set spot, the boss (often a 六震祇) appears.
6. Cleared stages can be replayed to farm カケラ and マテリア.

### Cited Findings
Stage list from the XN fan guide, with month names, bosses and features. Boss names in brackets come from WP-JA; the two sources partly conflict.

| # | Month · site | Field | Bosses |
|---|---|---|---|
| 1 | 極月・珠洲 | Shrine, road, beach, lighthouse | 河伯; appears once 衰氣 is yellow+ and you reach the tunnel |
| 2 | 文月・高千穂 | Mountain summit and slopes; enemies are 金 | 六震祇 at the cliff base [WP-JA: 尸起] |
| 3 | 長月・沖ノ島 | Island loop; stage element 土 | 我舞要 at the shrine, then 六震祇 [WP-JA: 尸動] |
| 4 | 神在月・出雲 | Torii gates that warp you | 六震祇 deepest [尸震], then 紫微仙 陰虎 |
| 5 | 極月・大和 | City area, then Hifumi's hut | 六震祇 after an event [尸覚], then 河伯 after breaking the central blue stone |
| 6 | 極月・富士 | Cave descent | 六震祇 at the deepest point [尸吼] |
| 7 | 睦月・鹿島 | Ship section → action stage inside the 六震祇 → narrow jump course | 六震祇 [尸涌] |
| 8 | 睦月・日高見 | Spiral staircase climb in the first half | 塞上夜斗, then 河伯 |
| 9 | 如月・諏訪 | Triangular stage with 12 red ガラン石 | 陰虎, fought in two halves |
| 10 | 如月・淡島 | Three levels | 六震祇 with 立科顧問 at 封禅台, then 陽龍 in two halves |

Sources: [XN](https://xneo.jp/sokaigi/); [WP-JA](https://ja.wikipedia.org/wiki/双界儀)

- WP-JA's boss summary differs from XN in places:
  - Stage 8 is given as "河伯 (壺石)".
  - The finale is given as a 尸吼 variant, then 陽龍.
  - A 宮城野 boss with a human-like enemy is mentioned.
  These came through a summarizer, so treat them as uncertain.
- 3P lists the journey as Suzu, Takachiho, Okinoshima, Izumo, Yamato, Fuji, Kashima, with the goal of protecting the 七つの楔 (Seven Wedges). — [3P](https://pedia.3rd-in.co.jp/wiki/%E5%8F%8C%E7%95%8C%E5%84%80). GC says the Seven Wedges are modeled on real megaliths, and the ガラン pillars rise at real sacred mountains. — [GC](https://w.atwiki.jp/gcmatome/pages/6771.html)
- Official loop: choose a stage on the map, choose a character and upgrade, fill the 衰氣 gauge toward 旺氣 by defeating 寄り神 and breaking ガラン石 to reach the goal, then beat the stage's final boss to unlock the next stage. — [GC](https://w.atwiki.jp/gcmatome/pages/6771.html)
- Yellow or higher on the gauge unlocks most bosses. After a stage is cleared, some bosses need a specific route or event instead. You can't return to earlier stages after 日高見, so collect stones before then. — [XN](https://xneo.jp/sokaigi/)
- The fan site describes each stage as a two-phase loop:
  1. Opening movie, then character select, then defeat 寄り神 and collect ミニガラン石.
  2. Another movie, a new character select, then the 六震祇 mid-boss.
  — [MN](http://www5b.biglobe.ne.jp/~my-niiku/sc_soukai/m1.html)
- "The environments are huge, and the enemies are numerous, therefore, compromises had to be made." (verbatim). Each stage's music "cycles repeatedly... until the stage is completed." — [GS](https://www.gamespot.com/reviews/soukaigi-import-review/1900-2549379/)
- Stages include countryside and towns with rooftop platforming, water that kills on contact, and a boss at the end of each area. — [WP-EN](https://en.wikipedia.org/wiki/Soukaigi). Stepping into shallow water on an ocean stage can kill the character instantly. — [DO](https://dengekionline.com/elem/000/001/725/1725957/). GC says falling off costs some HP and restarts you. — [GC](https://w.atwiki.jp/gcmatome/pages/6771.html). The penalty may differ by terrain; the earlier note of "10% HP" is unverified here.
- GameSpot's core-loop summary: mostly running around destroying crystals and the creatures that gather around them. — [GS](https://www.gamespot.com/reviews/soukaigi-import-review/1900-2549379/)
- Post-clear replay of cleared stages lets you collect fragments and マテリア. — [GC](https://w.atwiki.jp/gcmatome/pages/6771.html)
- Clear-data bonuses:
  - From Disc 1: all characters, free stage select with movies cut, 500 カケラ, and 塞上夜斗 playable.
  - Disc 2 unlocks the cut scenes.
  — [GC](https://w.atwiki.jp/gcmatome/pages/6771.html)
- The game ships on 3 CDs and has about 3 hours of movies. — [GC](https://w.atwiki.jp/gcmatome/pages/6771.html). WP-EN says about 2.5 hours of real-time cutscenes. — [WP-EN](https://en.wikipedia.org/wiki/Soukaigi)

### Inferences
- The structure is "large hub-less field + objective gauge + gated boss." The gauge works as a soft quota: you need not clear everything, just enough to reach yellow, and full clears serve the upgrade economy.
- Verticality is a core axis: rooftops, a spiral staircase, a cliff base, cave descents, a three-level finale, and stones that need high jump stats or look-up.

### Gaps
- Field dimensions, time-to-clear per stage, and how many stones and enemies a stage holds (beyond 諏訪's 12 red stones) were not found.

## 3. Enemies (寄り神) and bosses

### Takeaway
寄り神 are mostly based on Japanese folk yōkai. Only a few names are confirmed: アンモ, センポクカンポク, カブソ. Enemy design leans on stage-specific gimmicks:
- unkillable enemies
- invisible enemies only one character can kill
- 衰氣 bullet shooters
- enemies that ignore 結界

Bosses come in three tiers:
- 六震祇: seven 式神 constructs named 尸〇
- the three 紫微仙: 河伯, 陰虎, 陽龍
- human rivals: 我舞要 and 塞上夜斗

Critics found enemy AI nearly absent.

### Cited Findings
- 寄り神 are often named after Japanese folk yōkai. — [GC](https://w.atwiki.jp/gcmatome/pages/6771.html). Named examples:
  - アンモ: fast mover
  - センポクカンポク: rubber-like, reflects attacks
  - カブソ
  — [WP-JA](https://ja.wikipedia.org/wiki/双界儀). From my own knowledge, not checked against a source: アンモ is a Iwate yōkai, センポクカンポク a Toyama toad-like yōkai, and カブソ an Ishikawa otter yōkai.
- Enemies by stage (XN describes them by appearance, without names):
  - Stage 1: 結界 works on them.
  - Stage 2: a giant silkworm-like enemy that can't be killed and spreads 衰氣 infection.
  - Stage 3: a white snake-like flyer that ignores 結界. Enemies that shoot 衰氣 bullets often drop 奥義マテリア.
  - Stage 4: an invisible enemy that only 琴平あずさ can kill, and which infects. Also a bee-type that shoots 衰氣 bullets.
  - Stage 6: a giant pillar-like enemy that shoots 衰氣 bullets (ひふみ recommended).
  - Stage 7: a utility-pole enemy with a beam attack.
  — [XN](https://xneo.jp/sokaigi/)
- 六震祇 are 式神 built by the 紫微仙: 尸起, 尸動, 尸震, 尸覚, 尸吼, 尸涌, plus a 尸吼 variant. — [WP-JA](https://ja.wikipedia.org/wiki/双界儀). They are mostly fire element, and 結界 does not work on the stage-2 one. — [XN](https://xneo.jp/sokaigi/)
- 紫微仙:
  - 武究天尊 陽龍: fire element, martial arts, teleports.
  - 霊封天尊 陰虎: water element, dark arts, floats on light-qi.
  - 元聖天尊 河伯: earth element, qi arts, sometimes helps 五方輪.
  — [WP-JA](https://ja.wikipedia.org/wiki/双界儀); [GC](https://w.atwiki.jp/gcmatome/pages/6771.html)
- Fan-guide boss tactics:
  - 紫微仙: stop them with 結界, then hit with 一穴点螺 or the 第三奥義, or kill them safely by reflecting their 衰氣弾 (衰氣弾弾き返し).
  - 塞上夜斗: 結界 first, then small-jump aerial attacks. If not trapped, he uses 超級太極弾.
  — [XN](https://xneo.jp/sokaigi/)
- Enemies trap the player in 結界 too. You escape by mashing, and you take double damage while trapped. — [GC](https://w.atwiki.jp/gcmatome/pages/6771.html). Which regular enemy types do this is not documented.
- "Another glaring fault is the enemies' practically nonexistent AI." "Creatures will just lie there until you either hack them to death or walk close enough to take damage." "Even the bosses don't make especially concerted efforts to hinder your progress." (verbatim) — [GS](https://www.gamespot.com/reviews/soukaigi-import-review/1900-2549379/)
- IGN's preview praised the environments and enemy designs and was harsh on the gameplay. — [WP-EN](https://en.wikipedia.org/wiki/Soukaigi)
- Enemy designer: 田中毅 (Takeshi Tanaka). Drama and sound director 三ツ矢雄二 also voices the 寄り神 roar. — [WP-JA](https://ja.wikipedia.org/wiki/双界儀); [GC](https://w.atwiki.jp/gcmatome/pages/6771.html)

### Inferences
- The enemy design was praised but the behavior was passive. A remake can keep the yōkai silhouettes while adding real attack telegraphs.
- Rules like "only character X can kill this enemy" make the per-stage character choice matter, but players can find them unfair if they aren't explained.

### Gaps
- No full 寄り神 roster, per-boss attack patterns, or full list of which enemies use 結界 was found. The 公式ガイドブック完全版 (which has enemy data) and ニコニコ大百科 were not accessible.

## 4. 衰氣/旺氣, 衰氣感染, 旺氣攻撃 vs 打撃, ガラン石, 龍穴, 結界, 封陣符

### Takeaway
- **Energy and gauge.** 衰氣 is the decay energy the 寄り神 use, and 旺氣 is the life energy of living beings. The regional gauge moves from red to yellow to blue as you kill 寄り神 and break ガラン石.
- **ガラン石.** The stones must be broken with physical (打撃) attacks or 一穴点螺. 氣 attacks bounce off.
- **衰氣感染.** Infection is a damage-over-time status. It is cured by 八極天地, 龍穴, or neutralizing the gauge.

### Cited Findings
- 旺氣 is the life energy of living beings; 衰氣 is the opposing decay energy the 寄り神 use. The gauge runs red → yellow → blue, and destroying ガラン石 and defeating 寄り神 move it. — [WP-JA](https://ja.wikipedia.org/wiki/双界儀)
- 衰氣感染 makes HP drop gradually. Cures: 八極天地, 龍穴, or neutralizing the gauge. — [WP-JA](https://ja.wikipedia.org/wiki/双界儀). Some attacks cause it. — [GC](https://w.atwiki.jp/gcmatome/pages/6771.html). The silkworm (stage 2) and the invisible enemy (stage 4) infect. — [XN](https://xneo.jp/sokaigi/)
- ガラン石:
  - Red holds 1 現世のカケラ, yellow 3, blue 5.
  - Only physical attacks or 一穴点螺 can destroy them. 氣 attacks get deflected.
  - Touching one drains HP, except for one character.
  — [WP-JA](https://ja.wikipedia.org/wiki/双界儀)
  - Breaking them gets harder from red to yellow to blue. — [DO](https://dengekionline.com/elem/000/001/725/1725957/)
  - あずさ's aerial attacks count as 旺氣弾, so she can't break airborne stones. Some stones need high 跳躍 (for example a jump stat of 8). Some break only from a falling attack. Breaking the stone you stand on can strand others. — [XN](https://xneo.jp/sokaigi/)
  - XN's summary also says "blue stones restore HP." This conflicts with WP-JA and is probably a summarizer error; flagged.
- 龍穴 are ground spots glowing in five colors. Matching or clashing with a character's element gives buffs, healing, infection removal, or stat drops. Some spots have a fixed color, others cycle. — [GC](https://w.atwiki.jp/gcmatome/pages/6771.html). A matching color restores HP; a color your element is weak against gives a 30-second stat penalty; each spot works once. — [WP-JA](https://ja.wikipedia.org/wiki/双界儀) (summarized; the "once" detail is uncertain)
- 五行 colors: wood is blue, fire red, earth yellow, metal white, water black. 相生 (the generating cycle) is neutral in combat. 相克 (the overcoming cycle) gives ×2 damage dealt and ×0.5 damage taken from the element that overcomes yours. — [GC](https://w.atwiki.jp/gcmatome/pages/6771.html); [WP-JA](https://ja.wikipedia.org/wiki/双界儀)
- 結界: traps the enemy in a regular dodecahedron (正十二面体), immobilizes it briefly and doubles damage. Up to 5 can be active, and they can be stacked on one enemy to extend the duration. — [WP-JA](https://ja.wikipedia.org/wiki/双界儀); [GC](https://w.atwiki.jp/gcmatome/pages/6771.html)
- 封陣符 holds up to 16 talismans. The number you add selects the effect:

  | Count | Name | Effect |
  |---|---|---|
  | 1 | 一穴点螺 | Pierces enemies in a line |
  | 2 | 二王仙胎 | Neutralizes 衰氣 infection |
  | 3 | 三元鎮守 | Rotating shield against 衰氣 bullets |
  | 4 | 四方色滅 | Hits all enemies in view |
  | 5 | 五芒醒力 | ×2 attack and near-invulnerability for 30 s; you can still be trapped by 結界 |
  | 6 | 六氣封殺 | Freezes everything but you for 11 s |
  | 7 | 七星招鬼 | Decoy for 30 s |
  | 8 | 八極天地 | Full HP restore |

  — [WP-JA](https://ja.wikipedia.org/wiki/双界儀)

### Inferences
- 打撃 (physical) vs 旺氣 (energy) works like a damage-type lock: stones are physical-only, while bullets are better against some enemies. This is why some characters can't break stones in certain spots. One clear design lesson is to make the damage type obvious in the UI.

### Gaps
- Exact gauge thresholds (how many kills or stones reach yellow) and the infection DoT rate were not found.

## 5. 五方輪 characters: differences and 奥義

### Takeaway
There are six playable characters plus 塞上夜斗, who unlocks after clearing the game. Each lacks some subsystem, which forces per-stage picks. The named 奥義 per character are largely unconfirmed; only あずさ's 月夕 / 陰技－金紅花 and an unattributed 黒雷 surfaced.

### Cited Findings
| Character | Element | Weapon / style | Strengths and limits |
|---|---|---|---|
| 真武居直柔 (protagonist, 18) | 木 | 闇陽炎 + 荒覇吐, lightning, 紫微武甲法 | Strongest early; best pick vs 六震祇 (MN) |
| 御巫みづほ (18) | 木 | Inherits 闇陽炎, sword | Lowest HP; GC calls her a "weaker 直柔"; her jump attack doesn't auto-collect カケラ (XN) |
| 八洲大騎 (32?) | 火 | 忌杖 staff, 密教咒術 | Highest HP; suits 金 stages |
| 我舞要 (20) | 水 | 氣鋼掌 / 玄武魂 fists | Strong melee, weak range. No talismans (WP-JA); no barrier, boost, or talismans (GC); can't boost (XN). Strong vs 六震祇 |
| 琴平あずさ (11) | 金 | 天颪 bow | Strong ranged/旺氣 attacks. No 結界 (WP-JA); no barrier or boost (GC). Aerial shots can't break stones. 奥義 月夕 stops enemies |
| 朱童ひふみ (25?) | 土 | 銀鏡 fan + 禍絲 silk, onmyōdō | No 旺氣 attack (WP-JA). High jump and strong aerial attacks. Best for stones and カケラ; the 禍糸 lets her reach stones no one else can (MN) |
| 塞上夜斗 (post-clear) | 水 | 玄武魂 (left hand) | No physical attacks. Overpowered, but awkward in boss fights and on narrow stages |

Sources: [WP-JA](https://ja.wikipedia.org/wiki/双界儀); [GC](https://w.atwiki.jp/gcmatome/pages/6771.html); [XN](https://xneo.jp/sokaigi/); [MN](http://www5b.biglobe.ne.jp/~my-niiku/sc_soukai/m1.html)

- 奥義 names found:
  - あずさ: 第一奥義 "月夕", and "陰技－金紅花" (a power-up obtained in stage 3).
  - "第二奥義 黒雷": owner not stated; lightning suggests 直柔. Unverified.
  — [XN](https://xneo.jp/sokaigi/)
- On the character select screen, each character voices a reaction that fits their four-tier suitability for the stage. For example, あずさ protests with "やだやだ…" when unsuitable. On a first playthrough, 夜斗 refuses with "now is not the time." Recommended pick: a character making their first appearance in that stage. — [MN](http://www5b.biglobe.ne.jp/~my-niiku/sc_soukai/m1.html)
- Costume colors match each character's element, and weapons use 相生 colors. — [GC](https://w.atwiki.jp/gcmatome/pages/6771.html)

### Inferences
- The asymmetry ("each character is missing X") creates stage-specific puzzles and replay value, but it was also criticized as imbalance.

### Gaps
- The full 奥義 list per character (names and effects for each stance stage) was not found online. The official guidebook is the best lead.

## 6. Presentation: UI, sound, music, art direction

### Takeaway
The presentation was the game's main strength:
- an interface written almost entirely in kanji
- old month names
- taiko and well-bucket (釣瓶) sound effects
- a mostly live-recorded Kikuta score
- Sumeragi Natsuki's character designs
- a star voice cast

The graphics were weak even in 1998: pixelated or flat-shaded textures, though a stable 30 fps.

### Cited Findings
- Mostly Japanese and kanji text, with weapons called 得物 or 武具, and sound effects evoking taiko drums and well buckets (釣瓶). The calendar uses old month names, such as 極月 for December and 神在月 for October in Izumo. — [GC](https://w.atwiki.jp/gcmatome/pages/6771.html)
- The kanji interface shows "こだわり" (attention to detail), and taiko drums are used for sound effects. — [DO](https://dengekionline.com/elem/000/001/725/1725957/)
- Music: composed by 菊田裕樹. The budget was ¥30 million, and about 80% was recorded live. The OST (DigiCube SSCX-10017, 1998-06-11) has 17 tracks, about 50 minutes. — [WP-EN](https://en.wikipedia.org/wiki/Soukaigi). GC praises "Quake," "Energy," "Die On Destiny," "Labyrinth," "Absolute Lady," and "Regret" and says there are no weak tracks. — [GC](https://w.atwiki.jp/gcmatome/pages/6771.html). Dengeki singles out the stage-1 track "Quake." — [DO](https://dengekionline.com/elem/000/001/725/1725957/)
- Fan remembrance: music that immerses you in a "異世界仕様" (otherworldly) feeling from the moment a stage starts, and tears at learning in the ending that "that song" had lyrics. — [NC](https://ncode.syosetu.com/n1237eq/)
- Graphics: "Textures are extremely pixelated, and when they aren't, they're merely flat-shaded," but "a smooth 30fps, without any trace of slowdown." Voices "sound like they're speaking through a sock." (verbatim) — [GS](https://www.gamespot.com/reviews/soukaigi-import-review/1900-2549379/). Famitsu's reviewer called the graphics "rough." — [WP-EN](https://en.wikipedia.org/wiki/Soukaigi). GC notes the graphics budget was traded off against live music. At the time, ゲーム批評 called the graphics below Saturn level. — [GC](https://w.atwiki.jp/gcmatome/pages/6771.html)
- Square's first fully voiced title. — [3P](https://pedia.3rd-in.co.jp/wiki/%E5%8F%8C%E7%95%8C%E5%84%80). Cast includes 遠近孝一, 大塚明夫, 山寺宏一, 大谷育江, 天野由梨, 子安武人, 堀内賢雄, 羽佐間道夫. Mizuho is voiced by actress 京野ことみ, whose weak performance was a point of debate. — [GC](https://w.atwiki.jp/gcmatome/pages/6771.html)
- Worldview sources: 古事記, 万葉集, and pseudo-histories such as 竹内文書 and 東日流外三郡誌. Also yin-yang / 五行, Taoism, 古神道, and 陰陽道. — [GC](https://w.atwiki.jp/gcmatome/pages/6771.html); [3P](https://pedia.3rd-in.co.jp/wiki/%E5%8F%8C%E7%95%8C%E5%84%80). Real locations include Okinoshima and a sunken Izumo Taisha. — [GC](https://w.atwiki.jp/gcmatome/pages/6771.html)

### Gaps
- No source described per-stage color palettes (for example the night-sea tones of Suzu) in citable detail. 秀真文字 (Hotsuma script) use in the UI was not confirmed by any source read; treat it as unverified.

## 7. Reception and player sentiment

### Takeaway
- **Critics:** reviews were split. Famitsu gave 34/40 and Consoles+ 92%, while GameSpot gave 5.6 and Joypad 5/10.
- **Sales:** over 132k units in 1998.
- **What fans love:** the world, the music, the voices and the character designs.
- **What fans and critics agree on:** the action is unpleasant.
- **Status:** a recurring "remake this and it would be great" candidate, with no official remake. It is available on Game Archives (2008, ¥617).

### Cited Findings
- Scores:
  - Famitsu 34/40 (positive on story, characters and music; one reviewer said "rough" graphics)
  - Consoles+ 92%
  - GameSpot 5.6/10
  - Joypad 5/10
  - Dengeki PlayStation 70/70/75/80
  - Gamers' Republic C
  - Station 62%
  - Sales: over 132,000 units in its release year.
  — [WP-EN](https://en.wikipedia.org/wiki/Soukaigi)
- GameSpot: "fails to live up to its expectations... it just isn't fun." (verbatim) — [GS](https://www.gamespot.com/reviews/soukaigi-import-review/1900-2549379/)
- GC 問題点 (problems):
  - Sluggish movement, dull hit effects and little feedback, so combat feels unsatisfying.
  - Jumping is nearly vertical until it is upgraded.
  - Falling off is tedious.
  - Some ガラン石 need complicated setups, and breaking some cuts off access to others.
  - No overall map; Izumo's torii-warp maze is especially confusing.
  - 奥義 and 封陣符 fire by accident, and talisman counts are easy to overshoot.
  - Characters are imbalanced.

  GC 賛否 (mixed points): invincibility during 奥義 and 封陣符 is too convenient, and 夜斗 is too strong. GC 総評: some call it a クソゲー, but it has real appeal and is often named as a remake candidate. — [GC](https://w.atwiki.jp/gcmatome/pages/6771.html)
- Dengeki retrospective: "本作は操作性や視点にクセがある" (the controls and camera are quirky); "つらい思い出が多いのも事実です" (it's true there are many painful memories). Players got lost for a long time on the torii warp stage. Players used the 電撃PlayStation D save disc (lots of stones and unlocked movies) to get through. — [DO](https://dengekionline.com/elem/000/001/725/1725957/)
- Remake-wish essay:
  - "とにかく雰囲気は最高のソフトだった" (the atmosphere was simply the best)
  - "歩行すら慣れるまでに時間がかかる…とにかく敵と戦いにくい" (even walking takes time to get used to… fighting enemies is just hard)
  - Many players felt "裏切られた" (betrayed).
  - Wants it "フルカスタムで生まれ変わらせて" (fully reworked and reborn).
  — [NC](https://ncode.syosetu.com/n1237eq/)
- Development: Square's small-team experimental program. Yuke's had full creative freedom and a big budget. Director and writer 天河信彦 (Yuke's), producer 平田祐介. — [WP-EN](https://en.wikipedia.org/wiki/Soukaigi)

### Inferences
- The gap between Famitsu 34 and GameSpot 5.6 reflects audience: Japanese reviewers weighted the story, cast and music, while Western import reviewers judged the action alone. A successor that keeps the presentation and fixes the core feel (responsiveness, hit-stop, enemy AI, navigation, input disambiguation) addresses exactly what fans name.

### Gaps
- Amazon.co.jp and PSN user reviews, YouTube descriptions, and ニコニコ大百科 were not retrieved. No official remake or remaster announcement was found as of 2026-11.
