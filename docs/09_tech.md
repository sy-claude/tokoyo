# 09 技術設計（tech）v1.2

> v1.2（第3回統合、decisions D66〜）：04・05 の型を取り込み（EnemyDef・EnemyAttackDef・BossDef・StageDef・TutorialStep）。StageDef の座標原点を北西の角に訂正。`projectileEnd.reason 'cut'`、`kekkaiFail` の理由を整理。設定キーの接尾辞の規則（Count／Ratio）を確定。

> v1.1（第2回統合、decisions D48〜）：InputFrame を本書に一本化（`camHeld`・`fu.commit/cancel` を追加、01 の `camPx`・`ougiCancel` は不採用）。03・06・07・08 の型とイベントの追加要求を取り込み。BGM ファイルの置き場、config ファイル一覧、`?test=1&audio=1` を追加。

**この文書でできること**
- ゲームの「土台の作り方」を決めます。ファイルの置き場所、データの形、毎秒60回の更新の仕組み、当たり判定、保存、テストの方法です。
- AI はこの文書どおりに作れば、推測せずに実装と自己検査ができます。依頼者が触るのは 12章の設定と、13章の確認だけです。
- 型とイベント名（3章）は 01〜08 の正本です。他の文書はここにある名前だけを使います。

**関連文書**：00_core（4章 時間、12章 不変条件）、decisions（D4・D5・D8〜D10・D41・D43〜D47）、01（入力の意味）、02（移動の値）、03（技の中身）、04（AI）、05（地図）、07（シェーダーの式）、08（音）、10（範囲）。

---
## 1. リポジトリ構成

### 1.1 最上位
```
index.html  package.json  package-lock.json  vite.config.js  tsconfig.json  playwright.config.js
.gitignore  CLAUDE.md  PROGRESS.md
.github/workflows/deploy.yml
docs/            設計書一式（00〜10、decisions）。docs/ci/deploy.yml は workflows の控え
scripts/         verify.mjs  replays-update.mjs  contact-sheet.mjs
public/          manifest.webmanifest  icon.svg  audio/bgm/（.gitkeep と BGM の <曲ID>.m4a。08 5.1・D48）
assets-raw/      公開しない変換前の素材（08 7章の .wav 等）。build に含めない（public の外なので vite は配らない）
src/  tests/
```
- 実行時に読む外部ファイルは `public/` の manifest・icon・`audio/bgm/*.m4a`（無ければ `.mp3`）だけ。BGM は npm の依存ではない静的ファイルで、無くても動く（不変条件11は「依存4つ」のまま）。

### 1.2 package.json（全文）
依存は版を完全に固定する（`^` と `~` は使わない）。TypeScript は 6.0 系にする。7.x（Go版）は JSDoc の一部の書き方に対応しておらず、checkJs が中心の本作では危ないため。
```json
{
  "name": "tokoyo-barai",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "engines": { "node": ">=22.12" },
  "scripts": {
    "dev": "vite --host",
    "build": "vite build",
    "preview": "vite preview --port 4173 --strictPort",
    "typecheck": "tsc -p tsconfig.json",
    "test": "node --test --test-reporter=dot \"tests/unit/**/*.test.js\"",
    "test:e2e": "playwright test",
    "shots": "playwright test tests/e2e/shots.spec.js && node scripts/contact-sheet.mjs",
    "verify:fast": "npm run typecheck && npm test && npm run build",
    "verify": "node scripts/verify.mjs",
    "replays:update": "node scripts/replays-update.mjs",
    "bench": "playwright test tests/e2e/bench.spec.js"
  },
  "dependencies": { "three": "0.187.0" },
  "devDependencies": { "vite": "8.3.8", "typescript": "6.0.3", "@playwright/test": "1.65.0" }
}
```

### 1.3 vite.config.js・tsconfig.json・.gitignore
```js
import { defineConfig } from 'vite';
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',            // Pages では '/<repo>/'。ローカルとテストは '/'
  build: { target: 'es2022', sourcemap: true, chunkSizeWarningLimit: 1500 },
  server: { host: true, port: 5173 },
  preview: { port: 4173 },
});
```
```json
{ "compilerOptions": { "target": "ES2022", "module": "ESNext", "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"], "allowJs": true, "checkJs": true, "noEmit": true,
    "strict": true, "noImplicitAny": false, "skipLibCheck": true, "types": [] },
  "include": ["src/**/*.js", "src/**/*.d.ts"] }
```
- `src/types/three-shim.d.ts` に `declare module 'three';` と `declare module 'three/addons/*';` を置く（`@types/three` は不変条件11の外なので使わない。提案P1）。同じファイルに `interface ImportMeta { readonly env: { readonly BASE_URL: string; readonly DEV: boolean; readonly PROD: boolean } }` も置く（`types: []` のため `vite/client` の型が入らず、`import.meta.env` が型エラーになるのを防ぐ）。
- 型は `/** @import {InputFrame} from '../data/types.js' */` で読み込む（TS 6.0.3 で動作確認済み）。
- tests/ は型検査に含めない（Node の型定義が依存に無いため）。

`.gitignore`：`node_modules/` `dist/` `tests/artifacts/` `test-results/` `playwright-report/` `*.log` `.DS_Store`

### 1.4 src/ のモジュールと責務
| フォルダ | ファイル | 責務 |
|---|---|---|
| `main.js` | — | 起動（`app/boot.js` を呼ぶだけ） |
| `app/` | boot, loop, scenes, urlParams | 起動順、ゲームループ（4章）、場面の切替（title/devMenu/select/stage/boss/result/sandbox/fu-test。sandbox・fu-test の中身は10 §4.5・§4.6。M ごとの仮の死亡・結果・bench 場面は10の各M）、URL引数 |
| `platform/` | storage, guards, viewport, wakeLock | localStorage と移行の呼出し、ブラウザ対策（01）、visualViewport と safe-area、画面消灯防止 |
| `core/` | time, rng, events, math, hash, config, saveSchema, units, ids | 時計、乱数、イベント列、数学補助、状態ハッシュ、config 組立、保存の形と移行、`sToTicks`、ID 発行 |
| `config/` | time, movement, camera, lockon, combat, ougi, kekkai, fu, enemies, boss, stage, progression, nav, collision, input, layout, ui, settings, render, palette, anim, quality, audio, save, debug | 調整値（ConfigTable）。1ファイル1表（表を持つ文書：time・collision・nav・quality・save・debug＝09、input＝09 5.4＋01 2.11、layout・ui（HUD）・settings（設定の既定値）＝01、movement・camera・lockon＝02、combat・ougi・kekkai・fu＝03、enemies・boss＝04、stage＝05、progression＝06、render・palette・anim＝07、audio＝08） |
| `data/` | types, elements, characters, moves/{fuma,shirayuki,ganjo,enemies,boss}, moveShapes, enemies, boss, projectiles, props, rigs/*, stages/{shirasagi, sandbox}, tutorial, validate | 技・敵・キャラ・ステージ・小道具・導入の台本（05）の定義と検証関数。`stages/sandbox` は試験場（10 §4.5）、`enemies` には試験用の木偶 `dummy`・`dummy_<属性>`（`testOnly:true`、10 §4.7 R9）も置く |
| `gen/` | terrain, props, surfaces | StageDef＋シードから高さ格子・面種別・小道具の配置を作る純関数（シムと描画が共用）。terrain の関数は `shirasagiTerrain`（05 §1.3）と `sandboxRects`（10 §4.5） |
| `input/` | pointerRouter, layout, collector, keyboard, pentagram, gestures, synthetic | 指の役割割当、配置の判定円、InputFrame の生成、キーボード、五芒星、はじき・タップ判定、テスト用入力 |
| `sim/` | world, step, entities, camera, lockon, player/, enemyAI/, boss/, combat/, collision/, nav/, stageLogic/ | ゲームの規則のすべて。`stepWorld(world, input)` が唯一の入口 |
| `render/` | renderer, quality, frame, cameraView, feel/shake, materials/, rig/, stage/（sandboxView ほか）, actors/（playerView, dummyView ほか）, vfx/, textAtlas, warmup, debugDraw, bench | 描画。シムの状態を読み、補間して描くだけ。画面揺れは `feel/shake.js`（03 5.4 の純関数）が量を出し、`cameraView.js` が描画用カメラにだけ足す（02 6.6） |
| `ui/` | hud, buttonsView, pentagramView, damageNumbers, offscreenArrows, menus/{title, pause, devMenu, fuTestPanel, charSelect, result, death, resumeAsk, settings, layoutEdit, homePrompt}, tutorialView, rotatePrompt | DOM の表示（`pointer-events:none`）。メニューだけはボタンとして操作を受ける。`devMenu`（試験メニュー、`config/debug.js` の `devMenuOn`）と `fuTestPanel`（符の試験場のお題と成功率）は開発用（10 §4.4・§4.6） |
| `audio/` | engine, unlock, sfx, ambience, bgm, router | 効果音・環境音は Web Audio の合成、BGM は `public/audio/bgm/` のファイル再生（08）。イベントを音に変える |
| `debug/` | testApi, panel, overlay, recorder | `window.__game`、調整パネル、判定表示、入力の記録 |

`sim/` の内訳：`player/`（fsm, locomotion, actions）、`enemyAI/`（common, inu, tomoshi, karakasa, menoni, tokens）、`boss/`（ishikori）、`combat/`（hitbox, damage, hitstop, mikiri, kekkai, ougi, fu, projectiles, status）、`collision/`（heightfield, shapes, grid, mover, queries）、`nav/`（walkGrid, distanceMap, steering）、`stageLogic/`（gauge, eiki, eseki, ryuketsu, sea, checkpoint, tutorial）。

**依存の向き**（`tests/unit/imports.test.js` が import 文を読んで検査する。JSDoc の `@import`（型だけ）は検査しない）
| 読む側 | 読んでよいもの |
|---|---|
| core | core、three（数学クラスのみ） |
| config・data | core/units（例外：`data/validate.js` は config も読んでよい。02 の `runSpeedMaxMul`、D79 の `config/boss.js` との照合のため） |
| platform | core、config |
| gen・sim | core、config、data、gen、three（数学クラスのみ） |
| input | core、config |
| render | core、config、data、gen、three（全部） |
| ui・audio | core、config、data、input/layout |
| app・debug | すべて |

three の数学クラスとして使ってよいもの：`Vector2 Vector3 Quaternion Matrix3 Matrix4 Euler MathUtils Box3 Sphere Ray Plane Line3 Triangle`。

### 1.5 tests/
```
tests/unit/*.test.js           node:test（11.1）
tests/replays/src/*.js         リプレイ用の入力を作るスクリプト
tests/replays/*.json           入力列と期待ハッシュ（11.2）
tests/e2e/*.spec.js            Playwright
tests/e2e/helpers/{touch,game,shots}.js
tests/artifacts/               撮影結果（git に入れない）
```

---
## 2. 不変条件と自動検査（00_core 12章）
| # | 条件 | 検査（ファイル） |
|---|---|---|
| 1 | 60Hz・整数tick・決定論 | `forbidden.test.js`：`src/{core,sim,gen}` に `Math.random` `Date.now` `performance.now` `new Date` `setTimeout` `setInterval` `requestAnimationFrame` があれば失敗。`replay.test.js`：同じリプレイを2回流してハッシュが一致 |
| 2 | 時計2つ・倍率は積 | `time.test.js`（4.2の表を全部） |
| 3 | カメラはシム側 | 状態ハッシュにカメラを含める。`imports.test.js`：render は sim を import しない |
| 4 | 入力は InputFrame のみ | `imports.test.js`：sim は input と DOM を読まない。`stepWorld` の引数は2つ |
| 5 | シムは描画・DOM・音を知らない | `forbidden.test.js`：`window document navigator localStorage AudioContext HTMLElement addEventListener` を禁止。three は名前付き import で上の許可リストのみ |
| 6 | 衝突と見た目は同じデータから | `stageSource.test.js`：全小道具で「当たり形状の外接箱 ⊂ 見た目の外接箱を0.3m広げたもの」。地形の描画頂点の高さ＝高さ格子の値（差0） |
| 7 | 剛体スキン1メッシュ・純関数のポーズ | `rig.test.js`：全キャラで SkinnedMesh が本体1＋武器1、全頂点の skinWeight が (1,0,0,0)。`poseAt` に凍結した入力を渡し、2回の結果が一致し入力が変わらない |
| 8 | 数値は config と data のみ | `literals.test.js`：`src/{sim,render,input,ui,audio}` で小数を含む数値リテラル、または絶対値が3以上の整数があれば失敗（例外は同じ行の `// num-ok: 理由`。コメントと文字列・テンプレート文字列（GLSL を含む）の中は対象外。シェーダーの調整値は uniform で config から渡す）。`configKeys.test.js`：値が**数値スカラー**のキーは、単位の接尾辞（`F S M Mps Mps2 Deg DegPs Px Mul Pct Hz Db Bpm`）か無次元の `Count`（個数・回数・点数・ダメージ）／`Ratio`（重み・閾値・指数などの無次元量）で終わること（正規表現 `/(F\|S\|M\|Mps\|Mps2\|Deg\|DegPs\|Px\|Mul\|Pct\|Hz\|Db\|Bpm\|Count\|Ratio)$/`）。毎秒の量は接尾辞を量の単位にし、表の単位の欄に「/s」を書く（例 `traumaDecayPct` 160 %/s）。配列・オブジェクト・文字列・真偽値の値のキーは対象外（ただし文書の表の単位の欄は書く）。`config/audio.js` の入れ子の表 `sfxRecipes`（08 9章）も対象外（data 的な表） |
| 9 | 保存の名前空間・版・移行・引き継ぎ | `saveSchema.test.js`。`forbidden.test.js`：`localStorage` は `platform/storage.js` のみ |
| 10 | 描画命令110以下・後処理1パス・DPR1.5以下 | e2e `budget.spec.js`：3視点で `renderInfo().calls ≤ 110`、`pixelRatio ≤ 1.5` |
| 11 | 色は THREE.Color・依存の版は固定 | `literals.test.js`：`0x` で始まる6桁、または `'#rrggbb'` が config・data 以外にあれば失敗。`deps.test.js`：依存は4つ（three, vite, typescript, @playwright/test）で、版が `^\d+\.\d+\.\d+$`。BGM ファイル（`public/audio/bgm/`）は依存ではなく、この検査の対象外 |

---
## 3. 共通の型（正本：`src/data/types.js`）
```js
/** @typedef {[number,number,number]} V3 */
/** @typedef {'wood'|'fire'|'earth'|'metal'|'water'} Elem */
/** @typedef {'strike'|'shot'|'spell'} DmgType  打/射/術 */
/** @typedef {'attack'|'dodge'|'jump'|'ougi'|'kekkai'|'fu'|'focus'} BtnId */
/** @typedef {'ikketsu'|'jou'|'mamori'|'metsu'|'sei'} FuKind  一穴/浄/守/滅/醒 */
/** @typedef {'geki'|'e'|'fuu'} Glyph  撃/穢/封 */
/** @typedef {'shu'|'ki'|'ao'} EsekiColor */
/** @typedef {{down:boolean, pressed:boolean, released:boolean, ageF:number}} BtnState
 *  ageF：押下の実時刻がこのtickより何tick前か（0〜4。テストとキーボードは0） */
/** @typedef {Object} InputFrame   正本はこの定義（01 2.10 は参照のみ）。組み立て規則は 5.3
 * @property {number} tick
 * @property {[number,number]} stick   x=右+、y=前+、長さ≤1（デッドゾーン適用後）
 * @property {[number,number]} camDeg  このtickの回転量 [yaw 右+, pitch 上+]（度）。入力層が指の移動px に
 *           02 の基準感度 `camYawDegPerPx`/`camPitchDegPerPx` × `camSensPct`/100（× 攻撃ドラッグ `attackDragCamMul`）を掛け、反転を適用した後の値
 * @property {boolean} camHeld  カメラ系の指（camera・attackDragCamera）が1本以上触れている（02 の自動回り込み・注視ずらし用）
 * @property {Record<BtnId,BtnState>} btn
 * @property {boolean} ougiOut  奥義の溜めを消費なしで取り消す指示。奥義の指が押下点から `ougiOutPx`(72) 以上の間は真（`ougiBackPx`(56) 以内で偽に戻る）。
 *           さらに、奥義の指が奥義でなくなった tick（回避への滑らせ・静かな解放＝pointercancel/blur/符の構えへの移行/メニュー）は1tickだけ真
 * @property {-1|0|1} flick     注目の標的切替（左/なし/右）
 * @property {[number,number][]} taps  注目用のタップ（条件を満たしたものだけ、CSS px）
 * @property {{touching:boolean, first:Elem|null, edges:[Elem,Elem][], commit:boolean, cancel:boolean}|null} fu
 *           符の構え中のみ非null。first＝始点（一度決まったら構えの終わりまで同じ値）。edges はこのtickに確定した辺（通常0〜1本、簡易モードは一度に n 本）。
 *           commit＝簡易モードの数字タップ・キーボード Enter（即発動）。cancel＝描き始める前のスティック範囲のタップ・キーボード Esc（取消、01 3.5）
 * @property {[number,number]} viewPx  画面の幅・高さ（CSS px）
 */
/** @typedef {{kind:'sphere', c:V3, rM:number}|{kind:'capsule', a:V3, b:V3, rM:number}} HitShape  キャラ原点基準、+Z が前 */
/** @typedef {'none'|'small'|'mid'|'blow'|'launch'|'spike'|'pull'} Rx  反応（なし/小/中/吹/打上/叩落/引寄。03 5.3） */
/** @typedef {{rx:Rx, hMps:number, vMps:number, kind:'flinch'|'launch'|'down'}} Knockback
 *  data には rx だけを書き、hMps・vMps・kind は読み込み時に 03 5.3 の表（config/combat.js）から埋める */
/** @typedef {Object} MoveDef
 * @property {string} id
 * @property {'ground'|'air'|'airDash'|'dodge'|'ougi'|'enemy'|'boss'} kind
 * @property {number} startupF @property {number} activeF @property {number} recoveryF
 * @property {{into:string[], fromF:number, toF?:number, onHitOnly?:boolean}[]} cancels
 * @property {{fromF:number, toF:number, shape:HitShape, hitGroup?:number,
 *   damage?:number, hitstopF?:number, knockback?:Knockback, breakDmg?:number, rehitF?:number, attackerStops?:boolean}[]} hitboxes
 *   hitGroup 毎に1回命中。damage〜attackerStops は省略時に技の値（attackerStops の既定：strike=true、shot・spell=false。03 2.1・2.6）
 * @property {{fromF:number, toF:number, fwdMps:number, upMps?:number}[]} motion
 * @property {number} damage  基礎値（ヒットストップ式に使う）
 * @property {DmgType} dmgType
 * @property {Elem} [element]  省略時は使用者の属性
 * @property {number} [hitstopF]  省略時は式（00 7.2）
 * @property {Knockback} knockback
 * @property {number} breakDmg
 * @property {[number,number]} [armorF] @property {[number,number]} [invulnF]
 * @property {boolean} [superArmor]
 * @property {boolean} [heavy]  重い一撃。swing・hit の heavy に写す（奥義は常に真）
 * @property {boolean} [ignoreInvuln]  敵の技のみ。無敵を貫き見切り不可（ボスの「封」だけ真。03 2.1・6.1）
 * @property {{defId:string, atF:number, offset:V3, yawDeg?:number}[]} [projectiles]
 * @property {{f:number, joints:Record<string,V3>, ease?:'linear'|'in'|'out'|'inOut'}[]} pose  関節角は度
 * @property {{bone:string, fromF:number, toF:number, widthMul?:number}} [trail]  見た目のみ
 */
/** @typedef {Object} ProjectileDef
 * @property {string} id @property {'player'|'enemy'} side
 * @property {number} rM @property {number} speedMps @property {number} gravityMps2 @property {number} lifeS
 * @property {number} damage @property {DmgType} dmgType @property {Elem} [element]
 * @property {boolean} pierce @property {number} [pierceMaxCount]  pierce=true のとき貫く体数（省略＝無制限）
 * @property {number} [homingDegPs]
 * @property {boolean} breaksEseki @property {number} [esekiMul]
 * @property {boolean} blockedByMamori @property {string} vfx
 * @property {{rM:number, hM:number, delayF:number, rehitF:number, hitCount:number, finalDamage?:number, durF?:number}} [area]
 *           場（速度0の弾。03 2.6）。durF がある場は delayF 後の durF f の間、円柱に触れた相手へ各1回だけ当てる（持続する範囲。04 1.1）
 * @property {boolean} [cuttable]  敵の弾のみ。プレイヤーの打の判定が触れたら消える（`projectileEnd{reason:'cut'}`、04 3.2）
 */
/** @typedef {{type:'box'|'cyl'|'cone'|'sphere'|'ico'|'lathe'|'extrude'|'tube'|'torus', p:Record<string,number|number[]>}} GeoDef */
/** @typedef {{geo:GeoDef, color:string, pos:V3, rotDeg:V3, scale?:V3, bone?:string, outline?:boolean}} PartDef  小道具（PropDef）の部品 */
/** RigDef（人物・敵・ボスの剛体スキン）と BoneDef・RigPartDef・SpringDef は 07 6.1 の定義をそのまま写す（骨の位置 `posM`、部品の `shape/dims/offsetM/rotDeg/faceCell`、`springs`、`scaleMul`、武器は `weapon:{socket, parts, bones}`）。 */
/** @typedef {Object} CharacterDef
 * @property {string} id @property {string} name @property {Elem} element
 * @property {number} hpMax @property {number} fuMax @property {number} kekkaiMax
 * @property {{rM:number, hM:number}} capsule
 * @property {{canAirDash:boolean, canFlip:boolean, canKekkai:boolean, canBreakEseki:boolean,
 *   rangedOnly:boolean, moveWhileShooting:boolean}} flags   値は 06 1.2
 * @property {number} softLockRangeM @property {number} kekkaiRangeM @property {number} damageTakenMul
 * @property {{combo:string[], air:string[], airDash:string|null, step:string, flip:string|null, ougi:[string,string,string]}} moveset
 * @property {Record<string,MoveDef>} moves
 * @property {RigDef} rig  武器は `rig.weapon`（07 6.1）
 * @property {{boss:'◎'|'◯'|'△', road:'◎'|'◯'|'△', explore:'◎'|'◯'|'△', line:string}|null} affinity
 *           data には書かない（null）。場面の読込時に 06 2章の `computeAffinity` の結果を入れる
 * @property {string[]} upgrades
 * @property {string} kana @property {boolean} playable  false＝選択画面で「封」
 * @property {string} weaponName @property {string} lackText
 * @property {number} esekiDamageMul  穢石への打・射の倍率（白雪0.5）
 * @property {number[]} armorComboSteps  怯まない連撃段（岩丈[2,3]）
 * @property {number} magatamaStart
 * @property {{'◎':string[], '◯':string[], '△':string[]}} lines  一言（06 3.3）
 */
/** @typedef {{kind:'none'|'circle'|'fan'|'band'|'pillars', rM?:number, deg?:number, widthM?:number, lenM?:number}} TelegraphMarker
 *  予兆の地面の印（04 1.1）。描画は `telegraph.moveId` から EnemyAttackDef を引いてこの形を描く（イベントに形は載せない） */
/** @typedef {Object} EnemyAttackDef
 * @property {string} moveId  技ID。敵は `<敵ID>.<名>`（例 inu.bite）、ボスは `boss.<名>`（例 boss.slam）
 * @property {number} telegraphF @property {'normal'|'heavy'|'special'} kind @property {Glyph|null} glyph
 * @property {0|1|2} tokenCost @property {[number,number]} rangeM @property {number} cooldownS
 * @property {number} [weight]  使える技が複数のときの重み（04 2.5。ボスは config/boss.js の bossWeights が正）
 * @property {number} [aimLockBeforeHitF]  判定開始のこのf前に狙いを固定（既定 config `aimLockBeforeHitF`）
 * @property {TelegraphMarker} marker
 * @property {number} [crushBreak]  予兆中に受けた崩しがこれ以上で潰れる（穢を作る技）
 * @property {{rM:number, fwdM:number}} [makesEiki]  完了時に穢域を作る
 * @property {number} [introTelegraphF]  導入の旗が立った個体だけ使う予兆
 */
/** @typedef {Object} EnemyDef
 * @property {string} id @property {string} name @property {Elem|null} element  null は testOnly の木偶のみ（五行×1.0）
 * @property {'small'|'large'} size @property {'inu'|'tomoshi'|'karakasa'|'menoni'|'ishikori'|'dummy'} ai  'dummy'＝試験用の木偶（攻撃なし）
 * @property {boolean} [testOnly]  試験用（木偶）。ステージには置かない。`element` が null でよいのはこれが真のときだけ
 * @property {number} hpMax @property {number} breakMax @property {{rM:number, hM:number}} capsule
 * @property {boolean} flying @property {number} hoverM @property {number} speedMps
 * @property {number} runSpeedMps  追う速さ（speedMps は歩き・周回） @property {number} turnDegPs
 * @property {number} aggroRangeM @property {number} leashM @property {number} gaugeOnKill
 * @property {boolean} sealable  false なら結界の対象外（03 7.1。値は04）
 * @property {{viewDeg:number, viewM:number, hearM:number, heightTolM:number}} perception
 * @property {number} pushWeight  02 2.4・04 2.8 の押し重み
 * @property {[number,number]} circleRM  攻撃権待ちの周回半径の範囲
 * @property {number} breakStunS  崩れの長さ（小型は0）
 * @property {{arcDeg:number, backArcDeg:number, blocks:DmgType[]}|null} guard  面鬼の正面ガード（04 3.5）
 * @property {{magatamaCount:number, fudaCount:number, soulPct:number, soulCount:number}} drops  写し（正本は03・06）
 * @property {EnemyAttackDef[]} attacks @property {Record<string,MoveDef>} moves @property {RigDef} rig
 */
/** @typedef {EnemyDef & {
 *  phases:{untilHpPct:number, order:'fixed'|'weighted', attacks:string[]}[],
 *  kaname:{count:number, hp:number, breakGainMul:number}, breakRecoverS:number, stunS:number,
 *  resealCooldownS:number, arenaRM:number, prefDistM:number,
 *  hurtParts:{id:string, shape:HitShape, kuzushiDyM?:number}[]}} BossDef
 *  phases は段階ごとに使う技IDの列だけを持つ（順・重み・冷却の数値は config/boss.js、04 4.3）。
 *  hurtParts はボスの被弾部位（04 4.1。同じ攻撃が複数部位に触れても1回）。kuzushiDyM は崩れ中の上下のずれ */
/** @typedef {{kind:'cyl', rM:number, hM:number} | {kind:'box', half:V3, yawDeg:number} | {kind:'sphere', rM:number}} ShapeKind */
/** @typedef {ShapeKind & {offset:V3, walkable:boolean, camBlock:boolean, projBlock:boolean}} ShapeDef */
/** @typedef {Object} PropDef
 * @property {string} id @property {PartDef[]} parts @property {ShapeDef[]} colliders
 * @property {'baked'|'toon'} mat @property {'always'|'landmark'|'none'} outline @property {boolean} instanced
 */
/** @typedef {Object} StageDef
 * @property {string} id @property {string} name @property {number} seed
 * @property {[number,number]} sizeM  [x幅, z奥行]。座標は **原点＝地図の北西の角（海面の高さ）、+X＝東、+Z＝南、+Y＝上**（05 1.1）
 * @property {number} cellM  0.5
 * @property {{gen:string, params:Record<string,unknown>}} terrain  gen/terrain.js の関数名と引数（中身は05 1.3〜1.5・8章）
 * @property {{id:string, points:[number,number][], widthM:number, shoulderM:number, hM:[number,number], surface:'sand'|'stone'}[]} paths
 *           hM＝[始点の高さ, 終点の高さ]（弧長で線形）、shoulderM＝路肩のぼかし幅（05 1.3）
 * @property {number} seaLevelM
 * @property {{id:number, name:string, rect:[number,number,number,number], home:V3}[]} zones  rect=[x0,z0,x1,z1]
 * @property {{id:string, prop:string, pos?:V3, yawDeg?:number, scale?:number|V3, zone:number, variant?:number, walkable?:boolean,
 *   rule?:{path:string, s:[number,number][], stepM:number}}[]} props
 *           scale は数1つなら [s,s,s]。pos.y 省略は地形の高さ。variant は小道具の型（岩 0〜5）。walkable は PropDef の当たりの上書き。
 *           rule は道に沿った並べ置き（千本鳥居。gen/props.js が展開し、id は `${id}${2桁の通し番号}`。05 2.4）
 * @property {{id:string, enemy:string, pos:V3, yawDeg:number, zone:number, group:string,
 *   wake:'always'|'afterTut'|`tut:${string}`,
 *   intro?:{passive?:boolean, minHp1?:boolean, attacks?:string[], dmgMul?:number, noEiki?:boolean}}[]} spawns
 *           group＝気づきを共有する群れ、wake＝起動条件、intro＝導入中だけ有効な旗（05 4章、04 2.2）
 * @property {{id:string, color:EsekiColor, pos:V3, hp:number,
 *   access:{ground:boolean, airDash:boolean, shootFromM:number|null}}[]} eseki  access は06 2.4の相性計算用（05が記入）
 * @property {{id:string, pos:V3, rM:number, coreHp:number, tutorialCoreLock?:boolean}[]} eiki  tutorialCoreLock＝導入中は穢核が壊れない
 * @property {{id:string, pos:V3, rM:number, element:Elem|'cycle', cycleS:number}[]} ryuketsu
 * @property {string} bossId  BossDef の id（06 2.2 の相性計算・04）
 * @property {{pos:V3, yawDeg:number, gaugeReq:number}} bossGate
 * @property {{center:V3, rM:number}} bossArena
 * @property {{id:string, pos:V3, yawDeg:number}[]} checkpoints
 * @property {{pos:V3, yawDeg:number}} playerStart
 */
/** @typedef {{kind:'btn', id:BtnId} | {kind:'stick'} | {kind:'camera'} | {kind:'star', elems:Elem[]}
 *  | {kind:'world', ref:string}} HighlightTarget   ref はステージ物の文字列ID（spawn・prop・eiki・eseki の id）。シムが実体へ引く */
/** @typedef {{kind:'tap'|'hold'|'drag'|'flick'|'starPath', at:HighlightTarget,
 *  pathPx?:[number,number][], holdS?:number}} HandHint */
/** @typedef {Object} TutorialStep   導入の台本の1手順（data/tutorial.js。中身は05 7章、表示は01 7章）
 * @property {string} id @property {string} text  白雪で変わる文は `textByChar:{shirayuki:string}` で上書き
 * @property {Record<string,string>} [textByChar]
 * @property {BtnId[]} unlock  この手順で解放するボタン（累積）
 * @property {HighlightTarget|null} highlight @property {HandHint|null} hand
 * @property {number} timeMul  世界倍率に掛ける導入の倍率（0〜1、core 4章）。0 の間は符の構えの制限時間を止める（03 9.1）
 * @property {number} [timeMulInFu]  符の構え中だけ timeMul の代わりに使う倍率（05 手順10は0）
 * @property {{afterStep:string|null, delayF?:number, nearRef?:string, nearM?:number}} startWhen
 *           前の手順の完了（null＝ステージ開始）から delayF 実t後、かつ nearRef から nearM 以内に入ったら始める
 * @property {{wake?:string[], minRes?:{kekkai?:number, magatama?:number, fuda?:number},
 *   slowOnTelegraph?:{ref:string, leftF:number, mul:number, untilBtn:BtnId}}} [onStart]
 *           wake＝起動する spawn の id、minRes＝資源を max(現在, 値) にする、slowOnTelegraph＝ref の敵の予兆の残りが leftF になった tick に timeMul=mul、untilBtn を押した次の tick に1へ
 * @property {{kind:'stickHoldS'|'camDragPx'|'btnPress'|'simEvent'|'standOn'|'near', n?:number, id?:BtnId,
 *   event?:{type:string} & Record<string,unknown>, ref?:string, m?:number}[]} waitFor
 *           全て満たしたら完了。simEvent は type と、指定したペイロードの値（ステージ物は文字列ID）の一致。standOn＝ref の小道具の上に接地、near＝ref から m 以内
 */
/** @typedef {Object} SaveDataV1
 * @property {1} v @property {number} updatedAt  保存時刻（platform 側で付与）
 * @property {number} tamakake
 * @property {Record<string,Record<string,number>>} upgrades  キャラID→強化ID→段
 * @property {string[]} esekiTaken  初回満額を受け取った穢石ID
 * @property {boolean} tutorialDone  最上位に置く（settings の中ではない）
 * @property {Record<string,{count:number, bestTimeS:number, bestPurityPct:number}>} clears  キーは `${stageId}/${charId}`
 * @property {RetryV1|null} retry  記録地点からの再開（06 8章）
 * @property {Record<string,number|boolean|string|object>} settings  キーは config/settings.js の表（01 6.1 が定義）
 * @property {string} [lastCharId]  前回選んだキャラ（無ければ 'fuma'）。v1 のまま任意項目として足す
 */
/** @typedef {{stageId:string, charId:string, kind:'checkpoint'|'bossGate', checkpointId:string,
 *  snap:{gauge:number, gaugeMax:number, magatama:number, timeTicks:number,
 *        killedSpawnIds:string[], brokenEsekiIds:string[], purifiedEikiIds:string[],
 *        runBrokenEsekiIds:string[], runDropRolledSpawnIds:string[],
 *        stats:{kills:number, mikiri:number, maxCombo:number, tamakake:number}}}} RetryV1  中身の意味は06 6.1・8章 */
/** @typedef {{v:number|boolean|string|number[]|string[]|Record<string,unknown>, min?:number, max?:number, step?:number, desc:string}} ConfigEntry
 *  配列・オブジェクトの値も持てる（例 `hitstopMultiMul`・`charMove`・設定の `btnLayout`）。品質の3列の表（8.9）は `v:{high, mid, low}` */
/** @typedef {Record<string,ConfigEntry>} ConfigTable */
```

### 3.1 SimEvent（全一覧）
`/** @typedef {{[K in keyof SimEventMap]: {type:K, tick:number} & SimEventMap[K]}[keyof SimEventMap]} SimEvent */`。`SimEventMap` は下表の型をそのまま写す。ここに無いイベントを使うには、先にこの表と `types.js` に足す。`pos` は V3、`id` は数値のエンティティID（穢石・穢域などステージ物は文字列ID）。

| type | 内容 | 主な購読 |
|---|---|---|
| `swing` | {actorId, moveId, element, heavy} 攻撃判定の開始 | 軌跡、振り音 |
| `hit` | {attackerId, targetId, attackInstanceId, moveId, damage, dmgType, element, affinity:'adv'\|'dis'\|'none', seal:'none'\|'sealed'\|'fuhou', pos, hitstopF, heavy} | 火花、命中音、数字 |
| `guard` | {attackerId, targetId, pos} 面鬼の正面で弾かれた | 金属音 |
| `kill` | {id, enemy:string, pos, byId} | 消滅、音 |
| `kuzushi` | {id, on:boolean} 崩れの開始/回復 | ボスHP帯 |
| `hitRevoked` | {targetId, attackInstanceId} 見切りの遡り（03 6.2）で命中を取り消した | 数字・HP表示の巻き戻し（音なし） |
| `telegraph` | {actorId, attackInstanceId, moveId, glyph:Glyph\|null, durF, offscreen:boolean, pos} | 漢字、地面の範囲（moveId の EnemyAttackDef.marker から描画側が形を引く）、矢印、予兆音、ボス技の見た目と音（04 の技ID `boss.<名>`）。ボス技の発動の見た目と音は `swing.moveId`。`bossMove` というイベントは作らない |
| `projectileSpawn` | {id, defId, ownerId, pos} | 弾の見た目 |
| `projectileEnd` | {id, reason:'hit'\|'terrain'\|'shape'\|'life'\|'mamori'\|'cut', pos} cut＝プレイヤーの打で斬られた（`cuttable`、04 3.2） | 消滅 |
| `mikiri` | {pos, attackInstanceId, fuGain:0\|1} | 朱印、残像、拍子木 |
| `dodge` | {kind:'step'\|'airDash'\|'flip'} | 息の音 |
| `jump` | {} | 音 |
| `land` | {fallM} | 砂、音 |
| `footstep` | {actorId, surface:'grass'\|'sand'\|'stone'\|'rock'} | 足音 |
| `kekkaiPlace` | {targetId:number\|null, pos, trap:boolean} | 十二面体、りん |
| `kekkaiTrapTrigger` | {targetId, pos} | 同上 |
| `kekkaiBreak` | {targetId:number\|null, reason:'expire'\|'hits'\|'fuhou'\|'trapTimeout'} | 消滅 |
| `kekkaiCharge` | {count} 1回分回復 | ボタン |
| `kekkaiFail` | {reason:'trapLimit'\|'cooldown'\|'noCharge'\|'range'} 消費なしの失敗（03 7.1）。trapLimit＝対象なしで罠がすでに1つある、cooldown＝ボスの再封印禁止中、noCharge＝所持0（見切り減速中を除く）、range＝f8 の再確認で範囲外 | 失敗音、ボタンの×揺れ |
| `fuhou` | {targetId, pos, big:boolean} | 破片、「破」 |
| `ougiCharge` | {stage:0\|1\|2\|3} 0=溜め開始 | 円陣、鈴 |
| `ougiCancel` | {reason:'out'\|'slide'\|'hurt'\|'short'\|'air'} short＝0.6s未満の不発。同じtickに ougiOut と回避の pressed があれば slide | 灰の輪 |
| `ougiRelease` | {stage:1\|2\|3, moveId} | 一閃、BGM下げ |
| `fuStart` | {} | 彩度、星 |
| `fuStroke` | {from:Elem, to:Elem, index:number} | 筆音、鈴 |
| `fuCast` | {kind:FuKind, element:Elem, strokes:number} | 各術の演出 |
| `fuCancel` | {reason:'noTouch'\|'noStroke'\|'hurt'\|'button'} | 星を消す |
| `eikiSpawn` | {id, pos, rM, byEnemy} | 地形の円 |
| `eikiPurify` | {id, pos, byEnemy} | 金箔、野菊、鈴 |
| `ekakuBreak` | {eikiId, pos} | 破片 |
| `infect` | {on:boolean} | 状態表示 |
| `esekiHit` | {id, color:EsekiColor, pos, hpLeft:number} 壊れない命中（hitGroup ごと） | 白3f＋揺れ（07） |
| `esekiBreak` | {id, color:EsekiColor, pos, first:boolean} | 破片 |
| `tamakakePickup` | {amount, total, chain:number} | 雫、上がる音程 |
| `gaugeChange` | {value, delta, source:'kill'\|'eiki'\|'eseki'} | 掛軸 |
| `gaugeStage` | {stage:1\|2\|3\|4, value} 25/50/75/100 | 色調、朱印 |
| `bossGateOpen` | {pos} | 光柱 |
| `ryuketsuEnter` | {id, relation:'heal'\|'curse'\|'neutral'} | 光、音 |
| `ryuketsuExit` | {id} | — |
| `ryuketsuDeplete` | {id} | 休止の見た目 |
| `buff` | {kind:'sei'\|'ryuketsuCurse'\|'mamori', on:boolean} | 縁の光、守の札 |
| `playerHurt` | {damage, kind:'flinch'\|'down', attackerId, element, pos} | 揺れ、HP |
| `playerSealed` | {on:boolean} ボスの「封」 | 十二面体 |
| `playerDeath` | {} | 暗転 |
| `seaFall` | {pos} | 水音 |
| `respawn` | {reason:'sea'\|'restart'\|'retryCheckpoint'\|'retryBoss', pos} sea＝落水の復帰、restart＝ステージ最初から、retryCheckpoint＝記録地点から（鳥居の前）、retryBoss＝鳥居の記録から | 補間を切る |
| `checkpoint` | {id} | 保存 |
| `zoneEnter` | {zone:number} | 環境音、自動保存 |
| `lockOn` | {targetId:number\|null} null=解除 | 注目の印 |
| `camReset` | {} | — |
| `combatMode` | {on:boolean} | BGM の層 |
| `bossIntro` | {} | 名前とHP帯 |
| `bossPhase` | {phase:1\|2} | 亀裂、BGM |
| `kanameBreak` | {id, pos} | 破片 |
| `bossDefeat` | {pos} | 演出 |
| `stageClear` | {timeS, purityPct, tamakake} | 結果画面 |
| `tutorialStep` | {step:string} 台本の step id（05）。導入の終わりは `step:'done'` | 教示UI |

- **イベントにしないもの**：低HPの表現（07 の `uInk`、08 の心音）は描画・音の側が毎フレーム `player.hp/hpMax` を見て決める（開始 <25%、停止 ≥28%。値は 08 の `lowHpOnPct/lowHpOffPct` を 07 も使う）。ダメージ数字は `hit` から作る。
- **hit の強さの段**（07 の墨滴・08 の命中音が共用）：heavy が真、または hitstopF ≥ 12 → 重。hitstopF 8〜11 → 中。それ以外 → 軽（08 10章の受け入れ基準2と同じ境）。

---
## 4. ゲームループ・時間・決定論

### 4.1 ループ（`app/loop.js`）
```
STEP_MS = 1000/60
onFrame(nowMs):                                  // requestAnimationFrame
  if paused or hidden: last = nowMs; acc = 0; render(1); return
  acc += min(nowMs - last, 250); last = nowMs
  n = floor(acc / STEP_MS)
  if n > maxTicksPerFrameCount: n = maxTicksPerFrameCount; acc = acc mod STEP_MS   // 遅れは捨てる
  else acc -= n * STEP_MS
  repeat n: frame = collector.build(world.tick, nowMs); stepWorld(world, frame); pending.push(...world.eventsOut)
  bus.dispatch(pending); pending.length = 0      // tick 単位でまとめて配送（render → audio → ui の順）
  render(alpha = acc / STEP_MS)
```
- `visibilitychange` で hidden：一時停止（理由 `hidden`）、保存、音の停止。visible に戻っても自動で再開しない（一時停止メニューを出す）。
- 一時停止中はシムを呼ばない。描画は最後の状態のまま続ける（メニューの背景）。
- `?test=1` ではループを起動しない。

### 4.2 TimeSystem（`core/time.js`）
- `world.tick`：実tick（整数）。`stepWorld` の最後に +1。
- 各エンティティの倍率 `scale = q(worldMul × indivMul × hs)`。`hs` は `tick < hitstopUntil` なら 0、それ以外 1。`q(x) = round(x×4096)/4096`。
- `localF += scale`（毎tick）。4096分の1の倍数の和は倍精度で誤差なく足せるため、端末間でもずれない。技のフレームは `floor(localF − moveStartLocalF)`。
- 移動の積分は `pos += vel × scale / 60`。
- 世界倍率：符の構え中 `fuWorldMul`=0.15、それ以外 1。個別倍率：見切りの減速 `mikiriSlowMul`=0.3 を `slowUntil`（実tick）まで。複数の個別倍率は掛け合わせる。
- ヒットストップは命中した tick T に `hitstopUntil = T + 1 + hitstopF` を設定する（次のtickから止まる。実tickで数える）。

| 状況 | 期待 |
|---|---|
| 符の構え中に命中 hitstopF=14 | 止まるのは実tickで14（6.7倍に伸びない） |
| 見切り減速中の敵が符の構えに入る | 0.3×0.15=0.045 → q で 0.044921875 |
| 一時停止 | tick も localF も進まない |

config `src/config/time.js`
| configキー | 値 | 単位 | 説明 |
|---|---|---|---|
| `tickRateHz` | 60 | Hz | 固定更新の回数 |
| `maxTicksPerFrameCount` | 5 | 回 | 1描画で進める上限 |
| `frameDeltaClampS` | 0.25 | s | 1描画で足す時間の上限 |
| `scaleQuantCount` | 4096 | — | 倍率の量子化の分母 |
| `fuWorldMul` | 0.15 | 倍 | 符の構えの世界倍率 |
| `mikiriSlowMul` | 0.3 | 倍 | 見切りの減速 |

### 4.3 1tickの順序（`sim/step.js`）
1. 入力を保存。プレイヤーの位置履歴（直近5tick、見切りの遡り用）を更新。前tickの状態を `prev` に写す（補間用）。
2. TimeSystem：世界倍率と各エンティティの scale を決める。
3. プレイヤー（入力→状態機械→移動）。
4. 敵とボスを ID の昇順で更新（距離地図の更新は `navRebuildF` ごと）。
5. 弾を ID 順に移動し、当たりを調べる。
6. 攻撃判定：攻撃側 ID 昇順 × 被弾側 ID 昇順で照合し、ダメージ・ヒットストップ・イベントを出す。
7. ステージの処理（穢域・感染・龍穴・地脈・海・チェックポイント）。
8. カメラ（実tickで更新）。
9. 死んだエンティティを、順序を保って詰める。`world.eventsOut` を確定し、`tick++`。

### 4.4 決定論
- 乱数は `core/rng.js`：splitmix32 で種を広げた xorshift128（32bit）。`next()→uint32`、`float()`（[0,1)）、`range(a,b)`、`int(n)`、`pick(arr)`。
- 流れを分ける：`world.rng = createRng(seed)`、用途ごとに `fork(label)`（種＝hash32(seed, label)）。`ai`・`combat`・`spawn`。描画と音は別の種 `seed ^ 0x9e3779b9` を使い、ハッシュに含めない。
- エンティティIDは生成順の整数（1から）。配列は常にID昇順。`for...in` と `Object.keys` での反復は sim で使わない（`Map` と配列のみ）。
- 三角関数などは V8 内（Node と Chromium）で一致する。iPhone（JavaScriptCore）で記録した入力は Node で完全一致しないことがある（提案P4）。

### 4.5 イベントバス（`core/events.js`）
- シムは `emit(world, type, payload)` で `world.eventsOut` に `{type, tick, ...payload}` を積む。
- 購読側は `bus.on(handler)` で配列ごと受け取る。購読側はイベントでシムを変えない。
- テスト用に直近2000件を環状に保持する（`__game.getEvents`）。

---
## 5. 入力（意味と配置の値は 01）

### 5.1 層と役割
- 全画面の `#input`（canvas の上、HUD の下。HUD は `pointer-events:none`）が全ての pointer を受け、`setPointerCapture` する。
- `pointerRouter`：pointerdown で役割（`PointerRole`、01 2.2）を1つ決め、up/cancel まで保持する。割当の順序の正本は 01 2.3。要約：
  1. 符の構え中 → `fuCancel`（スティック範囲かつ未描画）／`draw`（符ボタンを押している指は除く）
  2. 一時停止の判定 → `button(pause)`。layout のボタン判定円の内側 → そのボタン（重なりは「距離÷判定半径」が最小）
  3. スティック出現範囲 → `stick`
  4. それ以外 → `camera`（タップ候補も兼ねる）
- 役割の変更は2つだけ。攻撃の指が押下点から `attackCamSlidePx`(28) 以上動いたら `attackDragCamera`（`attack.down=false`、released は出さない。以後カメラ）。奥義の指が回避の判定円に入ったら、`ougi.down=false`（released は出さない）、そのtickの `ougiOut=true`、同じtickに `dodge.pressed`、役割を `button(dodge)` に変える。
- `pointercancel` と `lostpointercapture` は離したことにする。visualViewport の resize で配置を作り直しても、押下中の役割は変えない。

### 5.2 layout（`input/layout.js`、純関数）
`computeLayout(viewW, viewH, safe{l,r,t,b}, settings) → {buttons:{id, x, y, rVisPx, rHitPx}[], stickZone, cameraZone, pentagram:{cx, cy, rPx, points:Record<Elem,[x,y]>}}`。値は `config/layout.js`（右下の角からの距離、01 が表を持つ）。左利きは x を反転（五芒星は位置だけ）。テストはこの関数の結果から座標を得る。

### 5.3 InputFrame の生成（`input/collector.js`）
- pointer とキーの出来事を受けるたびに、ボタンごとに `downNow` と、未配送の `pressLatched`・`releaseLatched`・`pressTimeMs` を記録する。
- `build(tick, nowMs)`（1描画で n tick 進むとき、n 回呼ぶ。n=0 の描画では呼ばず、出来事は次へ持ち越す）：
  - `pressed = pressLatched`。配送したら消す。1描画で複数tick進んでも、押下は最初のtickだけに入る。
  - `pressed` と同じ区間で離された短いタップは、このtickを `down=true, released=false` にして、次のtickで `down=false, released=true` を返す（シムが押下を必ず見る）。
  - `ageF = clamp(round((nowMs − pressTimeMs)/STEP_MS), 0, inputAgeMaxF)`。
  - 最初のtickだけに入れるもの：`pressed`・`taps`・`flick`・`fu.edges`・`fu.commit`・`fu.cancel`・1tickだけの `ougiOut`（5.1・3章）。配送したら空にする。
  - 全tickに同じ値：`down`・`stick`・`camHeld`・取消域にいる間の `ougiOut`・`fu.touching`・`fu.first`。
  - `camDeg`：前の配送以後に溜まった回転量を n 等分して各tickへ（滑らかさのため）。
- キーボード（`input/keyboard.js`）：キーの割当は 01 2.12 の表が正本（攻撃 J・回避 K・跳躍 Space・奥義 L・結界 U・符 I・注目 O・はじき Q/E・一時停止 P/Esc、構え中は 1〜5＝木火土金水、Enter＝`fu.commit`、Esc＝`fu.cancel`）。矢印キーのカメラは `keyCamDegPs` で `camDeg` を作る。L を押したまま K は滑らせと同じ（`ougiOut` 1tick＋`dodge.pressed`）。

### 5.4 五芒星（`input/pentagram.js`、純関数）
`fuStep(st, sample{x,y,tMs,phase:'down'|'move'|'up'}, geom, cfg, fudaAvail) → {st, edge:[Elem,Elem]|null, captured:Elem|null}`。状態 `st = {first, cur, edges, used, samples}`。判定の細部（線分での最短距離、進行方向の取り方）の正本は 01 3.1〜3.2。
1. `st.cur == null`：前標本→今の標本の線分が `fuStartRadiusPx` 内を通る最も近い点を捕まえる（吸着なし）→ `st.cur`、`st.first` に入れる。
2. 候補は `st.cur` と相剋の線で結ばれた2点のうち、辺が未使用のものだけ（木—土、土—水、水—火、火—金、金—木）。`st.edges.length ≥ fudaAvail` なら候補なし。
3. 距離 ≤ `fuNextRadiusPx`、または距離 ≤ `fuMagnetRadiusPx` かつ進行方向と点への方向の差 ≤ `fuMagnetDeg` のとき捕まえ、辺 `[cur, 新]` を `used` に入れて返し、`cur` を移す。
4. 使用済みの辺の先・隣でない点では何も起こさない（`cur` も移らない。シムの現在点と食い違わないため）。シムも 03 9.1 の規則で再検証し、不正な辺は捨てる。`up` は状態を変えない（離した後の猶予はシムが実tickで数える）。

config `src/config/input.js`（五芒星の位置と半径の既定値は01と同値。同じファイルの残りのキー（タップ・はじき・振動など）は 01 2.11。重なるキーはこの表の名前が正本）
| configキー | 値 | 単位 | 説明 |
|---|---|---|---|
| `inputAgeMaxF` | 4 | f | 押下の遡りの上限 |
| `attackCamSlidePx` | 28 | px | 攻撃の指がカメラになる距離 |
| `ougiOutPx` / `ougiBackPx` | 72 / 56 | px | 奥義の取消・復帰 |
| `fuStartRadiusPx` / `fuNextRadiusPx` | 44 / 40 | px | 点の判定半径 |
| `fuMagnetRadiusPx` / `fuMagnetDeg` | 60 / 25 | px / deg | 吸着 |
| `fuDirMinPx` | 12 | px | 進行方向を取る標本の最小距離（01 §3.1。10 の `star*` キーはこの表の名前で作る） |
| `keyCamDegPs` | 120 | deg/s | 矢印キーのカメラ速度 |

### 5.5 合成入力（`input/synthetic.js`）
`makeFrame(tick, partial) → InputFrame`（省略した値は中立）。リプレイ・Node テスト・`__game.setInput` が使う。

---
## 6. 衝突（`sim/collision/`）

config `src/config/collision.js`
| configキー | 値 | 単位 | 説明 |
|---|---|---|---|
| `terrainCellM` | 0.5 | m | 高さ格子の間隔 |
| `shapeGridCellM` | 4 | m | 静的形状の索引の升 |
| `stepUpM` | 0.4 | m | 登れる段差 |
| `stepDownM` | 0.4 | m | 下り坂で吸着する段差 |
| `collisionEpsM` | 0.000001 | m | 境界の比較の誤差（0.40m を登り 0.41m で止まる判定を浮動小数でぶれさせない） |
| `slopeMaxDeg` | 45 | deg | これを超える斜面は壁 |
| `pushIterCount` | 3 | 回 | 押し出しの反復 |
| `projStepM` | 0.25 | m | 弾の刻み（弾の半径が小さければ半径） |
| `camProbeRM` / `camStepM` | 0.25 / 0.25 | m | カメラの球と刻み |
| `camThinPillarRM` | 0.4 | m | これ未満の円柱はカメラを通す |
| `seaFallDepthM` | 0.3 | m | 足が水面よりこれだけ下で落下 |
| `safePointEveryF` | 30 | f | 安全地点の記録間隔（実tick） |
| `safeEdgeDistM` | 1.5 | m | 安全地点に必要な崖・海からの距離 |
| `knockbackEdgeStopM` | 1.0 | m | 被弾の吹き飛びを止める崖・海からの距離 |

### 6.1 高さ格子
- `gen/terrain.js` が StageDef から `heights: Float32Array((nx+1)(nz+1))` と、升ごとの `surface: Uint8Array(nx·nz)`（0 草、1 砂、2 石、3 岩、4 崖、5 海、6 禁止）を作る。140×110m で頂点281×221。
- `heightAt(x,z)`：升の4頂点を双一次補間。`normalAt`：±0.25m の中心差分。
- 起動時に `edgeDist: Float32Array`（各升から崖・海の升までの距離、8近傍のBFS×0.5m）を作る。

### 6.2 静的形状と索引
- 種類：鉛直円柱・向き付き箱（yaw のみ）・球。フラグ `walkable`（上に乗れる）・`camBlock`・`projBlock`。
- `gen/props.js` が配置後の世界座標の形状配列を作る。4m 升ごとに形状番号の配列を持ち、AABB で検索する。

### 6.3 キャラの移動解決（`mover.js`）
キャラは鉛直カプセル（半径 r、高さ h、原点は足元）。
```
move(c, dx, dz, dy):
 1. 水平：p' = p + (dx,dz)
    hNew = groundAt(p')；c.grounded で (hNew − c.y > stepUpM + collisionEpsM または slope(p') > slopeMaxDeg) なら
      斜面の勾配に直交する成分だけ動かす（滑り）。それも不可なら水平移動なし
 2. 押し出し pushIterCount 回：近い形状ごとに、縦の範囲が重なれば水平に押し出す
      円柱：円と円。箱：局所座標で最近点（中にいれば最も近い面へ）。球：カプセルの線分上の最近点
      walkable で、足が 上面 − stepUpM − collisionEpsM 以上なら押し出さず「足場の候補」にする（0.40m の段は登れる）
 3. 縦：y += dy；g = max(heightAt, 足場候補の上面)
      dy ≤ 0 かつ y ≤ g → y = g、着地
      接地中で g が y − stepDownM 以上なら y = g（下り坂の吸着）。それより下なら空中へ
 4. 海：surface==海 または y < seaLevelM − seaFallDepthM → 落下（stageLogic/sea）
```
- 吹き飛び中は、移動先の `edgeDist < knockbackEdgeStopM` なら水平移動を0にする（D27）。
- 安全地点：接地中かつ `edgeDist ≥ safeEdgeDistM` の位置を `safePointEveryF` ごとに記録（8個の環状）。海からの復帰先は最新。

### 6.4 攻撃判定
- `HitShape` をキャラの位置と向き（yaw）で世界座標へ変換し、被弾カプセル（線分 [y+r, y+h−r]）と照合する。球は長さ0のカプセル。線分と線分の最近距離 ≤ r1+r2 で命中。
- 攻撃ごとに `attackInstanceId`（世界で通し番号）を振り、`(attackInstanceId, hitGroup, targetId)` の命中済み集合で多重命中を防ぐ。
- 見切りの残像も被弾カプセルとして同じ関数で照合する。

### 6.5 弾
- 1tickの移動量 `v·scale/60` を `projStepM` 以下に刻み、各点で ①高さ（y−r < heightAt）②projBlock 形状 ③被弾カプセル（球対カプセル）④守の障壁、の順で調べ、最初の当たりで止める。

### 6.6 カメラ
- 注視点から希望位置へ、半径 `camProbeRM` の球を `camStepM` ずつ進め、地形または camBlock 形状（半径 < `camThinPillarRM` の円柱を除く）に触れた1つ手前の距離を返す。平滑化は 02。

---
## 7. 敵の経路（`sim/nav/`）

config `src/config/nav.js`
| configキー | 値 | 単位 | 説明 |
|---|---|---|---|
| `navCellM` | 1 | m | 歩ける格子 |
| `navRebuildF` | 30 | f | 距離地図の作り直し（実tick） |
| `navSeekRadiusM` | 3 | m | プレイヤーの升が歩けないとき種を探す範囲 |
| `sepRadiusM` / `sepWeightMul` | 1.2 / 1.5 | m / 倍 | 敵同士の分離 |
| `orbitWeightMul` | 0.8 | 倍 | 攻撃権の無い敵の周回 |
| `leashM` | 20 | m | 区画の帰巣点からの上限 |

- 歩ける格子：140×110＝15,400升。升の中心が草・砂・石・岩、傾き ≤45°、walkable でない形状に覆われていない。8方向の辺は「高低差 ≤ stepUpM かつ斜めは両隣も歩ける」で `Uint8` のビットに持つ。起動時に1回作る。
- 距離地図：`navRebuildF` ごとに、プレイヤーの升（歩けなければ `navSeekRadiusM` 内で歩ける升すべて）を種に8近傍の幅優先探索。`Uint16`、到達不能は 65535。
- 操舵（毎tick、敵ごと）
  1. 今の升の8近傍で距離が最小の升の中心へ向かう単位ベクトル d。
  2. 分離：`sepRadiusM` 内の他の敵からの反発の和 × `sepWeightMul`。
  3. 攻撃権を待つ敵は、プレイヤーを中心とする接線方向 × `orbitWeightMul`（右回り・左回りは ID の偶奇）。
  4. 和を正規化し、敵の速さで移動。衝突解決は 6.3 と同じ。
- 到達不能（65535）：近接は威嚇、射撃型は撃つ（04）。帰巣点から `leashM` 超で帰巣状態。
- 浮遊（灯魂）：格子を使わず目標へ直進。高さは `heightAt + hoverM`。形状とは押し出しのみ。
- 性能：BFS 1回＝15,400升×8辺＝約12万回の比較。V8 で 1ms 未満。作り直しは 0.5s に1回なので平均 0.02ms/tick。操舵は敵12体で 0.05ms 未満。

---
## 8. 描画技術（`src/render/`。シェーダーの式と色は07）

### 8.1 レンダラー
- `new WebGLRenderer({canvas, antialias:false, alpha:false, stencil:false, depth:true, powerPreference:'high-performance'})`。
- `outputColorSpace = SRGBColorSpace`、`toneMapping = NoToneMapping`、`info.autoReset = false`（1フレームの最初に `info.reset()`、紙墨パスまで合算）。
- `setPixelRatio(min(devicePixelRatio, dprMaxMul[品質]))`。
- 色はすべて `new Color(hex)` を経由する（頂点色は `color.r/g/b` の線形値を書く）。

### 8.2 剛体スキン（`render/rig/buildRig.js`）
（型・属性名・uniform 名・輪郭の太さの式は 07 6.1・4章が正本：骨の `posM`、部品の `shape/dims/offsetM/rotDeg`、属性 `aOutlineNormal`・`aFaceUv`、uniform `uOutlinePx`・`uPxPerM`。下の手順はその実装の順番）
1. RigDef の骨を親から順に `Bone` で作り、`posM` を置く。全骨の世界行列を更新する（バインド姿勢）。
2. 各部品の形を `shape/dims` から作り、部品の `offsetM/rotDeg` を掛け、さらに付く骨のバインド時の世界行列を掛けてモデル空間に置く。
3. 属性を足す：`skinIndex`（Uint16×4＝[骨番号,0,0,0]）、`skinWeight`（[1,0,0,0]）、`color`（THREE.Color）、`aOutlineNormal`（同じ位置（1e−4m に丸める）の頂点の法線の平均）、`aFaceUv`。
4. `mergeGeometries` で1つにする。`SkinnedMesh(geo, toonMat)`、根の骨を add、`bind(new Skeleton(bones))`。
5. 輪郭：同じ geo と skeleton で2つ目の `SkinnedMesh(geo, outlineMat)` を作り、`bind(skeleton, body.bindMatrix)`。`outlineMat` は `MeshBasicMaterial({side:BackSide})` を `onBeforeCompile` で次のように変える。
   - `#include <beginnormal_vertex>` を `vec3 objectNormal = aOutlineNormal;` に置換（skinnormal が骨で回す）。
   - `#include <skinning_vertex>` の直後に `transformed += normalize(objectNormal) * w;`（`w` は 07 4章の式。`uOutlinePx`・`uPxPerM` から頂点シェーダーで計算し、画面上1.5〜4pxに clamp）。
   - キャラごとに材質を clone して `uOutlinePx` を設定する（プログラムは共有される）。`uPxPerM` は毎リサイズで更新。
6. 武器は同じ手順の別 SkinnedMesh（＋輪郭）を手の骨に add する。1体＝本体2＋武器2命令。

### 8.3 ポーズ（`render/rig/pose.js`）
`poseAt(rig, move, localF, loco, out) → out`（`out` は骨数×4の Float32Array の四元数＋根の位置）。純関数で、入力を書き換えない。
1. 基本：MoveDef.pose のキーフレームを `localF`（補間した小数）で線形または ease 補間。技が無いときは locomotion の周期（02 の速さから位相）を使う。
2. 手続きの層を足す：呼吸（sin）、着地の縮み、足首を地面の法線へ傾ける。
- 揺れもの（袖・髪・尾・紙垂）のばねは見た目だけの状態として `render/rig/springs.js` が持つ（シムに影響しない。純関数の対象外）。
- 描画側は `localF` を前後tickで補間して `poseAt` を呼ぶ。

### 8.4 地形シェーダーの円配列
- uniform の名前・中身・種類の番号・割り当ての順と上限は **07 3.5 が正本**（`uGroundCircleA[16]`・`uGroundCircleB[16]`、種類 0なし 1穢域 2龍穴 3丸影、穢域は最大6・龍穴は最大2・残りを丸影）。本節は注入の仕方だけを決める。
- 同じ glsl 片（`groundCircles`）を地形と静的小道具の材質へ注入する（小道具の上にも影が落ちる）。丸影は面の y が影の y −0.3〜+0.1m のときだけ。

### 8.5 まとめて描く
- `InstancedMesh`：千本鳥居、松の葉、灯籠、紙垂、野菊、結界の破片、粒子のプール。インスタンス全体で `computeBoundingSphere()` して視錐台で間引く。
- 静的物：区画（4つ）×材質（baked・toon）ごとに `mergeGeometries`。輪郭は区画ごとに1つの統合メッシュ（品質で出し分け）。
- 地形：高さ格子と同じ0.5m の頂点で、3×2 の6塊に分けて間引く（低品質は1m 間隔に間引く）。

### 8.6 紙墨パス
- 場面を `WebGLRenderTarget(w×s, h×s)` に描く。`s = renderScaleMul`（0.85）。色は `HalfFloatType`（未対応なら `UnsignedByteType`）、`depthTexture = new DepthTexture()`、`samples = msaaSamplesCount`。
- 全画面の三角形1枚の `ShaderMaterial` で画面へ描く。最後に `#include <colorspace_fragment>` で sRGB に変換。紙の粒は `gl_FragCoord`（表示解像度）で計算。
- uniform の名前・型・式の正本は 07 3.7 の表（`tColor tDepth tNoise uResolution uRtResolution uCameraNear uCameraFar uTime uPurity uDesat uInk uInvert uWaveCenter uWaveRadius uFogColor uBleedOn uEdgeOn`）。`uInk` は低HPの表現も兼ねる（`uLowHp` という名前は使わない）。
- MSAA：`msaaSamplesCount=0` で始める。M1 で `tests/e2e/depthMsaa.spec.js` が samples=4 の場面を描き、深度を色にした小さな画像を読み、深度が1.0以外の画素が50%以上あれば「併用可」とする。併用可でも bench で中央値が0.5ms 以上悪化したら0のまま（輪郭と紙の粒がギザギザを隠すため）。

### 8.7 事前コンパイル（`render/warmup.js`）
読み込みの最後に、全ての材質の組合せ（各敵・各キャラ・各VFX・輪郭）を1体ずつ置いた場面を作る。`renderer.compile(scene, camera)` の後、1×1 の描画先に1回描いてから捨てる。

### 8.8 文字アトラス（`render/textAtlas.js`）
- 1024×1024 の Canvas に 128px の升で最大64字（撃・穢・封・見切・破・滅・浄・守・醒・木火土金水・数字など。一覧は07）を描き、`CanvasTexture` にする。
- 字体は `bold 112px "Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif`。`document.fonts.load` は使わない（端末の字体は即座に描ける）。

### 8.9 品質段階（`render/quality.js`）
config `src/config/quality.js`
| configキー | 高 | 中 | 低 | 単位 | 説明 |
|---|---|---|---|---|---|
| `dprMaxMul` | 1.5 | 1.25 | 1.0 | 倍 | DPR の上限 |
| `renderScaleMul` | 0.85 | 0.85 | 0.85 | 倍 | 内部解像度 |
| `particleCount` | 1500 | 800 | 500 | 個 | 粒子のプール |
| `propOutlineMode` | all | landmark | none | — | 静的物の輪郭 |
| `depthEdgeOn` | true | false | false | — | 紙墨パスの深度輪郭 |
| `fogFarMul` | 1.0 | 1.0 | 0.75 | 倍 | 霧と描画距離 |
| `terrainStepCount` | 1 | 1 | 2 | 升 | 地形の頂点の間引き |

- 上の3列の行は ConfigEntry の `v:{high, mid, low}` で持つ（3章）。07 3.1 の `dprMaxMul`・`sceneRtScaleMul` はこの表の `dprMaxMul`・`renderScaleMul` と同じもので、`config/render.js` には置かない（値はこの表が正。10 R10）。

| configキー | 値 | 単位 | 説明 |
|---|---|---|---|
| `autoQualityWindowS` | 2 | s | 中央値をとる区間 |
| `autoQualityMedianS` | 0.018 | s | これを超えたら1段下げる |
| `autoQualityGraceS` | 5 | s | 起動・場面切替・段変更の後に測らない時間 |
| `drawCallMaxCount` | 110 | 回 | 戦闘中の上限（テスト） |

- 毎フレームの間隔（rAF の差）を記録し、`autoQualityWindowS` ごとに中央値を見る。超えたら1段下げ、記録を捨てて猶予を置く。自動では上げない。一時停止・非表示・bench・test 中は測らない。設定で品質を手動指定したら自動は止まる。

---
## 9. 保存（`core/saveSchema.js`＋`platform/storage.js`）
- キー：`tokoyo:save`（SaveDataV1）、壊れたデータの退避 `tokoyo:save.bak`、調整パネルの値 `tokoyo:debug`（`?debug=1` のときだけ読む）。localStorage を読むのは `storage.js` だけ。
- 読込：JSON でない、`v` が無い → `.bak` に退避して既定値。`v < CURRENT` なら `migrations[v]` を順に適用（v→v+1、純関数）。`v > CURRENT` → 退避して既定値。
- 書込：魂片を拾った tick（`tamakakePickup`）、`checkpoint`、`zoneEnter`、設定変更、結果画面、`pagehide`、hidden。失敗（容量・プライベートモード）は例外を捕まえ、`saveFailed` を立てて HUD に1回だけ知らせる。
- 引き継ぎ文字列：`TKY1.` ＋ base64url(UTF-8 の JSON) ＋ `.` ＋ CRC32 の16進8桁。読み込みは検査値と版を確かめてから移行する。設定画面に「コピー」「貼り付け」。
- `navigator.storage.persist()` をタイトルのタップで1回呼ぶ（結果は保存しない）。
- `pageshow` の `persisted` で戻ったら一時停止にする。

- 項目ごとの検証・既定値・`retry`（RetryV1）の作り方と復元は 06 6〜8章。`tutorialDone` と `lastCharId` は最上位、設定は `settings` の中（キーは 01 6.1）。

config `src/config/save.js`：`saveVersionCount`=1（現在の版）、`saveKeyPrefix`='tokoyo:'。

---
## 10. デバッグ（`src/debug/`）

### 10.1 URL 引数
| 引数 | 動作 |
|---|---|
| `?debug=1` | 右上に FPS（直近1sの中央値ms）・描画命令・三角形数・tick・敵数。トグル：判定表示（カプセル・攻撃判定・残像・形状・歩ける格子・面種別、debugDraw の LineSegments。予算の対象外）。config の全キーのスライダー（ConfigTable の min/max/step）、「JSONをコピー」（既定から変えたキーだけ）、「初期化」、入力の記録（リプレイ JSON をコピー） |
| `?test=1&seed=N` | ループを止め、タイトルを飛ばし、音を無効にし、品質を `&q=`（既定 high）で固定。`window.__game` を出す |
| `?test=1&audio=1` | 上に加えて音を有効にする（AudioContext を作り、タイトルのタップと同じ解錠手順を `__game.ready` の前に行う）。08 10章の Playwright 試験用。その spec だけ起動引数に `--autoplay-policy=no-user-gesture-required` を足す |
| `?bench=1` | 最悪場面（ボス舞台、敵10体＋ボス、穢域4、全VFX、カメラは決まった周回）を `&benchS=`（既定20）秒、通常ループで流す。自動降格なし。結果：中央値・p95・p99・最大(ms)、描画命令、三角形、DPR、品質、GPU 名、UA を画面に表で出す |
| `?scene=sandbox\|stage\|boss\|fu-test\|title` | 直接その場面へ（タイトルを飛ばす）。`&char=fuma\|shirayuki\|ganjo`（既定 fuma）。`title` は `?test=1` でもタイトルから始める（音の2択のタップ・戻る番兵・試験メニューの試験用。メニューは DOM なのでループが止まっていても押せる） |


- 見本室（10 §G、依頼者の決定 U7）：`?scene=gallery-rigs`（造形）・`gallery-vfx`（エフェクト）・`stage-view`（白鷺岬の見た目）・`gallery-ui`（画面表示）。シムは動かさず描画だけ。自由カメラ `debug/flyCam.js` は不変条件3の唯一の例外で、この4場面に限る。

### 10.2 `window.__game`（`debug/testApi.js`）
```js
/** @typedef {Object} GameTestApi
 * @property {Promise<void>} ready
 * @property {(n?:number)=>void} step                 n tick 進めて、イベントを配送（既定1）。一時停止中でも進める（一時停止の試験は `paused` を見る）
 * @property {()=>void} render                        補間 alpha=1 で1回描く
 * @property {()=>GameStateView} getState              JSON にできる写し
 * @property {(sinceTick?:number)=>SimEvent[]} getEvents
 * @property {(p:{stick?:[number,number], camDeg?:[number,number], camHeld?:boolean, down?:Partial<Record<BtnId,boolean>>,
 *   ougiOut?:boolean, flick?:-1|0|1, taps?:[number,number][], fu?:InputFrame['fu']})=>void} setInput
 *   stick・camHeld・down・ougiOut は次に変えるまで保持。pressed/released は down の変化から作る。それ以外は次の1tickだけ
 * @property {()=>{state:string, voices:number, lastSounds:{id:string, tick:number}[], busDb:Record<string,number>,
 *   bgm:{track:string|null, state:Record<string,'idle'|'loading'|'ready'|'playing'|'missing'|'error'>, gains:Record<string,number>}}|null} audio
 *   音の状態（08 10章の試験用）。
 * @property {{lumaProbe:(id:number|string)=>{core:number, ring:number}}} debug  明度検査（07 1.3。直前の render() の画素から、対象の投影中心5×5px平均と半径24pxの環の平均の Y）
 *   bgm.state の値は曲ごとの状態名 `'idle'|'loading'|'ready'|'playing'|'missing'|'error'`（意味は08 5.2）。音が無効なら null
 * @property {(btn:BtnId, holdF?:number)=>void} press  down→holdF tick（既定1）→離す→1tick
 * @property {(x:number, y:number, z:number, yawDeg?:number)=>void} teleport  補間を切る
 * @property {(enemyId:string, x:number, z:number, yawDeg?:number)=>number} spawn  エンティティIDを返す
 * @property {(id:number)=>void} kill
 * @property {(path:string, v:number|boolean|string)=>void} setConfig  例 'movement.runSpeedMps'
 * @property {(on:boolean)=>void} godMode             被ダメ0・資源無限
 * @property {(p:{hp?:number, fu?:number, magatama?:number, kekkai?:number})=>void} setPlayer  資源とHPを直接置く（試験の状況作り）
 * @property {(name:'sandbox'|'stage'|'boss'|'fu-test'|'title', o?:{char?:string, seed?:number})=>Promise<void>} loadScene
 * @property {()=>string} hash                        状態ハッシュ（8桁16進）
 * @property {()=>Layout} layout                      computeLayout の結果
 * @property {()=>{calls:number, triangles:number, programs:number}} renderInfo
 * @property {(q:'high'|'mid'|'low')=>void} setQuality
 * @property {(frames:InputFrame[])=>void} playReplay  以後 step はこの列を消費
 */
/** @typedef {{tick:number, scene:string, paused:boolean, worldMul:number,
 *  player:{id:number, pos:V3, vel:V3, yawDeg:number, grounded:boolean, hp:number, hpMax:number, state:string,
 *    moveId:string|null, moveF:number, scale:number, fu:number, magatama:number, kekkai:number, infected:boolean, buffs:string[]},
 *  enemies:{id:number, def:string, pos:V3, hp:number, state:string, sealed:boolean, scale:number}[],
 *  projectiles:{id:number, def:string, pos:V3}[],
 *  camera:{pos:V3, yawDeg:number, pitchDeg:number, distM:number, fovYDeg:number, mode:string, lockId:number|null},
 *  gauge:number, tamakake:number, boss:{hp:number, phase:number, breakPct:number}|null}} GameStateView */
```

---
## 11. テスト基盤

### 11.1 単体テスト（node:test、`tests/unit/`）
time（4.2）、rng（同じ種で同じ列、fork の独立）、hash、config（接尾辞・範囲・tick 換算）、saveSchema（移行・引き継ぎ文字列・壊れたデータ）、collector（短いタップ・複数tick・ageF）、pentagram（全辺・吸着・隣の点を捕まえない）、layout（320px 高で判定円が重ならない）、heightfield、mover（段差0.4登る・0.41登らない・45°・押し出し）、hitbox（カプセル同士の境界）、projectiles（刻みで壁抜けしない）、nav（BFS・到達不能）、damage・hitstop・mikiri（03 の受け入れ基準）、data/validate（全 data が通る。`BossDef.phases` の技ID列と `config/boss.js` の固定の順・重みが同じ技IDの集合を指すことも検査する）、rig、stageSource、不変条件の検査群（2章）、replay。

### 11.2 リプレイ
- `tests/replays/src/<名前>.js` が `export function frames()`（InputFrame の列）と `export const meta = {scene, char, seed}` を出す。
- `tests/replays/<名前>.json`：`{format:1, name, scene, char, seed, ticks, frames:[[回数, 部分InputFrame], ...]（連長圧縮）, hashes:{"60":"…", "120":"…", …, "final":"…"}}`。
- ハッシュ（`core/hash.js`）：FNV-1a 32bit。tick、乱数の内部状態、全エンティティ（ID順の位置・速度・yaw を ×1000 して丸めた整数、hp、状態名、技ID、`localF×4096`、資源）、弾、カメラ、地脈、穢域・穢石の状態。
- `replay.test.js`：Node でシムだけを動かし、60tick ごとに比べる。不一致なら最初の tick と `getState` の差分を出す。
- `npm run replays:update`：src から JSON を作り直す。意図して挙動を変えたときだけ使い、PR の説明に「リプレイ更新：理由」を書く。

### 11.3 Playwright（`playwright.config.js`）
- `testDir:'tests/e2e'`、`testMatch:'**/*.spec.js'`（既定のままだと `tests/unit/*.test.js` まで Playwright が拾う）。`outputDir:'test-results'`。
- 端末：`viewport {width:844, height:390}`、`hasTouch:true`、`isMobile:true`、`deviceScaleFactor:2`。
- 起動引数：`['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']`。
- `webServer: {command:'npx vite build && npx vite preview --port 4173 --strictPort', url:'http://localhost:4173/', timeout:120000, reuseExistingServer:true}`。`workers:2`、`retries:0`、1本の時間制限60s。
- `helpers/game.js`：`boot(page, {scene, seed=1, char='fuma', q='high'})` が `/?test=1&...` を開き `__game.ready` を待つ。`console` の error と `pageerror` を集め、`afterEach` で0件を強制する。
- `helpers/touch.js`（CDP `Input.dispatchTouchEvent`、座標は CSS px、`__game.layout()` から得る）
  | 関数 | 送るもの |
  |---|---|
  | `down(id,x,y)` | `touchStart`。touchPoints は押している全指＋新しい指 |
  | `move(id,x,y)` | `touchMove`。押している全指 |
  | `up(id)` | `touchEnd`。touchPoints は**離す指だけ**（確認済み：残りの指は押したまま） |
  | `cancel()` | `touchCancel`。全指 |
  | `drag(id, from, to, {steps=8, ticksPerStep=1})` | down → move×steps（毎回 `__game.step(ticksPerStep)`）→ up |
  | `tapButton(btnId, holdF=1)` | ボタン中心で down → step(holdF) → up → step(1) |
  touchPoints は `{x, y, id, radiusX:8, radiusY:8, force:1}`。pointer と touch の両イベントが発火する。
- シナリオの書き方：`boot` → `teleport`/`spawn` で状況を作る → タッチまたは `setInput` → `step(n)` → `getState`/`getEvents` で合否。画像で合否を決めない。
- スクリーンショット（`shots.spec.js`）：Mごとに決めた8地点（10 が指定）で `render()` してから撮る。`scripts/contact-sheet.mjs` が Playwright のページの canvas で 422×195 に縮めて4×2に並べ、`tests/artifacts/sheet.png` と白黒版 `sheet_gray.png`（輝度 0.2126R+0.7152G+0.0722B）を作る。AI はこの2枚だけを見る。

### 11.4 verify（所要時間の目安、4vCPU）
| コマンド | 内容 | 目安 |
|---|---|---|
| `verify:fast` | typecheck → 単体テスト（リプレイ含む）→ build | 1.5分以内 |
| `verify` | verify:fast → e2e 全部 → shots と縮小一覧 | 8分以内（上限10分） |
- `scripts/verify.mjs`：`chromium.launch()` を試し（try/catch。`--only-shell` で入れた headless shell は `chromium.executablePath()` の指す本体とは別の場所にあるため、ファイルの有無では判定しない）、起動できなければ verify:fast だけを行い、`E2E SKIPPED: ブラウザなし` と表示して `tests/artifacts/E2E_SKIPPED` を作る（終了コード0）。このとき PROGRESS.md の既知の問題に書き、CI の e2e の結果を `gh api repos/{owner}/{repo}/actions/runs`（REST）で確かめる。
- AI は `npm run verify` を Bash の timeout 600000ms で実行する。10分を超えそうなとき（試験が増えた回・前回8分を超えた回）は、`npm run verify:fast`・`npm run test:e2e`・`npm run shots` を別々の Bash 呼び出し（各 timeout 600000ms）で順に実行してよい（合否は同じ）。

---
## 12. 配信と運用

### 12.1 `.github/workflows/deploy.yml`（全文）
```yaml
name: deploy
on:
  push:
    branches: ['**']            # AI の作業ブランチでも check が走る（PR は AI が作れないため。PR 画面にもこの結果が出る）
  workflow_dispatch:
permissions:
  contents: read
jobs:
  check:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
      - run: npx playwright install --with-deps --only-shell chromium
      - run: npm run test:e2e
  deploy:
    if: github.ref == 'refs/heads/main'
    needs: check
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pages: write
      id-token: write
    concurrency:
      group: pages
      cancel-in-progress: false
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
        env:
          BASE_PATH: /${{ github.event.repository.name }}/
      - uses: actions/configure-pages@v6
      - uses: actions/upload-pages-artifact@v5
        with:
          path: ./dist
      - id: deployment
        uses: actions/deploy-pages@v5
```
- 公開URL：`https://<持ち主>.github.io/<repo>/`。依頼者は最初に1回、Settings → Pages → Source を「GitHub Actions」にする。
- コードは `import.meta.env.BASE_URL` 経由で資源を指す。`'/assets'` のような絶対パスは `literals.test.js` が検出する。
- workflows の push が権限で拒否されたら（拒否されると push 全体が通らない）、`.github/workflows/deploy.yml` を含まない履歴に作り直して push する（例：`git rm --cached .github/workflows/deploy.yml` → `git commit --amend`。複数の commit に含まれるときは `git reset --soft origin/<ブランチ>` 相当でまとめ直す。対話式の rebase は使えない）。同じ内容を `docs/ci/deploy.yml` に置き、依頼者に「GitHub の画面で Add file → Create new file、名前 `.github/workflows/deploy.yml`、`docs/ci/deploy.yml` の中身を貼って Commit」を頼む。

### 12.2 Claude Code on the web の環境設定（依頼者が1回行う）
1. ネットワーク：Custom を選び、既定の許可リストを含めたうえで `cdn.playwright.dev` と `playwright.download.prss.microsoft.com` を足す。
2. 環境変数：`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`
3. setup スクリプト（root で実行。約5分以内に終わればキャッシュされる）：
```bash
#!/bin/bash
# 常世祓：Playwright のブラウザを入れる。失敗しても環境作りは止めない
set -u
export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
mkdir -p "$PLAYWRIGHT_BROWSERS_PATH"
LOG="$PLAYWRIGHT_BROWSERS_PATH/install.log"
if npx -y playwright@1.65.0 install --with-deps --only-shell chromium >"$LOG" 2>&1 \
   || npx -y playwright@1.65.0 install --only-shell chromium >>"$LOG" 2>&1; then
  echo ok > "$PLAYWRIGHT_BROWSERS_PATH/STATUS"
else
  echo failed > "$PLAYWRIGHT_BROWSERS_PATH/STATUS"
fi
chmod -R a+rX "$PLAYWRIGHT_BROWSERS_PATH"
exit 0
```
- セッションの最初に AI が `npm ci` を行う（node_modules が無いとき）。ブラウザが無いときは 11.4 の縮退。

### 12.3 ブランチ・PR・CLAUDE.md・PROGRESS.md
- 1M＝1ブランチ＝1PR。ブランチ名に M を入れる（例 `claude/m2-movement`。セッションの既定ブランチ名しか push できないときはそれを使い、PR 題名を `M2: 移動とカメラ` の形にする）。
- `gh pr create` は使えない（GraphQL が遮断）。AI は push まで行い、PR の題名と説明を PROGRESS.md の「PR本文」と最終メッセージに書く。依頼者が画面の「Create PR」で作る。
- `gh api` の `{owner}/{repo}` の自動置換は、remote がプロキシの URL だと効かないことがある。`git remote get-url origin` の末尾2つ（`…/<owner>/<repo>(.git)`）から作って明示する。公開URLの `<持ち主>` も同じ。
- PR の説明：変更の要約5行以内、`verify` の結果（e2e 未実行ならその旨）、**依頼者が試すこと3行**（URL・操作・見るところ）。
- セッションの終わり方：verify → PROGRESS.md 更新 → commit → push。
- CLAUDE.md（60行以内）：依頼者が docs と一緒に置いた版を使う（コマンド一覧、不変条件11項、進め方の規則、文書の地図）。AI は書き換えない。Mごとに読む文書は 10 の各Mの節を見る。
- PROGRESS.md の書式：
```
# 進捗
## 現在のM：M2 移動とカメラ（ブランチ claude/m2-movement）
## 済み
- [x] 項目（関係するテスト名）
## 次
- [ ] 項目
## 既知の問題
- 内容／再現手順／影響／対処予定
## 依頼者に聞くこと
- 質問（選択肢A/B と AI の推奨）
## PR本文
題名：…
説明：…
依頼者が試すこと：1… 2… 3…
```

---
## 13. 受け入れ基準（M0 の技術面）
1. `npm ci && npm run verify:fast` → 終了コード0、所要90s以内。
2. `npm run verify`（ブラウザあり）→ 終了コード0、所要10分以内、`sheet.png` と `sheet_gray.png` が生成。
3. 2章の検査群 → 全て成功。sim に `Math.random` を1行足すと `forbidden.test.js` が失敗。
4. `package.json` の依存 → 4つ、版は完全一致。
5. `?test=1&seed=1&scene=sandbox` → 1s以内にtickが進まない（`getState().tick` が0のまま）。
6. `step(60)` → `tick` が60（±0）。
7. 同じ種・同じ入力で600tick を2回 → `hash()` が一致。種を2にすると不一致。
8. 1描画で 0.5s の遅れ → 進むtickは5（±0）。
9. hitstopF=14 を worldMul=0.15 の最中に与える → 止まる実tickは14（±0）。
10. 個別0.3×世界0.15 → scale = 0.044921875（±0）。
11. 押下と離しが同じ描画区間（3tick進む）→ 最初のtickだけ pressed、2tick目で released。
12. `ageF`：120ms 前の押下 → 4（上限で切る）。
13. `setInput({stick:[0,1]})` と `step(60)` → sandbox のカプセルが前へ進む（02 が無い M0 では config の仮速度×1s ±2%）。
14. CDP で2本指（スティック＋カメラ）を同時にドラッグし、カメラの指だけ離す → スティックの役割が続く（stick の長さ > 0.5）。
15. `touchCancel` → 全ボタン `down=false`、stick=[0,0]。
16. layout：高さ320px → どの2つの判定円も重ならない。
17. 保存：`v` の無い JSON を置いて起動 → `.bak` に退避され既定値で起動、例外なし。
18. 引き継ぎ文字列：書き出し→読み込み → 元と深い一致。1文字変える → 拒否。
19. e2e：sandbox を起動して300tick → コンソールエラー0件。
20. sandbox → `renderInfo().calls ≤ 110`、`renderer.getPixelRatio() ≤ 1.5`。
21. `visibilitychange`（hidden）を発火 → paused=true、`tokoyo:save` が書かれる。
22. build の成果物を `BASE_PATH=/x/` で作る → index.html の資源のパスが全て `/x/` で始まる。
23. `?debug=1` → 調整パネルが出て、「JSONをコピー」が変更したキーだけを返す。

## 依頼者が実機で確かめること（M0）
1. スマホで公開URLを開き、横向きにすると灰色の床とカプセルが出る。縦向きでは回転の案内が出る。
2. 左の親指でカプセルが動き、右側のドラッグでカメラが回る。2本の指を同時に使える。
3. 「音を出して遊ぶ」を押すと音が鳴る。iPhone はマナーモードのオンとオフの両方で鳴るか。
4. URL の最後に `?debug=1` を付けると FPS が出る。その数字をスクリーンショットで送る。
5. 端から指を滑らせて「戻る」をしても、ゲームが消えずに一時停止になる（Android）。

## coreへの変更提案
> 処理済み（core v0.3）：P1 は不採用（不変条件11「依存4つ」を維持。`three-shim.d.ts` で進める。decisions X5）。P2（＋08 の `Bpm`）・P3・P4 は採用（D61）。
- **P1**：不変条件11の依存に `@types/three@0.187.0`（型定義だけで、実行時のコードは無い）を加える。理由：checkJs で three の使い方の誤りを型で捕まえられ、AI の実装ミスが減る。承認されるまでは `three-shim.d.ts`（three は any 型）で進める。
- **P2**：0章の単位接尾辞に `Mps2`（加速度）・`Hz`・`Db`（音量）・`Count`（個数・回数）を足す。理由：重力・音・上限数に当てはまる接尾辞が無い。本書と 08 はこれを使う。
- **P3**：12章5の「シム（`src/sim`, `src/core`）」に `src/gen`（地形と配置の生成）を加える。理由：同じ生成関数をシムと描画が共用し、決定論の検査対象に入れる必要がある。
- **P4**：12章1に「決定論は同じJSエンジン（Node と Chromium の V8）の中で保証する。iPhone で記録した入力は近似の再現にとどまる」と追記する。理由：`Math.sin` などの最後の桁はエンジンで違うことがあり、完全一致は約束できない。


## 13. 外部素材の取り込み（U8・11_assets）
- 置き場所：元ファイル `assets-raw/{models,textures,concept}/`（配信しない。`.gitignore` には入れない＝履歴に残す）。配信用 `public/assets/{models,tex}/`。
- 目録：`src/data/assets.js`（型 `AssetDef`、11 §4）。起動時と `data/validate` で検証。
- 読み込み：`src/render/assets/loader.js`（`GLTFLoader` と `TextureLoader`。three の `examples/jsm` から import）。タイトルの「遊ぶ」押下の後に全素材を先読みし、進み具合を表示。失敗・欠けは仮の見た目に戻す（警告1回、エラーにしない）。
- 変換：`src/render/assets/toToon.js`（素材を 07 §3.3 のトゥーンへ置き換え、色補正、輪郭の SkinnedMesh を作る）、`src/render/assets/merge.js`（複数メッシュ・素材を1つへ）、`src/render/anim/clipPlayer.js`（クリップの再生・伸縮・混ぜ、`pose` の重ね）。
- 検査：`scripts/assets-check.mjs`（`npm run assets:check`。依存なしで GLB の中身を読む：三角形・骨・クリップ・画像の大きさ・ファイルの大きさ・合計。11 §5 の上限で合否）。`verify:fast` に含める（素材が無ければ何もせず成功）。
- 見本室 `gallery-rigs` は目録の全素材を並べ、素材が無いものは仮の見た目で表示する（どちらかの表示を明記）。
- 描画命令の検査（不変条件9）・品質段階は素材にも同じく適用する。
