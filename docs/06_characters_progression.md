# 06 キャラ・成長（characters_progression）v1.2

> v1.2（第3回統合）：射線距離と敵数を05の確定値に。設定キーの改名（D68）。
> v1.1（第2回統合）：被弾カプセル・kekkaiRangeM を03の値に統一。型の追加は09 v1.1 に取り込み済み。

## この文書でできること
- 3人（＋将来の2人）のキャラデータと能力の「欠け」を、そのままデータに写せる。
- ステージごとの相性（ボス／道中／探索の◎◯△）を計算で出し、キャラ選択と強化の画面を作れる。
- 魂片の入手・保存データ・引き継ぎ文字列・結果画面・死亡時の再開を実装できる。

## 関連文書
00_core（3章・9章）、01_controls_ui（5.5〜5.8 画面の配置と遷移、6.1 設定）、02（キャラ係数 `charMove`・ソフトロック）、03（技表・結界・資源）、04（敵の属性と大きさ）、05（穢石・チェックポイントの配置）、09（`CharacterDef`・`StageDef`・`SaveDataV1` の正本、9章 保存）。

## 0. 前提
- キャラID：`fuma`（楓真）・`shirayuki`（白雪）・`ganjo`（岩丈）・`homura`（焔）・`mio`（澪）。
- 相性の表記は 09 と同じ `'◎'|'◯'|'△'`。
- 数値は `src/data/characters.js`（キャラ）と `src/config/progression.js`（強化・魂片・相性・記録）。移動の係数は 02 の `config/movement.js` の `charMove`、踏み込みは `config/lockon.js` の `charLungeMaxM` が正本で、本書の表は写し。

---
## 1. キャラ定義（CharacterDef）

### 1.1 型（下の追加項目は 09 v1.1 の CharacterDef に取り込み済み。正本は09）
```js
/** 09 の項目：id name element hpMax fuMax kekkaiMax capsule flags{canAirDash,canFlip,canKekkai,canBreakEseki}
 *  softLockRangeM kekkaiRangeM damageTakenMul moveset moves rig weapon affinity upgrades
 * 06 が追加：
 * @property {string} kana        読み
 * @property {boolean} playable   false＝選択画面で「封」
 * @property {string} weaponName  武器名（表示）
 * @property {string} lackText    欠けの説明（表示。なしは「なし」）
 * rangedOnly・moveWhileShooting は 09 の flags の中（flags2 は作らない）
 * @property {number} esekiDamageMul  穢石への打・射の倍率（白雪0.5）
 * @property {number[]} armorComboSteps  怯まない連撃段（岩丈[2,3]、03が使う）
 * @property {number} magatamaStart  開始時の勾玉
 * @property {{'◎':string[], '◯':string[], '△':string[]}} lines  一言。◎・△は[ボス,道中,探索]の順、◯は3種
 */
```
- 09 の `affinity` は data に手書きしない。場面の読込時に `computeAffinity`（2章）の結果と選んだ一言を入れる欄とする（ステージで変わるため）。
- 開始時：HP・札・結界は満タン（強化込み）、勾玉は `magatamaStart`。

### 1.2 値
| 項目 | 楓真 fuma | 白雪 shirayuki | 岩丈 ganjo | 焔 homura（将来） | 澪 mio（将来） |
|---|---|---|---|---|---|
| kana / 属性 | ふうま / wood | しらゆき / metal | がんじょう / earth | ほむら / fire | みお / water |
| 武器 | 長巻 | 和弓 | 大槌 | 双小太刀 | 扇 |
| playable | true | true | true | false | false |
| hpMax | 420 | 360 | 560 | 380 | 380 |
| damageTakenMul | 1.0 | 1.0 | 0.85 | 1.0 | 1.0 |
| fuMax | 8 | 10 | 4 | 8 | 12 |
| kekkaiMax | 3 | 3 | 3 | 0 | 3 |
| canAirDash / canFlip | ○ / × | × / ○ | ○ / × | ○ / × | ○ / × |
| canKekkai / canBreakEseki | ○ / ○ | ○ / ○ | ○ / ○ | × / ○ | ○ / ×（一穴のみ） |
| rangedOnly / moveWhileShooting | × / × | ○ / ○ | × / × | × / × | × / × |
| esekiDamageMul | 1.0 | 0.5 | 1.0 | 1.0 | 1.0 |
| armorComboSteps | [] | [] | [2,3] | [] | [] |
| softLockRangeM | 8 | 20 | 8 | 8 | 12 |
| kekkaiRangeM | 8 | 15 | 8 | 0 | 8 |
| capsule rM / hM | 0.35 / 1.70 | 0.32 / 1.60 | 0.45 / 1.85 | 0.33 / 1.70 | 0.32 / 1.60 |
| runSpeedMul（02） | 1.0 | 1.0 | 0.9 | 1.1 | 0.95 |
| charLungeMaxM（02） | 3.5 | 0 | 3.5 | 3.5 | 2.0 |
| magatamaStart | 0 | 0 | 0 | 0 | 0 |
| upgrades | hp,atk,fu,kekkai | 同左 | 同左 | hp,atk,fu | hp,atk,fu,kekkai |
| lackText | なし | 神通足なし（空中回避は宙返り） | 札が少ない | 結界なし | 穢石は一穴でのみ壊せる |
- 将来の2人は `moveset` に楓真の技を仮に指す（03が作るまで）。選択できないので遊びには出ない。`data/validate` は playable=false の技の不足を警告に留める。
- 勾玉0開始の理由：初回の導入で勾玉3を拾う流れ（r1-GD M1）と揃える。入手規則は03。
- 跳躍の高さ・神通足の距離はキャラで変えない（02 3.5、到達の規則）。

---
## 2. 相性3軸の算出（`src/core/affinity.js`、純関数）
`computeAffinity(charDef, stageDef, enemyDefs, bossDef, cfg) → {boss, road, explore, scores:{boss,road,explore}, line}`。強化は含めない（素の値。相性はキャラの性格を示すため）。

### 2.1 共通の部品
- 勝ち判定 `beats(a,b)`：a が b に相剋で勝てば1、それ以外0（core 7.1：木→土→水→火→金→木）。
- 属性点 `elem(c, x) = beats(c, x) − beats(x, c)`。値は {−1,0,+1}（勝てば与×1.5・被×0.75で+1、負ければ−1）。
- 耐久点 `surv(c) = log2( (hpMax / damageTakenMul) / 420 )`。楓真0、白雪−0.222、岩丈+0.650。

### 2.2 ボス
`boss = 0.8·elem(c, ボス属性) + 0.2·surv(c) − (canKekkai ? 0 : 0.3)`
- ◎：≥0.25、△：<−0.25、他◯。
- 白鷺岬（石凝神＝土）：楓真 0.8（◎）、白雪 −0.044（◯）、岩丈 0.130（◯）。

### 2.3 道中
敵の重み `w`＝小型1、大型3（`EnemyDef.size`）。`StageDef.spawns` を数える。
`road = 0.5·Σ(w·elem(c, 敵属性))/Σw + 0.5·surv(c)`（閾値はボスと同じ）
- 白鷺岬（05 4章で確定）：穢狗（水）8、灯魂（金）5、唐笠（木）7、面鬼（土・大型）2 → Σw=26。
- 楓真：(+6−5)/26 → 0.019（◯）。白雪：(+7)/26 → 0.135−0.111＝0.023（◯）。岩丈：(+8−7)/26 → 0.019＋0.325＝0.344（◎）。
- 成り立つ条件（05への制約）：唐笠の数 ≤ 穢狗の数＋3。

### 2.4 探索
穢石ごとに到達の手段を `StageDef.eseki[].access = {ground:boolean, airDash:boolean, shootFromM:number|null}` で持つ（05が記入。`shootFromM`＝地上の立てる点から視線が通る最短距離）。
- 各穢石の容易さ `e` は、使える手段の最大：
  | 手段 | 条件 | e |
  |---|---|---|
  | ground | 地上から打撃・射撃が届く（canBreakEseki または rangedOnly） | 1.0 |
  | shoot | rangedOnly かつ `shootFromM ≤ softLockRangeM` | 1.0 |
  | airDash | canAirDash かつ canBreakEseki | 0.7（遠回りと落下の危険） |
  | ikketsu | `shootFromM ≤ 20` | 0.5×min(1, fuMax/8) |
- 重み＝初回の魂片（朱3・黄7・蒼12）。`reach = Σ(重み·e)/Σ重み`。
- `explore = reach × runSpeedMul²`（探索は移動時間に支配され、往復で速度差が2乗で効く）。
- ◎：≥0.90、△：<0.68、他◯。
- 白鷺岬（05 5.1で確定）：朱2（地上）・黄1（高所：神通足経路＋地上射線7.2m）・蒼1（高所：神通足経路＋地上射線7.5m）→ 高所の重み割合 s=19/25=0.76。射線はどちらも楓真・岩丈のソフトロック8m以内だが、ikketsu 以外の shoot は rangedOnly（白雪）だけなので結果は変わらない。
  - 楓真：1−0.3×0.76＝0.772（◯）。白雪：1.0（◎）。岩丈：0.772×0.81＝0.625（△）。
- 成り立つ条件（05への制約）：高所（ground=false）の穢石の重み割合が0.6以上。全ての高所の穢石に `shootFromM ≤ 20`（D19）。

### 2.5 結果（白鷺岬）
| キャラ | ボス | 道中 | 探索 |
|---|---|---|---|
| 楓真 | ◎ | ◯ | ◯ |
| 白雪 | ◯ | ◯ | ◎ |
| 岩丈 | ◯ | ◎ | △ |
- `tests/unit/affinity.test.js` が実際の `stages/shirasagi` で上表になることを検査する。崩れたら閾値ではなく05の配置を直す。

---
## 3. キャラ選択画面（配置は01 5.5）

### 3.1 五芒星
- 5点の並びは符の五芒星と同じ（上＝木、時計回りに火・土・金・水）。キャラは自分の属性の点に立つ：楓真＝木、焔＝火、岩丈＝土、白雪＝金、澪＝水。
- 選んだキャラの点が真上に来るよう星全体を回す（0.35s、ease out）。初期選択は前回のキャラ（`lastCharId`、無ければ楓真）。
- 操作：点のタップで選ぶ。はじき（01 2.5 の判定）で +1 なら時計回りに次の点、−1 なら反対。端はない（5点で一周）。
- 封のキャラ（playable=false）：墨の影で表示し、点に朱の「封」。選べる（情報を見る）が、出陣・強化は灰で押せない。一言は「……」。
- 星の中心に選択中のキャラのモデルが立つ（待機の姿勢、07）。

### 3.2 情報欄（上から）
1. 名前（読み）と属性（色の円＋漢字）、武器名
2. HP・札・結界（強化込みの値。強化で増えた分は金色）
3. 欠け：`lackText` と、使えないボタンの灰の絵（神通足・結界）
4. 相性3軸：「ボス◎ 道中◯ 探索◯」（記号は色でなく形で読める大きさ16px以上）
5. 一言（3.3）
6. 強化の段：4項目×4つの点
7. このステージの最高記録（時間・浄化率。未クリアは「—」）
- 画面右上に魂片の所持数（全キャラ共通）。
- 下：「強化」、難易度（01）、導入の切替「導入：あり／なし」（`tutorialDone=true` のときだけ表示、既定なし。偽のときは常にあり）。右下に「出陣」。

### 3.3 一言の選び方
- いずれかの軸が△ → △の一言のうち、最初に△が出た軸（ボス→道中→探索の順）のもの。
- そうでなく◎がある → 最初に◎が出た軸のもの。
- 全て◯ → ◯の3種から `hash32(stageId) mod 3`。
- 白鷺岬では 楓真＝◎ボス、白雪＝◎探索、岩丈＝△探索。

| キャラ | ◎（ボス／道中／探索） | △（ボス／道中／探索） | ◯（3種） |
|---|---|---|---|
| 楓真 | 「岩なら根で割れる。任せろ」／「この道の連中は斬りやすい」／「足場さえあれば、どこへでも」 | 「相手が悪い……だが退かん」／「群れが厄介だ。数を減らす」／「高い所は骨が折れる」 | 「風向きは悪くない」「いつも通りやる」「長巻の届く限り」 |
| 白雪 | 「的が大きい。外しません」／「近づく前に射抜きます」／「見えるなら、届きます」 | 「硬い相手……矢を惜しまず行きます」／「囲まれたら終わり。間合いを保ちます」／「この地形、弓には狭いですね」 | 「静かな風。悪くありません」「一矢ずつ、確かに」「参りましょう」 |
| 岩丈 | 「でかいのは好物だ」／「雑魚は束ねて砕く」／「道がなけりゃ作るまで」 | 「分が悪い。だが殴れば割れる」／「すばしっこいのは苦手だ」／「跳んだり登ったりは性に合わん」 | 「まあ、なんとかなる」「腹は決まった」「槌が鳴りたがってる」 |

### 3.4 遷移
- 「強化」→ 情報欄が強化欄（4章）に入れ替わる（0.2s）。「戻る」で情報欄へ。
- 「出陣」→ `lastCharId` を保存 → loading（01）。
- 左上「戻る」→ 01 の規則。

---
## 4. 強化

### 4.1 項目（各4段、費用は段ごとに 3／6／10／15、1項目34、1キャラ136）
| ID | 名 | 効果 | 最大時 |
|---|---|---|---|
| hp | 体 | 最大HP = round(hpMax×(1+0.08×段)) | ×1.32（楓真554・白雪475・岩丈739） |
| atk | 攻 | 攻撃倍率 ×(1+0.08×段)。core 7.1 の「攻撃倍率」に入り、積の上限×3.0に含まれる | ×1.32 |
| fu | 符 | 札上限 +1／段 | 楓真12・白雪14・岩丈8 |
| kekkai | 結 | 1段・2段：結界の最大+1。3段・4段：1回分の回復 −1s | 結界5・回復6s |
- 結界の上限は強化で5（core 7.4 と一致）。地脈ゲージ100の報酬（ボス戦で結界+1、D25）はこれに加えて最大6まで。
- 跳躍・移動は強化しない（到達の規則、D19）。
- `canKekkai=false` のキャラには kekkai の項目を出さない。

### 4.2 強化欄の操作
1. 4行（名・現在→次の値・段の点・次の費用）。行をタップで選択（朱の枠）。
2. 「強化（魂片N）」ボタンで実行：所持 ≥ N なら所持 −N、段 +1、即保存、金の閃光（07）。足りなければボタンは灰で「あと M」。4段は「極」と表示し押せない。
3. 「振り直し」：確認（はい／いいえ）の後、そのキャラの全段を0にし、費用の合計を全額返す。即保存。理由：試作では取り返しのつかない選択を避け、試し比べを促す。
- 強化はキャラ選択画面でのみ。ステージ中は不可。

---
## 5. 魂片

### 5.1 入手
| 源 | 量 | 条件 |
|---|---|---|
| 穢石 朱／黄／蒼 | 3／7／12 | その穢石IDが `esekiTaken` に無い（初回） |
| 同上（2回目以降） | 1 | `esekiTaken` にある |
| 小型の敵 | 1 | 撃破時に10%（`rng.fork('drops')`） |
| 大型の敵（面鬼） | 2 | 撃破時に100% |
| ボス | 10 ／ 3 | そのステージの初クリア（`clears` に記録なし）／以降 |
- 落とし物は「魂の雫」として出る。0.4s 浮いた後、プレイヤーへ14m/sで飛び、0.6m以内で拾う。拾った tick に `tamakakePickup {amount,total,chain}`（chain＝1.0s以内の連続数、音程用）を出し、09 9章の規則で即保存する。
- 穢石の `esekiTaken` への記録は拾った tick に、魂片の加算と同じ保存で行う（壊した直後に頁が閉じても「記録だけ付いて魂片が無い」状態にしない）。
- 死亡・海・再開・ステージ離脱の時点で飛んでいる雫は、その場で全額を加算する（失わない）。
- 同じ挑戦（後述の run）の中で一度壊した穢石を、記録地点に戻って再び壊したときは魂片0（ゲージは入る）。一度落とし物を判定した敵は、戻って再び倒しても判定しない。理由：死に戻りで稼げないようにする。

### 5.2 白鷺岬の量と強化の比較
前提（05・04で確定）：穢石 朱2・黄1・蒼1、小型20・大型2（`tests/unit/economy.test.js` が data から再計算して表を出力）。
| 周 | 1周で得る（期待値） | 累計 |
|---|---|---|
| 1周目（初クリア） | 穢石25＋小型2＋大型4＋ボス10＝41 | 41 |
| 2周目以降 | 穢石4＋小型2＋大型4＋ボス3＝13 | 41＋13×(n−1) |

| 目標 | 必要 | 到達する周 |
|---|---|---|
| 1キャラの4項目を1段 | 12 | 1周目 |
| 1キャラの4項目を2段 | 36 | 1周目 |
| 1キャラの4項目を3段 | 76 | 4周目（80） |
| 1キャラを全強化 | 136 | 9周目（145） |
| 3人を全強化 | 408 | 30周目（418） |
- 意図：1周で「1人を一通り強くした」と感じ、主に使う1人は10周弱で極まる。強化は無くてもクリアできる難度で04が調整する。

---
## 6. 保存データ（`tokoyo:save`、正本は09の `SaveDataV1`）

### 6.1 形
```js
/** SaveDataV1（09。★の項目も 09 v1.1 に取り込み済み：v1のまま任意項目。無ければ既定値）
 * v:1, updatedAt:number                       platform が付与
 * tamakake:number                             所持魂片（整数 0〜99999）
 * upgrades:{[charId]:{hp,atk,fu,kekkai:number}} 段 0〜4。無いキャラは全0
 * esekiTaken:string[]                         初回満額を受け取った穢石ID（重複なし）
 * tutorialDone:boolean
 * clears:{[`${stageId}/${charId}`]:{count:number, bestTimeS:number, bestPurityPct:number}}
 * retry:RetryV1|null                          記録地点からの再開（8章）
 * settings:Record<string,number|boolean|string>  01 6.1 の表
 * ★lastCharId:string                          既定 'fuma'
 */
/** RetryV1（09 v1.1 の型。kind は 'checkpoint'|'bossGate'）
 * {stageId, charId, kind:'checkpoint'|'bossGate', checkpointId:string,
 *  snap:{gauge:number, gaugeMax:number, magatama:number, timeTicks:number,
 *        killedSpawnIds:string[], brokenEsekiIds:string[], purifiedEikiIds:string[],
 *        runBrokenEsekiIds:string[], runDropRolledSpawnIds:string[],
 *        stats:{kills:number, mikiri:number, maxCombo:number, tamakake:number}}} */
```
- 例：`{"v":1,"updatedAt":0,"tamakake":17,"upgrades":{"fuma":{"hp":1,"atk":1,"fu":0,"kekkai":1}},"esekiTaken":["shirasagi.e01"],"tutorialDone":true,"clears":{"shirasagi/fuma":{"count":1,"bestTimeS":742.35,"bestPurityPct":100}},"retry":null,"settings":{},"lastCharId":"fuma"}`

### 6.2 読込と検証（`core/saveSchema.js`）
1. 09 9章の手順（JSON でない・`v` 無し・`v` が新しい → `tokoyo:save.bak` へ退避し既定値。古い `v` → 移行）。退避したときは選択画面で1回「保存データを読めなかったため、退避して新しく始めました」。
2. 項目ごとの検証（失敗しても全体は捨てない）：数値は整数化して範囲に切る（tamakake 0〜99999、段 0〜4、count ≥0、bestTimeS >0、bestPurityPct 0〜100）。未知のキャラID・穢石IDは残す（将来の版との往復のため）。`retry` は stageId・charId・checkpointId が現在の data に無ければ null。型が違う項目は既定値。
3. 移行：`migrations = {}`（v1が最初）。v→v+1 の純関数を足していく。移行の前に元の文字列を `tokoyo:save.bak` に写す。

### 6.3 書き込み
- 時機は09 9章（魂片を拾った tick、checkpoint、zoneEnter、設定変更、結果、pagehide、hidden）＋本書の強化・振り直し・出陣。
- 失敗（容量など）は09の `saveFailed`。ゲームは続け、次の時機に再び書く。

### 6.4 引き継ぎ文字列
- 形式（09）：`TKY1.` ＋ base64url(UTF-8 の JSON) ＋ `.` ＋ CRC32（16進8桁、小文字）。JSON は保存データ全体（retry・settings を含む。往復で深い一致）。
- 読み込みの検査順と表示：①接頭辞と区切り → 「形式が違います」 ②base64url の復号 → 同 ③CRC32 → 「文字が欠けています」 ④JSON → 「中身が壊れています」 ⑤`v` が現在より新しい → 「新しい版のデータです」 ⑥移行と6.2の検証 → 成功。
- 成功したら要約（魂片・強化した段の合計・クリア数）を出し「上書きしますか？」→ はいで保存して再読込（01 6.1）。

---
## 7. 結果画面（01 5.7 の枠）
| 項目 | 定義 |
|---|---|
| 時間 | この run の実tick（一時停止を除く）÷60。「記録地点から」の再開では死亡時点の時間から続ける（失敗した挑戦の時間も含む）。表示 mm:ss.s |
| 浄化率 | 地脈ゲージのこの run の最大値（0〜100、01の定義） |
| 魂片 | この run で拾った合計（再開を通算） |
| 撃破数 | プレイヤー由来の `kill` の数（ボスを除く） |
| 見切り | `mikiri` の数 |
| 最大連撃 | プレイヤーの攻撃の `hit`（標的ごとに1）で+1、2.0s 命中が無いか `playerHurt` で0。この run の最大 |
| 初クリア | `clears` に無かったら朱印「初」 |
- 記録の更新（`clears[stage/char]`）：count +1。`timeS < bestTimeS`（未記録は常に更新）なら更新し「新」の朱印。`purityPct > bestPurityPct` なら同様（等しいときは更新しない）。2つは独立。
- `stageClear {timeS, purityPct, tamakake}` を受けて表示し、表示の時点で保存。`retry` を null にする。
- ボタン：「キャラ選択へ」（既定）／「もう一度」（同じキャラ・同じ難易度で最初から。導入はなし）。

---
## 8. 死亡時の選択と記録地点
- 選択肢（01 5.8）：①記録地点から（鳥居の後は「ボス前から」）②ステージ最初から ③キャラ選択へ。記録地点を1つも通っていない（開始直後）は①を出さない。
- 記録地点：`StageDef.checkpoints`（05）と、ボスの鳥居（`bossGate`）。通った tick に `snap`（6.1）を作り、`retry` に入れて保存する。鳥居を通った後は鳥居のものだけを残す。
- 一時停止の「記録地点から（鳥居の後は「ボス前から」）」「ステージ最初から」「キャラ選択へ」（01 5.6）も同じ規則。`respawn.reason` は①＝retryCheckpoint（鳥居の後は retryBoss）、②＝restart（09 3.1）。

| 項目 | ①記録地点から | ②ステージ最初から | ③キャラ選択へ |
|---|---|---|---|
| HP・札・結界 | 満タン（強化込み。ゲージ100の結界+1は snap.gaugeMax=100 なら有効） | 満タン | — |
| 勾玉 | max(snap.magatama, 3) | magatamaStart | — |
| 地脈ゲージ・撃破済みの敵・壊した穢石・祓った穢域 | snap の時点に戻す | 初期 | — |
| 龍穴の使用・状態異常（感染・醒） | 初期化 | 初期化 | — |
| 魂片（財布）・esekiTaken・強化 | 保持（拾った分は失わない） | 保持 | 保持 |
| 時間・撃破数・見切り・最大連撃・この run の魂片 | 死亡時点の値で続ける | 0 | 破棄 |
| run の稼ぎ防止の記録（5.1） | 保持 | 0 | 破棄 |
| キャラ・難易度 | 同じ | 同じ | 選び直し |
| retry | そのまま | null | null |
| 導入 | なし | `tutorialDone` が偽ならあり | — |
- ボス戦の再開ではボスの体力・段階・要石は初期に戻る（04）。
- 頁を開き直したとき `retry` があれば 01 の resumeAsk で「続きから」→ ①と同じ復元（時間と統計は snap の値から）。

---
## 9. configキー表（`src/config/progression.js`）
| configキー | 値 | 単位 | 説明 |
|---|---|---|---|
| upgradeLevelMaxCount | 4 | 段 | 各項目の段数 |
| upgradeCosts | [3,6,10,15] | 魂片 | 段ごとの費用 |
| upHpPct / upAtkPct | 8 / 8 | %/段 | 体・攻 |
| upFuPerLvCount | 1 | 枚/段 | 符 |
| upKekkaiMaxLvs | [1,2] | 段 | 結界最大+1になる段 |
| upKekkaiRechargeLvs / upKekkaiRechargeS | [3,4] / 1 | 段 / s | 回復短縮の段と量 |
| kekkaiBossBonusCapCount | 6 | 個 | ゲージ100報酬込みの上限 |
| refundPct | 100 | % | 振り直しの返却 |
| esekiSoulFirst | {shu:3, ki:7, ao:12} | 魂片 | 穢石の初回 |
| esekiSoulRepeatCount | 1 | 魂片 | 2回目以降 |
| dropSmallPct / dropSmallCount | 10 / 1 | % / 魂片 | 小型 |
| dropLargePct / dropLargeCount | 100 / 2 | % / 魂片 | 大型 |
| bossSoulFirstCount / bossSoulRepeatCount | 10 / 3 | 魂片 | ボス |
| soulFloatS / soulFlyMps / soulPickupM / soulChainS | 0.4 / 14 / 0.6 / 1.0 | s / m/s / m / s | 雫 |
| tamakakeMaxCount | 99999 | 魂片 | 所持の上限 |
| affSurvRefHpCount | 420 | HP | 耐久点の基準 |
| affBossElemRatio / affBossSurvRatio / affNoKekkaiPenaltyRatio | 0.8 / 0.2 / 0.3 | — | ボス |
| affRoadElemRatio / affRoadSurvRatio | 0.5 / 0.5 | — | 道中 |
| affEnemyWeight | {small:1, large:3} | — | 敵の重み |
| affGreatMinRatio / affPoorBelowRatio | 0.25 / −0.25 | — | ボス・道中の閾値 |
| affAirDashEaseRatio / affIkketsuEaseRatio / affIkketsuRangeM / affFuRefCount | 0.7 / 0.5 / 20 / 8 | — / — / m / 枚 | 探索の容易さ |
| affExploreSpeedExpCount | 2 | 乗 | 探索の速度項 |
| affExploreGreatMinRatio / affExplorePoorBelowRatio | 0.90 / 0.68 | — | 探索の閾値 |
| comboResetS | 2.0 | s | 最大連撃の途切れ |
| retryMagatamaMinCount | 3 | 個 | 記録地点からの勾玉の下限 |
| selectRotateS / upgradePanelS | 0.35 / 0.2 | s | 画面の動き |

---
## 受け入れ基準（自動テスト）
1. `data/validate`：3人の CharacterDef → 全項目が1.2の表と一致、playable=true、`charMove` と `charLungeMaxM` にIDがある。
2. `computeAffinity`（白鷺岬の実データ）→ 楓真◎◯◯・白雪◯◯◎・岩丈◯◎△。
3. ボス点：楓真0.80±0.01、白雪−0.044±0.01、岩丈0.130±0.01。
4. 仮のステージ（ボス＝木）→ 岩丈のボスが△（−0.67）、白雪が◎。
5. 一言：白鷺岬で楓真「岩なら根で割れる。任せろ」、白雪「見えるなら、届きます」、岩丈「跳んだり登ったりは性に合わん」。
6. 楓真の体を2段 → hpMax 487（420×1.16=487.2→487）。
7. 岩丈の結を4段 → 結界最大5、回復6s。地脈100でボス戦に入る → 6。
8. 魂片2で1段目（費用3）→ 実行できず、所持2のまま。所持3 → 0、段1、`tokoyo:save` の upgrades に反映。
9. 4段の項目 → 強化不可。全強化（136消費）から振り直し → 全段0、所持+136。
10. 新しい保存で朱の穢石を壊して拾う → +3、`esekiTaken` にID、同じtickに保存。次の run で同じ穢石 → +1。
11. 穢石を壊し、雫が飛ぶ途中で海に落ちる → 落ちた tick に全額加算。
12. 記録地点の後で壊した穢石（初回）を、死んで①で戻って再び壊す → 魂片0、ゲージは+10。
13. 小型の敵1000体の撃破（同じ種）→ 落とし物 100±25体。
14. 引き継ぎ：書き出し→読み込み → 深い一致。1文字変える → 「文字が欠けています」で拒否。`v:2` の文字列 → 「新しい版のデータです」。
15. `tamakake:-5, upgrades.fuma.hp:9` の保存 → 読込後 0 と 4、他の項目は保持。
16. JSON でない保存 → `.bak` に元の文字列、既定値で起動、1回だけ通知。
17. 結果：同じキャラで 700s→650s→680s とクリア → bestTimeS 650、count 3、「新」は1回目と2回目のみ。
18. 浄化率：ゲージが100へ達したあと被ダメで何も減らなくても → 100。最大値を記録する。
19. 最大連撃：命中10回（間隔1s）→ 2.1s空ける → 命中3回 → 最大10。命中5回の後に被弾 → 0から。
20. ボス戦で死亡 → ①でHP・札・結界が満タン、勾玉 1→3、7→7、時間は死亡時点から増える。
21. ②を選ぶ → 時間0、ゲージ0、魂片の財布は減らない、retry=null。
22. 鳥居を通った直後に頁を再読込 → resumeAsk が出て、続きからでボス前に立つ。
23. 選択画面ではじき+1を3回 → 楓真→焔→岩丈→白雪。焔で「出陣」が押せない。
24. 白鷺岬の経済（前提の配置）→ 1周目41、2周目以降13（期待値）を `economy.test.js` が出力。

## 依頼者が実機で確かめること
1. キャラ選択で星が回り、3人の違い（相性・欠け・一言）が一目で分かるか。
2. 1周目の魂片で「強くなった」と感じる程度の強化ができるか。振り直しが分かりやすいか。
3. ボスで負けたとき「ボス前から」ですぐ再挑戦でき、待たされないか。
4. 設定の引き継ぎ文字列を別の端末（またはホーム画面版）に貼って、魂片と強化が移るか。
5. 結果画面の「新」の朱印が、記録を更新したときだけ出るか。

## coreへの変更提案
> 処理済み：1〜3 は core v0.3 に採用（D57・D58）。4 は 09 v1.1 に採用（D65）。5 は 01 を修正済み。capsule・kekkaiRangeM は03の値に合わせた（1.2）。
1. **7.4 結界**：「所持3（強化で5、地脈100のボス戦では+1で最大6）」と明記。D25 の+1と強化の上限5の関係を確定させる。
2. **3章 魂片**に追記：ボス撃破で初回10・以降3、小型の敵10%で1・大型で2。記録地点から戻った同じ run では、穢石の魂片と敵の落とし物は二度出ない。
3. **3章／D12**：「ボス前から」を「記録地点から（05のチェックポイント、鳥居の後はボス前）」に一般化（01 5.8 と同じ）。勾玉の最低3は全記録地点に適用。
4. **09への追加**：CharacterDef に 1.1 の追加項目、`affinity` は計算結果の欄、`StageDef.eseki[].access`・`StageDef.bossId`、`SaveDataV1.lastCharId`、`retry` の kind 'checkpoint' と `checkpointId`・`snap`、`config/progression.js` を config 一覧へ。
5. **01への連絡**：選択画面の未実装キャラの表示を「未」から「封」に（依頼の指定）。`tutorialDone` は settings ではなく保存データの最上位（09）。
