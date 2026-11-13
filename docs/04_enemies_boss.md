# 04 敵・ボス（enemies_boss）v1.1

> v1.1（第3回統合、decisions D66〜）：E1〜E3・E5 と `projectileEnd.reason 'cut'` は 09 v1.2 に採用。E4 の `bossMove` イベントと `telegraph.shape` は不採用：ボス技は `telegraph`／`swing` の `moveId`（`boss.<名>`）で、予兆の形は `EnemyAttackDef.marker` を描画側が moveId から引く（D62・D67）。設定キーの改名（接尾辞の規則、D68）。

## この文書でできること
- 4種の敵（穢狗・灯魂・唐笠・面鬼）とボス「石凝神」の能力・全技・予兆を、数値どおりにデータ化できる。
- 敵の共通の状態機械、攻撃権（同時に攻撃してくる数の制限）、帰巣、高台への対応を、手順どおりに実装できる。
- ボス戦の行動の選び方・第2段階・要石・ボス戦カメラ・登場/撃破の演出と、難易度で変わる値がわかる。

**関連文書**：00_core（4・7.5・10章）、decisions（D3・D16〜D18・D20・D21・D27）、02（ボス以外のカメラ・押し合い・海）、03（技の型・ダメージ式・反応・結界・見切り・**想定HP**）、05（敵の配置ID・導入の旗）、06（魂片・記録地点）、07（造形・骨・VFX）、08（予兆音）、**09（型・イベント名の正本）**。

**表記**：f＝その敵の局所フレーム（03 1.2）。実t＝実tick。「予兆」＝予兆開始から判定開始までの局所f（`telegraphF + MoveDef.startupF`）。座標は敵局所（03 2.2：+Z前、+X右、原点は足元）。判定の略記（弧・縦弧・球・筒）は03 2.2と同じ。
config：`src/config/enemies.js`（共通AI・攻撃権・難易度）、`src/config/boss.js`（ボス・ボス戦カメラ）。data：`src/data/enemies.js`、`src/data/boss.js`、`src/data/moves/enemies.js`、`src/data/moves/boss.js`、`src/data/projectiles.js`。

### 03への仮定（03 4.1 の想定HPをそのまま採用。差0%）
| 敵 | HP | 根拠（03 4.6） |
|---|---|---|
| 穢狗 | 32 | 楓真の連撃1巡（27）＋1発 |
| 唐笠 | 36 | 楓真1.3巡、白雪（有利）1巡 |
| 灯魂 | 24 | 楓真（不利×0.75）1.2巡 |
| 面鬼 | 160 | 楓真：結界→2段封破122＋1巡 |
| 石凝神 | 2400 | 4.10の検算で 楓真2.6分・白雪3.5分・岩丈3.1分 |
- 依頼文の「楓真の3段連撃≈100」の仮定は使わない。03が確定させた値（連撃1巡27、DPS19.5）が正。
- 敵からプレイヤーへの威力は、HP420（楓真）が回復手段の乏しい道中（龍穴・浄のみ）で10〜15分もつよう、小型の1発を最大HPの2〜3.5%、大型を5〜8%、ボスを4〜10%にした。

---
## 1. EnemyDef（09 3章の型＋追加）

### 1.1 型（下の追加は 09 v1.2 の `EnemyDef`・`EnemyAttackDef`・`ProjectileDef` に取り込み済み。正本は09。BossDef の `prefDistM`・`hurtParts` も09）
```js
/** EnemyDef の追加（E1）
 * @property {boolean} sealable           結界で封じられるか（全敵 true。将来の「結界無視」の敵用）
 * @property {{viewDeg:number, viewM:number, hearM:number, heightTolM:number}} perception
 * @property {number} runSpeedMps        追う速さ（speedMps は歩き・周回）
 * @property {number} turnDegPs
 * @property {number} pushWeight         02 2.4 の押し重み
 * @property {[number,number]} circleRM 攻撃権待ちの周回半径の範囲
 * @property {number} breakStunS         崩れの長さ（大型・ボス。小型は0）
 * @property {{arcDeg:number, backArcDeg:number, blocks:DmgType[]}|null} guard   09 の guard を拡張
 * @property {{magatamaCount:number, fudaCount:number, soulPct:number, soulCount:number}} drops  値は03・06の写し
 */
/** EnemyAttackDef の追加（E2）
 * @property {number} [aimLockBeforeHitF]   判定開始のこのf前に狙いを固定（既定24＝0.4s）
 * @property {{kind:'none'|'circle'|'fan'|'band'|'pillars', rM?:number, deg?:number, widthM?:number, lenM?:number}} marker  地面の予兆
 * @property {number} [crushBreak]          予兆中に受けた崩しがこれ以上で潰れる（穢を作る技）
 * @property {{rM:number, fwdM:number}} [makesEiki]  完了時に穢域を作る
 * @property {number} [introTelegraphF]     導入の旗が立った個体だけ使う予兆
 */
/** ProjectileDef.area の追加（E3、03 Q4 の area に）
 * @property {number} [durF]  delayF 後の durF f の間、円柱に触れた相手へ各1回だけ当てる（持続する範囲）
 */
```
- `kind`（09）：`normal`＝通常（漢字なし、予兆0.5s）、`heavy`＝強攻撃（撃、0.9s）、`special`＝特殊（穢 1.2s／封 1.0s）。
- `tokenCost`（09）：normal 1、heavy 2、special 2、射撃は kind に関わらず1（2.4）。ボスの技は0。

### 1.2 敵ごとの共通パラメータ（`data/enemies.js`）
| 項目 | 穢狗 inu | 灯魂 tomoshi | 唐笠 karakasa | 面鬼 menoni |
|---|---|---|---|---|
| 属性 | 水 | 金 | 木 | 土 |
| size / ai | small / inu | small / tomoshi | small / karakasa | large / menoni |
| hpMax | 32 | 24 | 36 | 160 |
| capsule rM / hM（03 3.1） | 0.55 / 1.00 | 0.38 / 0.95 | 0.50 / 1.40 | 0.90 / 3.00 |
| flying / hoverM | false / 0 | true / 2.2（撃った後0.8） | false / 0 | false / 0 |
| speedMps / runSpeedMps | 2.5 / 7.0 | 2.4 / 3.2 | 2.8 / 2.8（跳ねる平均） | 1.6 / 1.6 |
| turnDegPs | 540 | 360 | 360 | 120 |
| perception 視野/距離/聴覚/高低差 | 120°/14m/6m/4m | 160°/16m/8m/8m | 140°/12m/6m/4m | 150°/14m/8m/4m |
| aggroRangeM（09、=視野の距離） | 14 | 16 | 12 | 14 |
| leashM（09 `nav.leashM` を使う） | 20 | 20 | 20 | 20 |
| circleRM | 4〜7 | 7〜13（距離を保つ） | 5〜8 | 3.0〜3.5（周回せず待つ） |
| pushWeight | 0.6 | —（押し合わない） | 0.8 | 3.0 |
| breakMax / breakStunS | 0 / 0 | 0 / 0 | 0 / 0 | 60 / 3.0 |
| guard | null | null | null | 正面120°（±60°）・背面120°、blocks [strike, shot] |
| sealable | true | true | true | true |
| gaugeOnKill（core 8章） | 3 | 3 | 3 | 8 |
| drops 勾玉／札（03 8.1・9.3、撃破で直接加算） | 1 / 1 | 1 / 1 | 1 / 1 | 3 / 1 |
| drops 魂片（06 5.1、`rng.fork('drops')`） | 10%で1 | 10%で1 | 10%で1 | 100%で2 |
- 「落とし物」は勾玉・札が撃破の瞬間に直接加算（拾い物なし）、魂片だけが雫として出る（06）。本書は確率の写しを持つだけで、正本は03（勾玉・札）と06（魂片）。
- 浮遊の高さ：灯魂の目標高さ ＝ max(heightAt, seaLevelM, 警戒中ならプレイヤーの足の高さ) ＋ hoverM（現在の値）。高さは1.5m/sで目標へ寄せる。灯魂は格子を使わず直進する（09 7章）。

---
## 2. 共通AI（`sim/enemyAI/common.js`）

### 2.1 状態機械
| 状態 | 入る条件 | 毎tickの処理 | 出る条件 → 次 |
|---|---|---|---|
| idle | 生成時（05の起動条件を満たすまで `dormant`＝知覚0） | 帰巣点で向きを保つ。浮遊は上下0.1m・0.5Hzで揺れる（見た目のみ） | 知覚（2.2）→ alert |
| alert | 知覚・群れの共有・被弾 | プレイヤーへ向く。`alertS` 0.6s（被弾で入った場合は0） | 経過 → approach |
| approach | alert後・攻撃後・怯み明け | 09 7章の操舵で近づく（runSpeedMps）。灯魂は circleRM の内側へ直進 | 距離が circleRM の上限以下 → circle。攻撃権を得た → telegraph（射程外なら射程に入るまで approach を続け、`tokenStartTimeoutS` で返す） |
| circle | 攻撃権なしで間合いに入った | 2.3の周回。プレイヤーを向く | 攻撃権を得て射程内 → telegraph。circleRM上限＋2m より離れた → approach |
| telegraph | 攻撃権を得て射程内（ボスは別） | 2.5の予兆。`aimLockBeforeHitF` までは turnDegPs で向き直る | telegraphF 経過 → attack |
| attack | — | MoveDef を再生（startup→active） | 持続の終わり → recover |
| recover | — | MoveDef の recovery。**recover に入ったtickに攻撃権を返す** | 終わり → approach（攻撃の冷却 cooldownS は attack 開始から） |
| hitstun | 反応（03 5.3）を受けた（大型は armor/superArmor の外のみ） | 03 5.3 の怯み・押し・お手玉 | 怯み終わり → approach。吹・打上 → down |
| down | 吹き飛び・打ち上げの着地 | 03 5.3 のダウン40f → 起き上がり30f（起き上がり中も被弾する） | → approach |
| stagger（崩れ） | 大型・ボスの崩しゲージ満タン、穢の技を潰された | breakStunS の間、行動なし。被ダメ×`kuzushiTakenMul`。結界の対象外（03 7.1）。ガード無効 | 経過 → approach（ゲージ0） |
| sealed | 結界（03 7.3） | 03 7.3 | 解除 → recover 20f → approach |
| threaten | 2.6 の到達不能 | 2.6 | 到達可能に戻る → approach |
| return | 2.7 の帰巣 | 2.7 | 帰巣点の2m以内 → idle |
| dead | HP≤0 | 03 3.2-7 で `kill`、報酬。シムから除く（09 4.3 段9） | — |

**割り込みの優先**（同じtickに複数）：dead ＞ sealed ＞ stagger ＞ down ＞ hitstun ＞ その他。
- 小型：telegraph・attack 中でも反応「小」以上で hitstun へ（予兆は消え、`telegraph` の後始末として地面の印を消す）。攻撃権は返す。
- 大型：telegraph・attack 中は superArmor（反応なし。ダメージ・ヒットストップは受ける）。それ以外の状態では 03 5.3 の大型の欄。
- 見切りの減速（03 6.3）・符の構え（世界0.15）：状態機械はそのまま局所時間で進む。攻撃権は持ち続ける。
- プレイヤーが海に落ちた（02 5章）・死亡：全ての敵の攻撃権を返し、telegraph 中の敵は予兆を取り消して recover 20f。復帰の respawn まで攻撃権を配らない。
- 予兆中にプレイヤーが符の構えに入った：予兆は世界0.15で続く（取り消さない）。

### 2.2 知覚（毎 `perceiveEveryF` 6実t、ID順）
idle の敵は、次のどれかで alert へ：
1. プレイヤーの胸が、敵の正面から視野角の半分以内・視野距離以内で、地形・`projBlock` 形状に遮られない（胸と敵の頭の線分）。高低差が `heightTolM` を超えるとき視野距離は半分。
2. 水平距離が聴覚以内（向き・遮蔽を問わない）。
3. プレイヤーの攻撃（`swing`）・結界・符の発動が `noiseRadiusM` 10m 以内。
4. 同じ群れ（05の `group`）の誰かが alert になった（`alertShareRadiusM` 無制限＝群れ全体）。
5. 被弾した（即 approach、alertS 0）。
- `dormant`（05の起動条件を満たしていない）の敵は1〜5をすべて無視し、被弾もしない（当たり判定から外す）。理由：導入中に先の敵が寄ってこないため。

### 2.3 周回（circle）
- 各敵の希望半径 `r = circleRM[0] + (circleRM[1]−circleRM[0]) × hash01(entityId)`（`core/hash`、0〜1）。
- 移動の目標：プレイヤー中心の半径 r の円上。r±1.0m（`circleBandM`）の外なら半径方向へ歩き（speedMps）、内なら接線方向へ `circleTangentMps` 1.6m/s。向き（右/左）は ID の偶奇（09 7章）で始め、`circleFlipS` 3〜5s（rng 'ai'）ごとに反転。
- 09 の分離（`sepRadiusM`・`sepWeightMul`）を常に足す。面鬼は周回せず、r まで寄って正面を向いて待つ。
- 灯魂：r は 7〜13m。3m以内に寄られたら逃げる（runSpeedMps 3.2で反対方向へ、最大2s）。

### 2.4 攻撃権（`sim/enemyAI/tokens.js`）
**枠**：`tokenPoolCount`（易しい1・普通2・難しい3）。費用：normal 1、heavy 2、special 2、射撃1（kind によらない）。費用が枠数を超えるとき（易しいの heavy）は費用＝枠数として扱う。射撃の同時保持は `tokenShotHoldersMaxCount` 1体まで。ボスは対象外（ボス戦中は他の敵がいない）。
**時計**：攻撃権の時間（配る間隔・冷却・予約）は**世界時間**（世界倍率だけ掛けた時間）で数える。理由：符の構え中に攻撃が溜まって、構えを解いた瞬間に一斉に来るのを防ぐ。

**配る手順**（`tokenEvalEveryF` 6実tごと）：
1. 候補：状態が approach か circle、攻撃権なし、個人の冷却0、生きている、`dormant` でない。各候補の使える技＝冷却0の技のうち、距離が `rangeM` に入るもの。無ければ「射程に入れば使える技」がある敵だけ候補に残す（approach が続く）。
2. 点数 `score = 0.45·(1 − min(d,16)/16) + 0.35·min(waitS,6)/6 + 0.20·onScreen`。d＝水平距離、waitS＝最後に攻撃権を返してからの世界時間、onScreen＝敵の中心がシムのカメラの視錐台の内側なら1。易しいでは onScreen=0 の候補を除く。
3. 点数の降順（同点は ID 昇順）に見る。直前の付与から `tokenGrantGapS` が経っていなければ何もしない。
4. 先頭の費用 ≤ 空き枠 → 付与（技は使える技の中から 2.5 の選び方で決め、費用もその技のもの）。空き枠が足りない → 「予約」：以後 `tokenReserveMaxS` 1.0s は他に配らない。1.0s 過ぎても足りなければ予約を捨て、その敵を今回の候補から外して次を見る。
5. 付与された敵は次のtickに telegraph へ（射程外なら approach を続ける）。付与から `tokenStartTimeoutS` 1.5s 以内に telegraph に入れなければ返す。

**返す時点**：recover に入ったtick、hitstun/down/stagger/sealed/dead/return/threaten に入ったtick、プレイヤーの海落ち・死亡。返したら個人の冷却 `tokenCooldownS`（易2.0・普1.2・難0.8）。

### 2.5 技の選び方と予兆
- 攻撃権を得たとき、使える技（冷却0・射程内）の中から `weight` 比で rng 'ai' により1つ。重みは各技の表の値。
- 予兆の開始tickに `telegraph {actorId, attackInstanceId, moveId, glyph, durF, offscreen, pos}` を出す（09）。`durF` は予兆の総f（telegraphF＋startupF、難易度の倍率後）。地面の印の形は描画側が `moveId` から EnemyAttackDef.marker を引いて描く（イベントに形は載せない）。判定の出始めには `swing {actorId, moveId, …}` を出す（09）。
- 漢字：判定開始の `glyphBeforeHitF` 24f（0.4s）前から表示（07）。通常（glyph null）は出さない。
- 狙いの固定：判定開始の `aimLockBeforeHitF` 前（既定24f）まで向き直り・狙い点の更新を続け、以後は固定。例外は表に記す（唐笠の着地点など）。
- 画面外の予兆：`offscreen` はシムのカメラで判定（02）。01 が自キャラの周りの矢印で示す。
- 難易度：telegraphF に `telegraphMul`（易1.25・普1.0・難0.85）を掛けて丸める。ただし予兆の総fは `telegraphMinF` 27f 以上（漢字の0.4sより短くしない）。startupF は変えない。

### 2.6 高台のプレイヤー（到達不能）
- 判定：敵の升の距離地図（09 7章）が 65535、またはプレイヤーが接地しておらず足の高さが敵の足より `unreachableDyM` 2.2m 以上高い状態が `unreachableS` 1.0s 続いた。
- 近接（穢狗・唐笠・面鬼）→ threaten：帰巣点から leashM 以内の歩ける升のうち、プレイヤーとの水平距離が最小の升へ移動し、プレイヤーを向いて `threatenHowlS` 2.0sごとに吠える（見た目と音のみ）。攻撃権を持たない。ただし面鬼の「穢呼び」は射程が水平距離で満たされれば使ってよい（攻撃権の規則どおり）。
- 灯魂：影響なし（浮遊。プレイヤーの足の高さまで上がる）。
- 解除：距離地図が 65535 でなくなり、かつ高さの条件が外れた最初の評価で approach。

### 2.7 帰巣
- 帰巣点＝05の生成位置。帰巣点からの水平距離が leashM（20m）を超え、かつ telegraph・attack 中でない → return：runSpeedMps で帰巣点へ（09 の格子、到達不能なら直進）。攻撃権なし、知覚なし。
- return 中に被弾し、かつプレイヤーと帰巣点の水平距離が leashM 以内 → hitstun の後 approach（追跡を再開）。それ以外の被弾は怯むだけで帰り続ける。
- 帰巣点に着いて idle になり、`returnRegenDelayS` 5s 被弾しなければ HP を `returnRegenS` 3s で満タンへ線形に戻す。

### 2.8 敵同士の分離・押し合い
- 操舵の分離は09 7章（`sepRadiusM` 1.2・`sepWeightMul` 1.5）。
- 位置の押し出し：敵どうしのカプセルが重なったら、重なりを `pushWeight` の逆比で分ける（面鬼3.0と穢狗0.6 → 穢狗が83%動く）。灯魂は他と押し合わない。1tickの押し出しは最大0.05m。
- プレイヤーとの押し合いは02 2.4（pushWeight はこの表）。

---
## 3. 4種の全技表（`data/moves/enemies.js`）
列：予兆＝telegraphF＋startupF（f）、持＝activeF、硬＝recoveryF、威＝基礎ダメージ（プレイヤーへ。式は03 10章）、反＝プレイヤーの反応（03 5.3：小・中・吹）、停＝ヒットストップ（03 5.1 の式）、権＝tokenCost、冷＝cooldownS、見切り＝残像・無敵で成立するか（`ignoreInvuln` は全て false）。dmgType は打（弾は射）、element は敵の属性。**data の `MoveDef.knockback` には反の列の `rx` だけを書く**（09 の `Rx`：小＝small・中＝mid・吹＝blow・打上＝launch、反応なし＝none。hMps・vMps・kind は読み込み時に03 5.3 から埋める）。技IDは `<敵ID>.<名>`（ボスは `boss.<名>`）。

### 3.1 穢狗（水）— 速い近接、群れ
| ID | 名 | 予兆 | 持 | 硬 | 判定 | 威 | 反 | 停 | 射程m | 権 | 冷s | 重み | 印 | 見切り |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| inu.bite | 噛みつき | 26＋4＝30 | 6 | 34 | 球(0,0.5,1.1) r0.6。前進1.2m/f0–9（startup含む） | 10 | 小 | 9 | 0〜2.4 | 1 | 1.5 | 2 | fan r2.4 60° | 可 |
| inu.lunge | 飛びかかり | 26＋4＝30（導入 38＋4＝42） | 18 | 48 | 筒(0,0.5,0.2)→(0,0.5,1.1) r0.55、持続の全f | 14 | 中 | 11 | 3.0〜7.0 | 1 | 3.0 | 3 | band 幅1.1 長＝跳躍距離＋1.1 | 可 |
- 飛びかかりの跳躍：狙いの固定時に `L = clamp(d − 1.0, 3.0, 7.0)` を決め、持続18fで前進 L（`fwdMps = L×60/18`）、上へ弧0.8m（`upMps` を f0–8 で +、f9–17 で −）。着地は硬直48fの頭。壁に当たったら前進を0にし判定は続ける。
- 噛みつきと飛びかかりのどちらも射程内なら重みで選ぶ。群れの穢狗は付与の間隔（2.4-3）で自然に時間差になる。

### 3.2 灯魂（金）— 浮遊・射撃
| ID | 名 | 予兆 | 持 | 硬 | 判定 | 威 | 反 | 停 | 射程m | 権 | 冷s | 印 | 見切り |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| tomoshi.shot | 穢弾 | 28＋2＝30 | 1 | 90 | 弾 `tomoshiBullet` を f0 に (0,0.45,0.35) から、固定した狙い点（プレイヤーの胸）へ | 8 | 小 | 8（撃った側は止まらない） | 4〜16 | 1（射撃） | 3.0 | none（内側が光る：07） | 可 |

| ProjectileDef | 速度 | 寿命 | 半径 | 誘導 | 重力 | 貫通 | 守で消える | 斬って消せる |
|---|---|---|---|---|---|---|---|---|
| `tomoshiBullet` | 8m/s | 2.0s（16m） | 0.30 | 60°/s を発射から0.5sだけ（03 2.6 の±40°規則） | 0 | なし | 可 | 可 |
- 「斬って消せる」：プレイヤーの打の判定が弾に触れたら弾を消す（`projectileEnd {reason:'cut'}`、09 v1.2。ProjectileDef の `cuttable:true`）。ヒットストップなし、札・ゲージの加算なし。白雪の矢は相殺しない（すり抜ける）。
- 硬直90fの間は hoverM を0.8へ下げ（1.5m/sで沈む）、硬直後に2.2へ戻す。**撃った直後の1.5sが近接で叩ける隙**。高さ2.2のときは楓真の a3（縦弧、高さ4.1まで）・空中技・矢・一穴で当たる。

### 3.3 唐笠（木）— 跳ねて接近、着地の衝撃波
| ID | 名 | 予兆 | 持 | 硬 | 判定 | 威 | 反 | 停 | 射程m | 権 | 冷s | 印 | 見切り |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| karakasa.stomp | 跳び潰し | 10（屈み）＋20（滞空）＝30 | 3 | 50 | g0：着地 球(0,0.4,0) r1.0 威14 反中 ／ g1：場 `karakasaWave`（円柱 r3.0 高0.5、durF 24＝0.4s）威10 反小 | 14／10 | 中／小 | 11／9 | 2.0〜6.0 | 1 | 2.5 | circle r3.0（着地点） | 可（g0・g1とも） |
- 着地点は**予兆開始のtickに**プレイヤーの足元で固定（空中で曲がらないため。2.5の例外）。距離は最大6.0m、超えたら6.0mの点。滞空20fで放物線（頂点2.0m）。着地点が歩けない升なら、自分へ向けて0.5mずつ戻した最初の歩ける升。
- 衝撃波は着地から0.4s続く：その間に高さ0〜0.5mの円柱に触れたら当たる（各相手1回）。**跳躍で足を0.5m以上に保てば避けられる**。ステップの無敵（2〜14f＝13f）では24fを覆えないので、範囲の外へ出る方向に回避するか跳ぶ（r1-GD R7）。
- 移動の跳ね：1回 2.0m・頂点0.8m・滞空20f＋接地8f（平均2.8m/s）。跳ねの最中は向きを変えない。跳ねの着地には判定なし。

### 3.4 面鬼（土・大型）— 正面ガード、強攻撃、穢域を作る大技
| ID | 名 | kind／字 | 予兆 | 持 | 硬 | 判定 | 威 | 反 | 停 | 射程m | 権 | 冷s | 重み | 印 | 見切り |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| menoni.sweep | 薙ぎ払い | normal／— | 24＋6＝30 | 6 | 40 | 弧 y1.0 0.6–3.6 −80→+80 r0.5 | 20 | 中 | 14 | 0〜3.4 | 1 | 2.0 | 3 | fan r3.6 160° | 可 |
| menoni.smash | 面打ち | heavy／撃 | 46＋8＝54 | 4 | 90 | 筒(0,0.5,1.0)→(0,0.5,4.6) r0.8 | 34 | 吹 | 14 | 1.5〜4.8 | 2 | 6.0 | 2 | band 幅1.6 長4.6 | 可 |
| menoni.eiki | 穢呼び | special／穢 | 72＋0＝72 | 1 | 60 | 球(0,0.5,1.5) r3.0（噴き出し） | 12 | 小 | 10 | 0〜10 | 2 | 25 | 2 | circle r5（穢域の範囲） | 可 |
- 3技とも予兆の開始から持続の終わりまで superArmor。
- **穢呼び**：完了（f0）で穢域を作る：中心＝自分の前1.5m（`makesEiki {rM:5, fwdM:1.5}`）、穢核は中心。条件（満たさなければこの技は使える技から外す）：①この面鬼が作った穢域が残っていない ②中心から8m以内に他の穢域の中心がない。作った穢域は「敵が作った穢域」（浄化でゲージ+2、札+2は03の1回規則）。
- **潰し**：穢呼びの予兆中に受けた崩し（breakDmg の合計、2.9の倍率込み）が `crushBreak` 12 以上 → その tick で技を取り消し、崩れ（stagger）3.0s・崩しゲージ0。穢域は作られない。例：楓真の a1＋a2＋a3（13、正面でもこの技の間はガードなし）、岩丈の a1＋a2（12）、白雪は一穴（12）か鳴弦三矢（18）。
- 面打ちの硬直90fの間は面が地面にあり、ガードなし（正面から叩ける隙）。

### 3.5 面鬼の正面ガード
- 判定：被弾の方向角 θ＝面鬼の前方と（攻撃の原点→面鬼）の逆向きの水平角。原点は近接＝攻撃者の位置、弾＝弾の進行方向の逆、場＝場の中心。
  | θ | 扱い |
  |---|---|
  | ≤60°（正面） | `blocks`（打・射）は無効：ダメージ0・反応なし・`guard` イベント（09）・崩しだけ×`guardBlockBreakMul` 0.25。術はガードを抜けて通常どおり |
  | 60°〜120°（側面） | 通常 |
  | >120°（背面） | 通常＋崩し×`guardBackBreakMul` 1.5 |
- 「崩れる」条件（＝ガードが効かない）：①封印中（結界） ②背面からの命中 ③奥義（MoveDef.kind `ougi`）の命中：正面でも通常のダメージ・崩し×`guardOugiBreakMul` 1.5 ④崩れ（stagger）中 ⑤穢呼びの予兆中・面打ちの硬直中。
- 防がれた打撃の攻撃側：通常のヒットストップを半分（切り捨て、最低2f）で止める。ダメージ数字は出さず、`guard` の火花と金属音（07/08）。

### 3.6 崩しゲージ（大型・ボス共通）
- 蓄積：命中ごとに `breakDmg × 倍率`。倍率＝封破×2.0（03 7.4）×ガードの倍率（3.5）×見切り減速中の命中×`mikiriBreakMul` 1.5（攻撃を受けた敵が減速中のとき）×要石（4.4、ボスのみ）。滅は03の値（30）。
- 満タン → stagger（崩れ）：`kuzushi {id, on:true}`、ヒットストップ20（03 5.1）。崩れの間の命中の状態倍率×`kuzushiTakenMul` 1.5（03 10.2 の statusMul）。終わりで `kuzushi {on:false}`、ゲージ0。
- 減衰：最後の蓄積から `breakDecayDelayS` 8s 経つと毎秒 `breakDecayCount` 4 ずつ減る（0で止まる）。
- 崩れ中・封印中・ボスの段階移行中は蓄積しない。

---
## 4. ボス「石凝神」（`data/boss.js`、`sim/boss/ishikori.js`）

### 4.1 BossDef の値
| 項目 | 値 | 説明 |
|---|---|---|
| element / size / ai | earth / large / `ishikori`（09 v1.2 の ai 列挙） | |
| hpMax | 2400 | 03の想定どおり |
| breakMax | 120 | 崩し容量 |
| stunS（崩れ） | 4.0 | 被ダメ×1.5（3.6）、結界無効 |
| breakRecoverS | 8 | 3.6 の減衰までの時間（`breakDecayDelayS` と同値） |
| resealCooldownS | 10 | 03 `kekkaiBossResealS` の写し |
| arenaRM | 17 | 05 の舞台半径 |
| capsule rM / hM | 2.0 / 3.4（足元は床+0.4） | 押し合い（pushWeight ∞）と基本の被弾 |
| flying / speedMps / turnDegPs | true / 2.2 / 75 | 格子を使わず舞台内を直進。中心から11m より外へ出ない |
| prefDistM | 7 | 位置取りの距離 |
| kaname | {count:2, hp:50, breakGainMul:0.5} | 4.4 |
| sealable | true（結界の長さ×0.5＝2.5s、03） | |

**被弾部位**（同じ攻撃が複数部位に触れても1回、03 3.1）：`body` 筒(0,0.4,0)→(0,3.0,0) r2.0／`chest` 球(0,4.6,0.3) r1.5／`head` 球(0,7.0,0) r1.0／`fistL`・`fistR` 球 r0.9（待機時 (∓2.6,2.8,1.0)、叩きつけの持続〜硬直は (∓0.9,0.9,4.0)）。崩れ中は chest・head を y−2.6（岩が沈む）。部位で倍率は変えない。

### 4.2 6技（`data/moves/boss.js`。ボスの技は攻撃権0）
| ID（07の move 名） | 名 | kind／字 | 予兆 | 持 | 硬（第1段階） | 判定・効果 | 威 | 反 | 見切り |
|---|---|---|---|---|---|---|---|---|---|
| boss.slam（slam） | 叩きつけ | heavy／撃 | 50＋4＝54 | 4 | 150（2.5s） | g0 球(0,0.5,4.0) r2.2 ／ f2 に弾 `bossWave` を (0,0.45,5.0) から前方へ | 40／波28 | 吹／吹 | 可 |
| boss.fan（fan） | 穢弾の扇 | normal／— | 28＋2＝30 | 1 | 90（1.5s） | f0 に `bossBullet` ×5 を (0,4.6,1.6) から、固定した狙い点への方向の yaw −24/−12/0/+12/+24° | 18/発 | 中 | 可 |
| boss.eiki（eiki） | 穢域の展開 | special／穢 | 72＋0＝72 | 1 | 132（2.2s） | 完了で穢域 r6（中心＝**予兆開始時**のプレイヤーの足元、穢核は中心）。`crushBreak` 25 | 0 | — | — |
| boss.jibashiri（jibashiri） | 地走り（岩柱） | heavy／撃 | 50＋4＝54 | 28 | 108（1.8s） | 場 `bossPillar` ×6：自分→固定した狙い点の方向に、距離 3.0＋2.6k（k=0〜5、最大16m）、k 本目は持続の f(4k) から8f | 32/本 | 打上 | 可 |
| boss.shiko（shiko） | 四股 | normal／— | 26＋4＝30 | 6 | 120（2.0s） | 場 `bossShikoArea`：自分中心の円柱 r5.0 高1.2、durF 6 | 30 | 吹 | 可 |
| boss.kekkai（kekkai） | プレイヤーへの結界 | special／封 | 60＋0＝60 | 1 | 90（成功時30） | 場 `bossSeal`：円柱 r1.8 高3.0、中心＝**予兆開始時**のプレイヤーの足元。f0 にプレイヤーのカプセルの中心が内側なら被封印（03 7.5：攻撃8回で脱出・4.0sで解除・被ダメ×1.5）。`ignoreInvuln:true`（03 Q3） | 0 | 被封印 | 不可（03） |

| ProjectileDef | 速度 | 寿命 | 半径 | 誘導 | 貫通 | 守で消える | 斬って消せる |
|---|---|---|---|---|---|---|---|
| `bossWave`（地を這う波） | 16m/s | 0.85s（13.6m） | 0.9（中心高0.45＝上端1.35m） | なし | 全員（プレイヤーへ1回） | 不可 | 不可 |
| `bossBullet` | 10m/s | 2.2s | 0.45 | なし | なし | 可 | 可 |
| `bossPillar`（場） | 0 | 8f | 円柱 r1.2 高3.0 | — | — | 不可 | 不可 |
| `bossShikoArea`（場） | 0 | 6f | 円柱 r5.0 高1.2 | — | — | 不可 | 不可 |
| `bossSeal`（場） | 0 | 1f | 円柱 r1.8 高3.0 | — | — | 不可 | 不可 |
- ヒットストップ（プレイヤー被弾）は03の式（例：威40→14）。ボスは射撃・場の命中で止まらない。
- 叩きつけの波と四股は跳躍で越えられる（足が1.35m／1.2m より上）。地走りは横へ避ける。扇は弾の間（12°）に入るか回避。
- 印（07）：slam＝帯（幅2.4・長18）を朱で塗り進める、fan＝淡い扇（±30°・22m）、eiki＝円 r6＋「穢」、jibashiri＝帯（幅2.4・長16）、shiko＝円 r5、kekkai＝プレイヤー足元の十二面体の針金。予兆の見た目と音は `telegraph`（moveId＝`boss.slam` 等）、発動の見た目と音は判定の出始めの `swing`（同じ moveId）で引く（07 8.2・08 3.3）。場・弾だけの技（fan・jibashiri・shiko・kekkai）も、持続の1f目に `swing` を出す。専用のイベントは作らない。
- **穢域の展開の潰し**：予兆の72fの間に受けた崩し（倍率込み）が25以上 → 取り消し、`crushed` 90f（行動なし、被ダメ通常、崩しは蓄積する）。地脈・札の加算なし。
- ボスが作る穢域は同時に2つまで（3つ目の条件を満たす技は選ばない）。浄・穢核（硬さ4点）で祓える（ゲージ+2、札+2は1回、03）。ボス撃破で残りは自動で浄化（加算なし）。
- 被封印に成功したら、次の技は必ず扇（硬直は30fに短縮）。

### 4.3 行動の選び方
**状態**：intro → reposition → (approach) → telegraph → attack → recover → reposition …。割り込み：sealed（03 7.3、予兆・攻撃を取り消す。撃った弾・場は残す）、kuzushi（4.0s、終わりに起き上がり40f）、crushed、transition、defeated。いずれも明けたら reposition。
- reposition：`repositionS`（第1段階0.8s、第2段階0.6s）の間、プレイヤーとの距離を prefDistM 7m へ寄せる（2.2m/s、第2段階2.64m/s）、プレイヤーへ向く。終わりで技を選ぶ。
- 準備移動：四股を選んだのに距離>5.5m → approach（3.0m/s、最大3.0s、4.5m以下で終了）してから予兆。地走りを選んだのに距離<6m → 後退（2.2m/s、最大1.5s）してから予兆。

**第1段階の一巡（固定順）**：叩きつけ → 扇 → 四股 → 地走り → 穢域の展開。以後は重み選択。
**重み選択**（第1段階の一巡後と第2段階すべて）：
1. 基本の重み：slam 30、fan 25、shiko 20、jibashiri 20、eiki 15、kekkai 20（第2段階のみ。第1段階は0）。
2. 距離 d（水平・中心間）の倍率：
   | d | slam | fan | shiko | jibashiri | eiki | kekkai |
   |---|---|---|---|---|---|---|
   | <6m | 1.5 | 0.6 | 3.0 | 0.2 | 1.0 | 1.0 |
   | 6〜11m | 1.5 | 1.2 | 0.3 | 0.8 | 1.0 | 1.0 |
   | ≥11m | 0.3 | 1.5 | 0 | 3.0 | 1.0 | 1.2 |
3. 直前の技×0、2つ前の技×0.5。
4. 冷却中は0（ボス局所、選んだtickから）：shiko 4s、jibashiri 6s、eiki 20s、kekkai 18s、slam・fan 0。eiki はボスの穢域が2つあれば0。
5. 全て0なら fan。そうでなければ rng 'ai' の `float()×合計` を [slam, fan, shiko, jibashiri, eiki, kekkai] の順の累積に当てる。

### 4.4 第2段階と要石
- 移行：HPが1200（50%）以下になった最初のtick。第1段階の間は**HPは1200未満に下がらない**（超過分は捨てる）。崩れ・封印中ならその終わりを待ち、それ以外は予兆・攻撃を取り消して移行。
- 移行の演出 `transitionS` 3.0s：無敵（命中はするがダメージ0・崩し0）、縄が切れる（07）、`bossPhase {phase:2}`。開始のtickに勾玉+2・札+2をプレイヤーへ直接。
- 第2段階：移動・旋回・reposition・硬直を `phase2SpeedMul` 1.2 で速める（硬直は `round(f/1.2)`。例 slam 150→125）。**予兆の長さは変えない**（読みの公平さのため）。kekkai を解禁。
- **要石（kanameishi）2基**：移行の開始で、舞台中心から14mの、鳥居の方向に直交する2点（05の座標）に出現。
  - 六角柱 r0.6 高2.2（被弾：筒 r0.6 0〜2.2）。HP 50、属性なし（五行×1.0）、封印・反応なし、ヒットストップは通常。打・射・術すべて有効。
  - 1基でも残る間、ボスの崩し蓄積×0.5（`breakGainMul`）。
  - 壊れたら `kanameBreak`、勾玉+1。ボスが reposition・recover 中なら recover を30f延ばす（手応え）。
  - ボスの攻撃は要石に当たらない。要石はカメラ・弾を遮らない（camBlock・projBlock false）、プレイヤーと押し合う（円柱 r0.6）。

### 4.5 崩れ（ボス）
- 3.6の規則＋：満タンで stagger 4.0s（chest・head が沈み、近接が胸に届く）、`kuzushi` と同時に**勾玉+2**をプレイヤーへ直接（03 の依頼）。被ダメ×1.5、結界無効。
- 明けたら起き上がり40f（行動なし・被ダメ通常・崩しは蓄積しない）→ reposition。

### 4.6 ボス戦カメラ（02 6.1 の `boss` モードの中身。`sim/camera.js` が04の式を呼ぶ）
```
Fb    = ボス位置 + (0, bossCamFocusYM 3.4, 0)（崩れ中は 1.8）
P     = 自分の足 + (0, 1.5, 0)
pivot = lerp(P, Fb, bossCamFocusLerpRatio 0.30)
d     = 自分とボスの水平距離
dist  = clamp(8.5 + 0.25·max(0, 10 − d), 8.5, 11.0)
pitch = clamp(16 − 1.2·max(0, 10 − d), 4, 16) + 手動の縦ずらし（±20°、入力が2.5s無ければ10°/sで0へ）
yaw   = 注目中：自分→ボスの水平方向（02 8.4 のずらし角を足す）、τ0.15s
        注目なし：手動。ただしボスの Fb がカメラ前方の水平±45°の外に1.5s（実時間）あり、
                  手動入力から1.8s経っていれば、±20°に入るまで 90°/s でボスへ回す
```
- 値の移り変わりは02 6.1 の τ0.25s、障害物は02 6.4（bossRock は camBlock、ボス・要石は対象外で透かす）。
- 検算：d=4m のとき dist10・pitch8.8°で、頭（高7m）は画面の上端から約3.7°内、足は下に余裕。d=8m で dist9・pitch13.6°、頭は上端から約2.8°内。受け入れ基準22で検査する。

### 4.7 登場演出（`event` モード、02 6.1）
1. 条件：地脈50以上で開いた鳥居（05）の面を、プレイヤーが舞台の外から内へ横切った tick。06 の記録（retry）を作り、舞台の外周の壁（05）を閉じる。
2. f0〜60：操作不可・無敵。プレイヤーを舞台中心へ2.5m/sで歩かせ、中心を向けて止める。
3. カメラ（シム側、補間なしで切り替える。操作できない区間なので02の切替禁止の例外）：
   | f | 位置 | 注視 |
   |---|---|---|
   | 0〜90 | 鳥居の外側 5m・高さ2.0m（プレイヤーの背後） | 舞台中心＋(0,4,0)（背後に夕日） |
   | 90〜180 | 中心から鳥居と反対側へ8m・高さ1.0m（あおり） | 中心＋(0,3.5,0)。岩が床から浮き上がり組み上がる（07） |
   | 180〜240 | 中心から鳥居側へ6m・高さ7.0m | 頭＋(0,0,0)。名「石凝神」を縦書きで表示（01） |
4. f240：`bossIntro`、カメラ boss（1.0sで補間）、操作可。ボスは reposition を60f置いて一巡を始める。
5. 省略：初回は f60 以降のタップ・ボタン押下で f240 へ飛ぶ。「ボス前から」の再挑戦（`respawn {reason:'retryBoss'}`）は2〜3を省き、プレイヤーを中心から鳥居側へ15mに置いて f240 から。
- 再挑戦で初期化するもの：ボスのHP・段階・崩し・冷却・一巡の位置・要石（消す）・ボスの穢域（消す、加算なし）・弾と場。

### 4.8 撃破演出
1. HP0の命中：03 の撃破ヒットストップ（hs+3、上限20）。`kill` は出さず、同じtickに defeated へ。
2. f0：ボスの弾・場を全て消す。プレイヤーは無敵（以後被弾しない）。f30：ボスの穢域を浄化（`eikiPurify`、加算なし）。
3. f60：操作不可。カメラ event：舞台中心の周りを半径14m・高さ5mで30°/s回りながら中心＋(0,3,0)を見る。岩が崩れ落ちる（07）。
4. f120：`bossDefeat`（07の波・金箔、08）。f300：`stageClear`（06の結果へ）。

### 4.9 境界と同時発生
- 予兆中に封印：予兆を取り消す（漢字・印も消す）。穢域の展開・結界の固定点は破棄。封印明けは reposition。
- 崩れが攻撃の持続中に起きた：持続を打ち切る（出た弾・場は残る）。
- 被封印中のプレイヤー：ボスは次の技（扇）を通常どおり予兆から出す。扇の予兆中に脱出すれば避けられる。
- プレイヤーの死亡：ボスは reposition のまま停止し、06 の死亡時の選択を待つ。
- 要石を壊した tick に段階移行の条件が重なることはない（要石は第2段階のみ）。
- ボスへの滅（03）：ダメージ24＋崩し30。怯みは無し（ボスの反応は崩れだけ）。

### 4.10 撃破時間の検算（03 4.6 の式を、崩れ・要石・段階移行を入れて0.05s刻みで数値積分）
前提（03の値）：DPS 楓真19.5・白雪16.7・岩丈21.0、稼働率 u 0.40/0.60/0.45（第2段階は×0.85）、崩し/s（攻撃中）楓真9.4・白雪4.7・岩丈13.3、奥義3段×5回（うち封破2回）を戦闘全体に均して加算、溜めと発動17.5s。要石は第2段階の開始直後に2基を壊す（往復8s＋HP50×2÷(DPS×0.6)）。段階移行3s。

| キャラ | 五行 | 崩れの回数 | 撃破時間 |
|---|---|---|---|
| 楓真 | ×1.5（木→土） | 5 | **約2.6分** |
| 白雪 | ×1.0 | 6 | **約3.5分** |
| 岩丈 | ×1.0 | 9 | **約3.1分** |
- 3人とも目標2.5〜3.5分に入る。岩丈は崩しが多く（崩れ9回＝勾玉+18）、「崩して殴る」性格になる。白雪は上限に近いので、崩しは見切り減速中×1.5を足場にする（未算入の短縮要素）。
- `tests/unit/bossTime.test.js` がこの積分を data と config の値で再計算し、表を±0.2分で検査する。

---
## 5. 難易度（`config/enemies.js` の `diff*`。選択は06・01）
| 項目 | 易しい | 普通 | 難しい |
|---|---|---|---|
| 攻撃権の枠 `tokenPoolCount` | 1 | 2 | 3 |
| 付与の間隔 `tokenGrantGapS` | 0.6s | 0.25s | 0.15s |
| 返した後の冷却 `tokenCooldownS` | 2.0s | 1.2s | 0.8s |
| 画面外の敵への付与 | しない | する | する |
| 予兆 `telegraphMul`（下限27f、ボスにも適用） | ×1.25 | ×1.0 | ×0.85 |
| 見切りの残像（03） | 14f | 10f | 8f（03への追加キー `mikiriGhostHardF`） |
| プレイヤーの被ダメ `diffPlayerTakenMul` | ×0.6 | ×1.0 | ×1.25 |
| 敵・ボス・要石のHP `diffEnemyHpMul` | ×0.8 | ×1.0 | ×1.2 |
| ボスの硬直 `diffBossRecoveryMul` | ×1.25 | ×1.0 | ×0.85 |
- 被ダメの倍率は03 10.2 の積（上限×3.0）の外で、最後に掛けてから丸める（`final = max(1, round(…×diffPlayerTakenMul))`）。
- HP倍率は生成時に掛けて丸める。崩し容量は変えない。

---
## 6. configキー表

### `src/config/enemies.js`
| configキー | 値 | 単位 | 説明 |
|---|---|---|---|
| perceiveEveryF | 6 | f | 知覚の評価間隔（実t） |
| alertS | 0.6 | s | 気づいてから動くまで |
| noiseRadiusM | 10 | m | 攻撃・術の音で気づく距離 |
| circleBandM / circleTangentMps / circleFlipS | 1.0 / 1.6 / [3,5] | m / m/s / s | 周回 |
| tomoshiFleeM / tomoshiFleeS | 3 / 2 | m / s | 灯魂の逃げ |
| hoverChangeMps | 1.5 | m/s | 浮遊高さの変化 |
| tokenPoolCount | {easy:1, normal:2, hard:3} | 枠 | 攻撃権 |
| tokenCostNormalCount / tokenCostHeavyCount / tokenCostSpecialCount / tokenCostShotCount | 1 / 2 / 2 / 1 | 枠 | 費用 |
| tokenShotHoldersMaxCount | 1 | 体 | 射撃の同時保持 |
| tokenEvalEveryF | 6 | f | 配る評価（実t） |
| tokenScoreDistRatio / tokenScoreWaitRatio / tokenScoreScreenRatio | 0.45 / 0.35 / 0.20 | — | 点数の重み |
| tokenScoreDistRefM / tokenScoreWaitRefS | 16 / 6 | m / s | 点数の基準 |
| tokenGrantGapS | {easy:0.6, normal:0.25, hard:0.15} | s | 付与の間隔（世界時間） |
| tokenCooldownS | {easy:2.0, normal:1.2, hard:0.8} | s | 返した後（世界時間） |
| tokenReserveMaxS / tokenStartTimeoutS | 1.0 / 1.5 | s | 予約・開始待ち |
| tokenOffscreenAllowed | {easy:false, normal:true, hard:true} | — | 画面外への付与 |
| glyphBeforeHitF / aimLockBeforeHitF | 24 / 24 | f | 漢字・狙いの固定 |
| telegraphMul / telegraphMinF | {easy:1.25, normal:1.0, hard:0.85} / 27 | 倍 / f | 予兆 |
| unreachableDyM / unreachableS / threatenHowlS | 2.2 / 1.0 / 2.0 | m / s / s | 高台 |
| returnRegenDelayS / returnRegenS | 5 / 3 | s | 帰巣後の回復 |
| enemyPushMaxM | 0.05 | m | 1tickの敵同士の押し出し |
| guardFrontDeg / guardBackDeg | 60 / 60 | deg | 面鬼のガード（半角） |
| guardBlockBreakMul / guardBackBreakMul / guardOugiBreakMul | 0.25 / 1.5 / 1.5 | 倍 | ガードと崩し |
| guardAttackerStopMul / guardAttackerStopMinF | 0.5 / 2 | 倍 / f | 防がれた側の停止 |
| mikiriBreakMul | 1.5 | 倍 | 見切り減速中の崩し |
| kuzushiTakenMul | 1.5 | 倍 | 崩れ中の被ダメ |
| breakDecayDelayS / breakDecayCount | 8 / 4 | s / 点/s | 崩しの減衰 |
| menoniCrushBreakCount | 12 | 点 | 穢呼びの潰し |
| enemyEikiMinSepM | 8 | m | 敵が作る穢域どうしの最小距離 |
| introDamageMul | 0.5 | 倍 | 導入の旗の敵の威力 |
| diffPlayerTakenMul / diffEnemyHpMul / diffBossRecoveryMul | {easy:0.6,normal:1,hard:1.25} / {0.8,1,1.2} / {1.25,1,0.85} | 倍 | 難易度 |

### `src/config/boss.js`
| configキー | 値 | 単位 | 説明 |
|---|---|---|---|
| bossRepositionS | [0.8, 0.6] | s | 段階別 |
| bossPrefDistM / bossMaxFromCenterM | 7 / 11 | m | 位置取り |
| bossApproachMps / bossApproachMaxS / bossApproachStopM | 3.0 / 3.0 / 4.5 | m/s / s / m | 四股の前 |
| bossBackoffMps / bossBackoffMaxS / bossBackoffMinM | 2.2 / 1.5 / 6 | m/s / s / m | 地走りの前 |
| bossFixedOrder | ['slam','fan','shiko','jibashiri','eiki'] | — | 第1段階の一巡（この表の技名は技ID `boss.<名>` の `<名>`。以下の bossWeights・bossCooldownS・bossSealForceNext も同じ） |
| bossWeights | {slam:30,fan:25,shiko:20,jibashiri:20,eiki:15,kekkai:20} | — | 基本の重み |
| bossDistBandsM | [6, 11] | m | 距離帯 |
| bossDistMul | 4.3の表 | 倍 | 距離の倍率 |
| bossPrevMul / bossPrev2Mul | 0 / 0.5 | 倍 | 直前・2つ前 |
| bossCooldownS | {shiko:4, jibashiri:6, eiki:20, kekkai:18} | s | 冷却 |
| bossEikiMaxCount / bossEikiRM / bossEikiCoreHpCount | 2 / 6 / 4 | 個 / m / 点 | ボスの穢域 |
| bossEikiCrushBreakCount / bossCrushedF | 25 / 90 | 点 / f | 潰し |
| bossSealForceNext / bossSealSuccessRecoveryF | 'fan' / 30 | — / f | 被封印の後 |
| bossPhase2HpPct / bossTransitionS / phase2SpeedMul | 50 / 3.0 / 1.2 | % / s / 倍 | 第2段階 |
| bossPhase2MagatamaCount / bossPhase2FudaCount | 2 / 2 | 個 / 枚 | 移行の報酬 |
| bossKuzushiMagatamaCount / bossGetupF | 2 / 40 | 個 / f | 崩れ |
| kanameHitExtendF / kanameMagatamaCount | 30 / 1 | f / 個 | 要石 |
| bossCamFocusYM / bossCamFocusKuzushiYM / bossCamFocusLerpRatio | 3.4 / 1.8 / 0.30 | m / m / 倍 | 注視 |
| bossCamDistBaseM / bossCamDistPerM / bossCamDistMaxM / bossCamNearRefM | 8.5 / 0.25 / 11.0 / 10 | m / 倍 / m / m | 距離 |
| bossCamPitchBaseDeg / bossCamPitchPerMDeg / bossCamPitchMinDeg | 16 / 1.2 / 4 | deg | 縦角 |
| bossCamPitchManualMaxDeg / bossCamPitchReturnDegPs / bossCamPitchHoldS | 20 / 10 / 2.5 | deg / deg/s / s | 手動の縦ずらし |
| bossCamYawTauS / bossCamAssistOutDeg / bossCamAssistInDeg / bossCamAssistDelayS / bossCamAssistDegPs | 0.15 / 45 / 20 / 1.5 / 90 | s / deg / deg / s / deg/s | 注目・見失い補助 |
| bossIntroF / bossIntroSkipFromF / bossIntroWalkMps | 240 / 60 / 2.5 | f / f / m/s | 登場 |
| bossRetryStartFromCenterM | 15 | m | 再挑戦の立ち位置 |
| bossDefeatClearF / bossDefeatOrbitRM / bossDefeatOrbitHM / bossDefeatOrbitDegPs | 300 / 14 / 5 / 30 | f / m / m / deg/s | 撃破 |

---
## 7. 受け入れ基準（Node、`__game` または sim 直呼び。難易度は普通、明記なき限り）
1. 各敵を生成 → hpMax が 穢狗32・灯魂24・唐笠36・面鬼160・石凝神2400（±0）。易しい → ×0.8 を丸めた値。
2. 穢狗1体を視野内12mに置く → 6実t以内に alert、alert から36f後に approach。背後10m（聴覚6m外）→ alert にならない。
3. 穢狗4体をプレイヤーの周り5mに置く → 同時に telegraph の敵は2体以下、付与の間隔は15実t以上（10秒間を毎tick検査）。易しい → 1体以下。
4. 面鬼の面打ち（費用2）と穢狗（費用1）が候補、枠2・空き1 → 1.0s の予約の間は穢狗に配られない。予約が切れたら穢狗に配られる。
5. 灯魂2体が射程内 → 同時に攻撃権を持つ灯魂は1体以下。
6. 攻撃権を持つ穢狗を怯ませる → そのtickに枠が1空く。その穢狗は1.2s（世界時間）候補にならない。
7. 符の構え（世界0.15）中の付与の間隔 → 世界時間で0.25s（実tで約100）。
8. 予兆：inu.bite の `telegraph.durF`=30、menoni.smash=54・glyph 'geki'、menoni.eiki=72・'e'、boss.kekkai=60・'fuu'。難しい → bite 27（下限：22＋4＝26→27）、smash 47（39＋8）。
9. 漢字：smash の予兆開始から30f目に表示開始（判定の24f前、±0）。
10. 噛みつきを予兆中に楓真の a1 で叩く → 予兆が取り消され hitstun（14f）、判定は出ない。
11. 面鬼の正面から a1 → ダメージ0・`guard` 1件・崩し0.5。背面から a1 → ダメージ（楓真 6×1.5=9）・崩し3。正面から奥義1段 → ダメージあり。
12. 面鬼を封印 → 正面からの a1 がダメージ（封印×1.5×相剋1.5 → 6×2.25=13.5→14）。
13. 穢呼びの予兆中に崩し12 → 技が取り消され崩れ180f、穢域は増えない。11 → 穢域が r5 で作られる。
14. 崩しゲージ：面鬼に崩し60 → `kuzushi{on:true}`、180f後に on:false・ゲージ0。崩れ中の命中は×1.5。
15. 最後の崩しから8s後、毎秒4ずつ減る（±0.1）。
16. 唐笠の跳び潰し：着地点の中心で静止したプレイヤー → g0 と g1 で2回被弾。着地の10f前に跳躍したプレイヤー → 被弾0。
17. 灯魂の穢弾を楓真の a1 の判定で触る → `projectileEnd{reason:'cut'}`、プレイヤーは無傷。
18. 帰巣：穢狗を帰巣点から21m 引き離す → return に入り、帰巣点に着き、5s後から3sでHP満タン。
19. 高台：高さ3mの台の上（距離地図65535）のプレイヤーに穢狗 → 1.0s後に threaten、攻撃権を持たない。灯魂 → 撃ってくる。
20. ボスの最初の5技の順が slam→fan→shiko→jibashiri→eiki（シード違い3つで同じ）。
21. 重み選択：同じシード・同じ入力で、2回の実行の技の列が一致。直前と同じ技が連続しない（1000回の選択で0件）。d≥11m で shiko が選ばれない。
22. ボス戦カメラ：d=4・8・14m（同じ高さ、注目中）で、ボスの head 球の中心とプレイヤーの足・頭がシムのカメラの視錐台の内側。
23. HPを1201→ダメージ100 → HPは1200で止まり、段階移行、無敵3.0s、要石2基が05の座標に出る。要石が残る間、同じ技の崩しが半分。2基壊すと元に戻る。
24. 崩れ（ボス）の開始で勾玉+2（上限9で切る）。第2段階の移行で勾玉+2・札+2。
25. 第2段階：slam の硬直125f（150/1.2）、予兆は54fのまま。
26. ボスの封：予兆開始時の足元から2m動いたプレイヤー → 被封印にならない。動かない → 被封印、回避中でも被封印（ignoreInvuln）。成功後の次の技は fan。
27. ボスの穢域の展開を3回成功させる → 同時に存在する穢域は2つ以下。
28. 登場演出：初回、f30 のタップ → 無視、f60 のタップ → f240 へ飛ぶ。再挑戦 → 予兆なしで f240 から、ボスはHP満タン・第1段階・一巡の頭。
29. 撃破：HP0 の tick に弾・場が0、300f後に `stageClear` 1件。
30. `bossTime.test.js`：4.10 の表（2.6/3.5/3.1分）を±0.2分で再現。

## 8. 依頼者が実機で確かめること
1. 穢狗の群れに囲まれても「一度に来るのは2匹まで」に感じ、理不尽でないか。
2. 頭上の「撃」「穢」「封」の字を見てから避けるのが間に合うか（普通と易しいの両方で）。
3. 面鬼に正面から斬ると弾かれ、回り込むか結界を張ると通る、という流れが分かるか。
4. 唐笠の着地の衝撃波を「跳んで避ける」のが気持ちよく決まるか。
5. ボス戦で、ボスの全身と自分が画面に収まり、見失わないか。ボスの技を何回か見たら避け方が分かるか。
6. ボス戦が楓真で2分半〜3分、白雪で3分半程度で終わるか（長すぎ・短すぎの感想）。

## 9. coreへの変更提案
> 処理済み（第3回統合）：1〜4 は core v0.4 の7.5・10章に採用（D66）。5 は E1〜E3・E5・`cut` を09に、`mikiriGhostHardF` を03に採用。E4（`bossMove`・`telegraph.shape`）は不採用（D67）。07 8.2・08 3.3 はボス技IDに置き換え済み。
1. **7.5 攻撃権**：「射撃型は1枠」を「射撃は費用1、同時に攻撃権を持てる射撃型は1体まで」と明記。理由：2通りに読めるため。あわせて「攻撃権の時間は世界時間で数える」を追記（符の構え明けの一斉攻撃を防ぐ）。
2. **7.5 予兆**：「予兆＝予兆開始から判定開始まで」「封の予兆1.0s」を明記（表は通常0.5・強0.9・特殊1.2だが、ボスの封は依頼どおり1.0s）。難易度で予兆を伸縮し、下限0.45s（漢字の0.4sより長い）とする。
3. **10章 面鬼**：「正面ガード（結界・背後・奥義・崩しで崩れる）」に「術はガードを抜ける。正面の打・射はダメージ0で崩しだけ×0.25」を追記。
4. **8章 ボス**：「第1段階ではHPは50%未満に下がらない」「崩れごとに勾玉+2（03の依頼）」を追記。
5. **他文書への申し送り**：09へ E1〜E5（EnemyDef の追加項目、EnemyAttackDef の marker 等、ProjectileDef.area.durF、イベント `bossMove`・`telegraph.shape`・`projectileEnd.reason 'cut'`、ai 'ishikori'）。03へ `mikiriGhostHardF` 8 と、03 1.3 例2 の灯魂の弾（8m/s・基礎8）は本書の値と一致。02へ boss モードの式は本書4.6。07へ move 名は 07 8.2 の6つをそのまま使う。
