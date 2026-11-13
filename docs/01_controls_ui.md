# 01 操作・UI（controls_ui）v1.2

> v1.2（第3回統合）：導入の型（7.2）は09 §3 に移した。開発中の試験メニュー（5.1、10 §4.4）。設定キーの改名（D68）。

> v1.1（第2回統合）：InputFrame の定義を 09 に一本化（2.10 は対応表のみ）。`camPx`→`camDeg`、`ougiCancel`→`ougiOut`、`fu.start/newEdges`→`fu.first/edges`、BtnId `chumoku`→`focus`、`uLowHp`→`uInk`。config ファイル名・モジュール名を 09 に合わせた。`tutorialDone` は保存データの最上位。

## この文書でできること
- スマホの横画面に、ボタン・スティック・五芒星・HUD を「どこに・どの大きさで・どう反応するか」まで数値で置ける。
- 指の動きを 1 tick ごとの `InputFrame` に変換する入力層を、推測なしで実装できる。
- メニュー・設定・導入の表示・ブラウザの横取り対策まで、画面まわりを全部作れる。

## 関連文書
- 親：`00_core.md`（5章 操作、4章 時間、12章 不変条件）／理由：`decisions.md`（D1, D2, D10, D11, D28〜D35, D45）
- 値の出典：`reviews/r1_mobile_ux.md`（最終レイアウト）、`reviews/r1_art_audio.md` 7章、`reviews/r1_engineering.md` A6
- 境界：技・符・奥義の効果と時間の値は **03**、カメラの角度計算・注目の選び方は **02**、導入の台本は **05**、キャラ選択の中身・保存形式・結果の中身は **06**、UIの絵の細部は **07**、音は **08**、型とフォルダは **09**

## 0. 用語と座標
- 画面座標：CSS px、原点は `visualViewport` の左上、(x,y) は円の中心。`W,H` = `visualViewport.width/height`。
- 基準端末：844×390、safe-area 左右47・下21・上0（iPhone 12〜15 横）。本書の「(x,y)」は基準端末・右利き・既定設定の値。
- 見た目直径 `diam`／判定直径 `hit`。判定は円（攻撃のみ扇を追加）。
- BtnId（09の型）：`attack | dodge | jump | ougi | kekkai | fu | focus`（focus＝注目。一時停止 `pause` は InputFrame に入らない）。
- Elem（09の型）：`wood | fire | earth | metal | water`。並び番号 木0 火1 土2 金3 水4。

---

## 1. 画面配置

### 1.1 基準点（pivot）
```
insetL/R/B/T = env(safe-area-inset-*) を探針要素で読んだ値
safeL = max(insetL, layoutRefInsetSidePx)      safeR = W − max(insetR, layoutRefInsetSidePx)
safeT = insetT                                  safeB = H − max(insetB, layoutRefInsetBottomPx)
右下pivot = (safeR, safeB)   左下pivot = (safeL, safeB)   右上pivot = (safeR, safeT)
```
- 理由：親指の届く範囲は端末の角で決まる（r1-UX A1）。基準端末と同じ余白の端末では r1 の座標と一致し、余白が大きい端末だけ内側へずれる。
- `100vh` は使わない。`H` は必ず `visualViewport.height`。

### 1.2 ボタンの位置と大きさ
```
中心 cx = pivotX − dx × userScale,  cy = pivotY − dy × userScale
diam = diamBase × deviceScale × min(1.5, max(0.7, userScale × btnScale[id]))
hit  = hitBase  × deviceScale × min(1.5, max(0.7, userScale × btnScale[id]))
deviceScale = clamp(H / layoutRefHeightPx, 0.85, 1.1)   ※位置には掛けない
```
- `userScale` = 設定「ボタンの大きさ」(70〜150%)。位置も pivot を中心に一緒に拡縮（大きくしても重ならないため）。
- `btnScale[id]` と `dx,dy` の個別上書きは配置編集（6.2）で保存した値。無ければ既定値。
- 拡縮後にどれかの見た目円が `y < safeT + hudTopReservePx` または `x < stickZoneRight`（右利き）へはみ出すなら、`userScale` を 0.05 刻みで下げ、収まる最大値を実効値とする。

### 1.3 configキー表（`src/config/layout.js`）
| configキー | 値 | 単位 | 説明 |
|---|---|---|---|
| layoutRefWidthPx | 844 | px | 基準幅（テスト用） |
| layoutRefHeightPx | 390 | px | 基準高 |
| layoutRefInsetSidePx | 47 | px | 左右の最小余白 |
| layoutRefInsetBottomPx | 21 | px | 下の最小余白 |
| layoutDeviceScaleMinMul / MaxMul | 0.85 / 1.1 | 倍 | 端末差の拡縮 |
| layoutMinHeightPx | 320 | px | 重なりなしを保証する最小高 |
| layoutHardMinHeightPx | 280 | px | これ未満は一時停止して案内 |
| hudTopReservePx | 56 | px | 上端の HUD 帯（ボタンを置かない） |
| btnAttackDxPx / DyPx / DiamPx / HitDiamPx | 56 / 52 / 80 / 96 | px | 攻撃 (741,317)。判定は右下の角まで扇 |
| btnDodgeDxPx / DyPx / DiamPx / HitDiamPx | 152 / 73 / 68 / 84 | px | 回避 (645,296) |
| btnJumpDxPx / DyPx / DiamPx / HitDiamPx | 75 / 147 / 60 / 76 | px | 跳躍 (722,222) |
| btnOugiDxPx / DyPx / DiamPx / HitDiamPx | 235 / 59 / 56 / 68 | px | 奥義 (562,310) |
| btnKekkaiDxPx / DyPx / DiamPx / HitDiamPx | 199 / 157 / 56 / 68 | px | 結界 (598,212) |
| btnFuDxPx / DyPx / DiamPx / HitDiamPx | 117 / 221 / 56 / 68 | px | 符 (680,148) |
| btnChumokuDxPx / DyPx / DiamPx / HitDiamPx | 25 / 219 / 48 / 60 | px | 注目 (772,150) |
| btnPauseDxPx / TopPx / DiamPx / HitDiamPx | 21 / 30 / 40 / 48 | px | 一時停止 (776,30)。右上pivot基準・拡縮なし |
| stickZoneLeftPx | 24 | px | 出現範囲の左端（画面端から。iOS の戻るスワイプ避け） |
| stickZoneTopPx | 64 | px | 出現範囲の上端（safeT から） |
| stickZoneRightPct | 40 | % | 出現範囲の右端 = round(W×0.40)。下端は H まで |
| stickDefaultDxPx / DyPx | 83 / 89 | px | 既定位置 (130,280)。左下pivot から右・上へ |
| stickBaseDiamSPx / MPx / LPx | 100 / 120 / 140 | px | 台座の直径（設定 小/中/大、既定 中） |
| stickKnobMul | 0.43 | 倍 | つまみ直径 = 台座×0.43（中で52） |
| stickFollowMul | 1.4 | 倍 | 台座半径×1.4（中で84px）を超えたら原点が追う |
| stickDeadzoneMul | 0.12 | 倍 | 台座半径に対する不感帯 |
| starDxPx / DyPx / RadiusPx | 153 / 143 / 84 | px | 五芒星の中心 (644,226)、外接円半径。拡縮なし |
| layoutEditGridPx | 4 | px | 配置編集のスナップ |
| layoutEditMinGapPx | 4 | px | 見た目円どうしの最小間隔（編集時） |

- 既定配置の検算（基準端末）：見た目の間隔は最小22px（回避–奥義）、判定は全組で重ならない。H=320 でも注目と一時停止の判定は離れる（54 と 54.5）。
- 判定が重なる場合（deviceScale>1、個別編集後）は `距離 ÷ (hit/2)` が最小のボタンに割り当てる。

### 1.4 攻撃の扇
- 点 (x,y) が「x ≥ 攻撃cx かつ y ≥ 攻撃cy」（右利き）なら攻撃の判定内。左利きは「x ≤ cx かつ y ≥ cy」。この象限に他のボタンは無い（配置編集でも置けない：6.2）。

### 1.5 スティック
- 出現範囲（右利き）：x ∈ [stickZoneLeftPx, round(0.4W)]、y ∈ [safeT+64, H]。下の余白に触れた左手も移動の意図なので受ける。
- 方式：
  - **ハイブリッド**（既定）：範囲内に触れた点が原点。指を離すと既定位置に 40%×透明度で待機表示。
  - **固定**：原点は常に既定位置。範囲内のどこに触れてもスティックになり、ベクトルは既定位置から計算。
- 出力：`d = 指 − 原点`、`m = |d| / 台座半径`。`m ≤ 0.12` → (0,0)。それ以外 `m' = min(1,(m−0.12)/0.88)`、`stick = (dx/|d|·m', −dy/|d|·m')`（上が+）。歩き/走りの境目は02。
- 追従：`|d| > 台座半径×1.4` のとき原点を指の方向へ動かし `|d| = 台座半径×1.4` に保つ（ハイブリッドのみ）。
- 表示：台座は safe 矩形内に収まるよう表示位置だけずらす。入力の原点はずらさない（r1-UX B3）。

### 1.6 カメラの空き領域
- スティック範囲でもボタン判定でもない全域。基準端末では x338〜797 のボタン以外と、左上の y<64 の帯。
- 星（五芒星）は構え中のみ存在し、その間はボタンを隠す（3章）。

### 1.7 safe-area・visualViewport への追従
1. 監視するもの：`visualViewport` の `resize`/`scroll`、`window` の `resize`/`orientationchange`、`matchMedia('(orientation: portrait)')` の `change`。
2. どれかが来たら次の `requestAnimationFrame` で1回だけ `computeLayout(viewport, insets, settings)`（純関数）を呼び、ルート要素を `left:offsetLeft; top:offsetTop; width:W; height:H` に置き直し、キャンバスとHUDの位置を更新する。
3. 押下中の指の役割・スティック原点・奥義の押下点はそのまま保持（絶対座標で持つ）。ボタンが動いて指が判定外になっても役割は離すまで変えない。
4. `H < 320`：配置はそのまま計算し、1セッション1回「ツールバーを隠すと遊びやすくなります」を教示領域に3s。`H < 280`：一時停止して「画面の高さが足りません」を表示、`H ≥ 280` に戻れば案内を消す（再開は手動）。

### 1.8 左利き反転
- 反転するもの：全ボタン、攻撃の扇、スティック範囲と既定位置（右下pivot を左下pivot に、x を鏡映）、五芒星の**中心だけ**、字幕領域。
- 反転しないもの：一時停止（右上のまま。左上は HP）、HUD 上段（HP・方位帯・地脈）、教示領域、画面外予兆、**星の点の並び**（木は常に上、火は常に右上。r1-UX A4）。
- 配置編集の保存値は右利き座標で持ち、左利きでは表示時に鏡映する。

---

## 2. 入力層

### 2.1 構成
- `#input`：画面全体を覆う透明の `div` 1枚（z=10）。すべての Pointer Events をここで受ける。HUD（z=20）は `pointer-events:none`、メニュー（z=30）は自分で受ける。メニューが開いている間、入力層は新しい指を無視し、既存の指はすべて「取消扱い」（2.6）で解放する。
- 当たり判定は `computeLayout` の数値で行い、DOM の矩形は使わない（D10）。テストは `__game.layout()` で同じ座標を得る。
- モジュール（名前は09 1.4）：`src/input/layout.js`（computeLayout, hitTest）、`pointerRouter.js`（役割の割当・スティック・2.4〜2.9）、`gestures.js`（タップ・はじき）、`pentagram.js`（純関数 `fuStep`）、`collector.js`（InputFrame の組み立て）、`keyboard.js`、`synthetic.js`（テスト用）。

### 2.2 指の記録
```js
/** @typedef {'stick'|'camera'|'button'|'draw'|'attackDragCamera'|'fuCancel'|'ignored'} PointerRole */
/** @typedef {{id:number, role:PointerRole, btn:BtnId|'pause'|null, disabled:boolean,
 *  downX:number, downY:number, downT:number,      // timeStamp(ms)
 *  x:number, y:number, maxMovePx:number,
 *  ougiState:'charge'|'cancelZone'|null, flickDone:boolean,
 *  originX:number, originY:number }} PointerRec */
```
- 同時に追跡する指は最大4本（`inputMaxPointersCount`）。5本目以降は `ignored`。

### 2.3 pointerdown の割当順序（上から最初に当てはまったもの）
1. 入力層が無効（メニュー表示中・暗転中）→ 記録しない。
2. `layer.setPointerCapture(e.pointerId)` を呼ぶ（以降の move/up はこの層に届く）。
3. **符の構え中**（シムの表示状態 `fuStance` が真）：
   a. 点がスティック範囲内 かつ まだ1画も描いていない → `fuCancel`。
   b. `draw` の指がいない → `draw`。
   c. それ以外 → `ignored`。
4. 一時停止の判定内 → `button(pause)`。
5. `hitTest(x,y)` がボタンを返す → `button(id)`。表示中で使えない（灰色）ボタンなら `disabled=true`（何も出さず、×を150ms揺らす。カメラにはしない）。導入で隠れているボタンは存在しないものとして扱う。
6. スティック範囲内：`stick` の指がいなければ `stick`、いれば `ignored`。
7. それ以外：`camera`/`attackDragCamera` の指がいなければ `camera`、いれば `ignored`。

`hitTest`：表示中のボタンのうち「中心距離 ≤ hit/2」または攻撃の扇に入るものを候補にし、`距離 ÷ (hit/2)` 最小を返す（扇だけで入った攻撃は比 1.0 とする）。

### 2.4 役割ごとの処理
| 役割 | down | move（毎イベント） | up |
|---|---|---|---|
| stick | 原点決定（1.5） | ベクトル更新・追従 | (0,0) |
| camera | 何も出さない | 前回位置との差（px）を度に換算して `camDeg` に加算（09 3章の InputFrame.camDeg の式。感度・反転適用）。はじき判定（2.5） | タップ判定（2.5） |
| button | `pressed`、`down`。押下時刻を記録 | 攻撃：移動≥28px で `attackDragCamera` へ（2.7）。奥義：2.8。他：何もしない | `released`。pause は指が判定内なら一時停止を開く |
| attackDragCamera | — | 差×`attackDragCamMul` を度に換算して `camDeg` に加算 | 何も出さない |
| draw | 3章の純関数に点列を渡す（`getCoalescedEvents()` の全点） | 同左 | 「指が離れた」を通知 |
| fuCancel | — | 移動量を記録 | 0.3s 未満・16px 未満なら `fu.cancel=true` |
| ignored | — | — | — |

- 同じボタンに2本の指：`pressed` は新しい指ごと、`down` は1本でも押していれば真、`released` は最後の指が離れたとき。
- 押下補正：`pressed` には `ageF` を付ける（式は09 5.3：`clamp(round((nowMs − pressTimeMs)/STEP_MS), 0, inputAgeMaxF)`、`pressTimeMs` は `e.timeStamp`。見切りの遡り補正、core 7.3。使い方は03）。

### 2.5 タップでの注目・はじき
- **タップ**（camera の指の up で判定。すべて満たすとき `taps` に up 位置を追加）：
  1. `maxMovePx < 12`
  2. `up.timeStamp − downT < 250ms`
  3. 位置がどのボタンの判定円の縁からも 24px 以上離れている（距離 − hit/2 ≥ 24）
  4. 符の構え中でない
  - 敵の外枠＋20px 以内かの判定はシムが自分のカメラと `viewPx` で行う（D5）。敵がいなければシムは無視する。
- **はじき**：camera の指が down から 180ms 以内に、横に 40px 以上、かつ |dx| ≥ 2|dy| 動いたら、`flick = sign(dx)` を1回出す。1回のドラッグで1回まで（`flickDone`）。出した後、その指のカメラ移動（`camDeg`）は離すまで捨てる（注視ずらしを残さない）。注目中かどうかの意味付けは02。

### 2.6 取消扱い（pointercancel / lostpointercapture / blur / visibilitychange）
| 出来事 | 処理 |
|---|---|
| `pointercancel`・`lostpointercapture`（その指） | stick→(0,0)。camera→タップなし。button→`down=false`・`released=false`（静かな解放）。奥義→そのtickの `ougiOut=true`。draw→「指が離れた」と同じ（猶予0.25sが働く） |
| `window.blur`、`visibilitychange` で hidden、`pagehide` | 全指を上の規則で解放、ステージ中なら一時停止メニューを開く |
| メニューが開いた | 全指を解放。閉じた時点でまだ触れている指は `ignored`（離すまで） |
| 縦向きになった | 全指を解放、一時停止、縦向き案内（5.2） |

### 2.7 攻撃ボタンからのカメラ操作
1. 攻撃の指の down で `attack.pressed`（攻撃は押した時点で出る）。
2. 押下点から 28px 以上離れ、設定「攻撃ボタンでカメラ」がオン、かつ他に camera 系の指がいない → 役割を `attackDragCamera` に変え、`attack.down=false`（`released` は出さない）。変化した位置を基準に差分を取り始める（28px 分は回さない）。
3. 以後は離すまでカメラ。攻撃の再押下にはならない。

### 2.8 奥義の溜め中の指
押下点 P0、現在位置 P、`dist = |P − P0|`。毎 move で次の順に判定：
1. 回避が使える状態で、P が回避の判定円に入った → `ougi.down=false`（released なし）、そのtickの `ougiOut=true`、`dodge.pressed=true`（同じtick）、役割を `button(dodge)` に変更。以後この指を離すと `dodge.released`。シムは同じtickの ougiOut と回避の押下を `ougiCancel{reason:'slide'}` として扱う（03 8.1）。
2. `ougiState='charge'` かつ `dist ≥ ougiOutPx`(72) → `ougiState='cancelZone'`、`ougi.down=false`、`ougiOut=true`（取消域にいる間ずっと真）。表示：灰色の輪と × を P0 に。
3. `ougiState='cancelZone'` かつ `dist ≤ ougiBackPx`(56) → `ougiState='charge'`、`ougiOut=false`、`ougi.pressed=true`、`down=true`。**溜めは0から**（逃げながら溜めを保持できないようにするため）。
4. 指を離した：`charge` なら `ougi.released`（シムが段を判定、0.6s未満は不発で表示「長押し」）。`cancelZone` なら何も出さない（既に取消済み）。
- 被弾による取消（core 7.4）はシム側。指はそのまま `down=true` だが、シムは次の `pressed` まで溜めない。
- 設定「奥義：タップ2回」：1回目のタップで `pressed`・以後 `down=true` を保持（ラッチ）。2回目のタップ（奥義の判定内の新しい down）で `released`。ラッチ中に回避を押す → ラッチを解き、そのtickの `ougiOut=true` と `dodge.pressed`。一時停止でラッチを解き、再開の最初のtickに `ougiOut=true`。72px 規則はこの方式では使わない。

### 2.9 符の構え中の指
- 構えに入った瞬間：既存の button の指はすべて `ignored`（静かな解放、奥義ならそのtickの `ougiOut=true`）。stick の指はそのまま（シムが移動を無視）。camera の指はそのまま（カメラは構え中も動く）。
- 符ボタンを押した指では描けない（その指は `ignored`）。描くのは新しく置いた指（`draw`）。
- `draw` が離れた後、0.25s以内に別の指（または同じ指の再接触）が置かれたら、それが新しい `draw` になり、現在点から続ける（どこに置いてもよい。線は現在点から指へ引き直す）。
- 構えが終わった（発動・取消・時間切れ）瞬間：`draw`・`fuCancel` の指は `ignored` になる（描いていた指がカメラにならない）。

### 2.10 InputFrame
- **型と組み立て規則の正本は 09**（3章の `InputFrame`・`BtnState`、5.3 の `build`）。本書では定義しない。本書の各節が出す値は次の項目に入る：
  | 本書での出来事 | InputFrame の項目 |
  |---|---|
  | スティック（1.5） | `stick` |
  | camera・attackDragCamera の指の移動（2.4） | `camDeg`（px→度は 09 3章の式。基準感度は02の `camYawDegPerPx`/`camPitchDegPerPx`） |
  | カメラ系の指が触れている | `camHeld` |
  | ボタンの押下・離し（2.4） | `btn[id].pressed/released/down/ageF` |
  | 奥義の取消域・滑らせ・静かな解放（2.6・2.8・2.9） | `ougiOut`（取消域の間は真、滑らせ・静かな解放は1tickだけ真） |
  | タップ・はじき（2.5） | `taps`・`flick` |
  | 五芒星（3章） | `fu.touching`・`fu.first`（始点）・`fu.edges`（確定した辺）・`fu.commit`（簡易モード・Enter）・`fu.cancel`（取消タップ・Esc） |
- 同じ描画区間で押して離した短いタップは、最初のtickを `down=true, released=false`、次のtickを `released=true` にする（09 5.3。シムが押下を必ず見る）。
- シムは `fu.edges` を検証し（相剋の辺・未使用・札の数以内）、不正な辺は捨てる。
- キーボード・タッチ・テスト・リプレイは同じ形（core 5）。

### 2.11 configキー表（`src/config/input.js`）
同じファイルの `inputAgeMaxF`(4)・`attackCamSlidePx`(28)・`ougiOutPx`(72)・`ougiBackPx`(56)・`fuStartRadiusPx`(44)・`fuNextRadiusPx`(40)・`fuMagnetRadiusPx`(60)・`fuMagnetDeg`(25)・`keyCamDegPs`(120) は 09 5.4 の表にある（名前はそちらが正本。本書では再定義しない）。
| configキー | 値 | 単位 | 説明 |
|---|---|---|---|
| inputMaxPointersCount | 4 | 本 | 追跡する指の上限 |
| attackDragCamMul | 0.8 | 倍 | 攻撃ドラッグの感度 |
| tapMaxMovePx | 12 | px | タップの移動上限（未満） |
| tapMaxS | 0.25 | s | タップの時間上限（未満） |
| tapBtnClearancePx | 24 | px | ボタン判定の縁からの距離 |
| flickWindowS | 0.18 | s | はじきの時間窓 |
| flickMinPx | 40 | px | はじきの横移動 |
| flickAxisMul | 2.0 | 倍 | 横÷縦の下限 |
| fuCancelTapMaxS / fuCancelTapMovePx | 0.3 / 16 | s / px | 構えの取消タップ |
| kbWalkMul | 0.5 | 倍 | Shift 押下時のスティック量 |
| vibStarCaptureS | 0.010 | s | 振動：点を捕まえた（Android） |
| vibMikiriPatternS | [0.020,0.030,0.020] | s | 振動：見切り |
| vibHurtS / vibFuhaS | 0.030 / 0.040 | s | 振動：被弾／封破 |

### 2.12 キーボード（PCデバッグ、`e.code`、`e.repeat` は無視。キー割当の正本は本表、09 5.3 はこれを参照）
| キー | 動作 |
|---|---|
| W A S D | スティック（斜めは正規化）。Shift で×0.5 |
| 矢印 ←→↑↓ | カメラ（`keyCamDegPs`＝120°/s で `camDeg` を作る） |
| J | 攻撃 |
| K | 回避（奥義の溜め中なら取消して回避） |
| Space | 跳躍（離すと早離し） |
| L（押し続ける） | 奥義。Backspace で取消のみ（そのtickの `ougiOut=true`） |
| U | 結界 |
| I | 符の構え。構え中：1=木 2=火 3=土 4=金 5=水（最初が始点、以後は捕まえられる点のみ有効）、Enter=発動（`fu.commit`）、Esc=取消（`fu.cancel`。描き始める前のみ有効） |
| O | 注目（`focus`） |
| Q / E | はじき −1 / +1 |
| P / Esc | 一時停止（構え中の Esc は取消を優先） |
- マウス左ボタンは1本の指として同じ入力層で扱う（`pointerType` を区別しない）。

---

## 3. 五芒星UI

### 3.1 幾何（`src/input/pentagram.js`、純関数）
```
中心 C = (pivotX − 153, safeB − 143)  ※左利きは左下pivot から (+153, −143)
点k = (Cx + 84·sin(72°·k), Cy − 84·cos(72°·k))   k: 木0 火1 土2 金3 水4
基準端末：木(644,142) 火(724,200) 土(693,294) 金(595,294) 水(564,200)
星の隣（捕まえられる点）：(k+2)%5（kが剋す）と (k+3)%5（kを剋す）
```
- 判定半径：始点 44px、2点目以降 40px。吸着：点まで 60px 以内 かつ 進行方向と点への方向の角度差 ≤ 25°。
- 進行方向 = 現在位置 − 「現在位置から 12px 以上離れた最も新しい標本」。該当なしなら吸着しない。
- 速い指の取りこぼし防止：判定は「前の標本→今の標本の線分」と点の最短距離で行う。吸着は今の標本で評価。

### 3.2 捕捉の手順（標本ごと）
```js
/** @typedef {{first:Elem|null, cur:Elem|null, edges:[Elem,Elem][], used:Set<string>,
 *  samples:{x:number,y:number}[]}} FuDrawState */
/** fuStep(st, sample, geom, cfg, fudaAvail) -> {st, edge:[Elem,Elem]|null, captured:Elem|null}   （署名は09 5.4） */
```
1. `first == null`：線分が5点のどれかの 44px 以内を通れば、最も近い点を `first=cur` にする（吸着なし）。
2. `first != null`：候補 = `cur` の星の隣2点のうち、辺 {cur,候補} が未使用のもの。`edges.length ≥ fudaAvail` なら候補なし（「札が足りない」と表示）。
3. 候補が 40px 判定または吸着に当たれば、辺 [cur,候補] を追加、`used` に登録、`cur=候補`。2点同時なら近い方。
4. 外周の隣の点・使用済みの辺の先・隣でない点は何も起こさない（現在点も移らない）。
- 星は5本の辺の輪なので、1画目の後は進める向きが1つに決まる。5画で始点に戻り、シムが即発動する。
- 時間（構えから最初の接触まで1.5s・描き始めから3.0s・離して0.25s・取消後1sは再構え不可）はシムが実tickで数える（値は03の config）。UIはシムの残り時間を表示するだけ。

### 3.3 表示（構え中のみ、`src/ui/pentagramView.js`）
- ボタン群を 0.12s で透明度0へ（判定も消える）。一時停止ボタンは残す。
- キャンバス2D 1枚（一辺 = 2×(84+60)=288px、DPR は描画の DPR と同じ）を C に置き、構え中だけ毎フレーム描き直す（HUD の「transformのみ」規則の唯一の例外）。
- 描くもの：
  | 要素 | 見た目 |
  |---|---|
  | 5点 | 直径 28 の円、属性色の地＋墨縁2px＋漢字（木火土金水）14px。外に判定円を墨の点線で薄く |
  | 捕まえられる点 | 1.0→1.15倍の脈動（0.5s周期）。補助モードのみ |
  | 案内線 | 現在点→候補点の墨の点線（補助モードのみ） |
  | 描いた辺 | 太さ 8px の墨の筆線（両端を細く）、内側に始点属性色の 2px 線 |
  | 指を追う線 | 現在点→指、太さ 6px の墨（半透明0.7） |
  | 時間の輪 | 半径 84+30 の細い朱の輪が時計回りに燃え尽きる（最初の接触前は1.5s、後は3.0s） |
  | 中央の表示 | 下記 |
- **「いま離すと何が出るか」**（中心に常時）：
  | 状態 | 表示（大 24px／小 12px） |
  |---|---|
  | 未接触 | 大「点に触れる」、小「左側をタップで取消」 |
  | 始点のみ | 大「—」、小「木・0画（出ない）」 |
  | n画（1〜4） | 大 技名（一穴/浄/守/滅）、小「木・n画・札n」 |
  | 5画 | 発動（表示は効果側へ） |
  | 指が離れている（猶予中） | 大の字が 0.25s で朱から墨へ点滅1回、小「離すと発動」 |
  | 札切れ | 小を朱で「札が足りない」 |
- 点を捕まえた瞬間：点が 1.3→1.0倍（80ms）、筆の音（08）、Android は 10ms 振動。

### 3.4 モード（設定「符の描き方」）
| モード | 挙動 |
|---|---|
| 補助（初回の既定） | 3.1〜3.3 すべて。候補の脈動と案内線あり |
| 描く | 候補の脈動と案内線を出さない。判定・吸着は同じ |
| 簡易 | ① 点をタップして始点（属性）を選ぶ。② 0.15s 後、他の4点と始点に数字を出す：始点から相剋の順に n 歩目の点 `(k+2n)%5` に「一〜四」、始点に「五」。③ 数字の点をタップ（判定 44px）すると、`fu.edges` に相剋順の n 本を一度に入れ `fu.commit=true`。線は 0.06s/本で描く演出のみ（シムは即発動）。④ 札が足りない数字は灰色で押せない。⑤ 時間規則は他モードと同じ（選択待ちも3.0sに含む） |

### 3.5 取消
- 描き始める前に、スティック範囲内をタップ（0.3s未満・16px未満）→ `fu.cancel=true`（消費なし、1s 再構え不可はシム）。
- 描き始めた後は取消できない（離せば描いた分が出る。0画なら消費なしで終わる）。
- 一時停止を押すと構えは保持したまま止まる。再開時に指が無ければ猶予0.25sから数え直す。

---

## 4. HUD

### 4.1 DOM の規則
1. HUD は `#hud`（`position:fixed; inset:0; pointer-events:none; z-index:20; contain:strict`）の中に、起動時に全要素を作る。以後、要素の追加・削除をしない（ダメージ数字・矢印は使い回し）。
2. 毎フレームの更新は `style.transform` と `style.opacity` だけ。値が変わらなければ書かない。
3. 文字（残数・距離）は値が変わったときだけ `textContent` を書く。その要素は固定幅（`contain:strict`）。
4. 位置・大きさ（left/top/width/height）は `computeLayout` のときだけ書く。
5. 低HPの墨のにじみ・符の構えの彩度落としは紙墨パス（07）の uniform で描く。全画面の半透明 DOM は置かない。
6. 文字：`"Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif`、太字。文字12px以上、数字14px以上。墨の地（#1b1a1f・不透明度0.75）＋`paint-order:stroke` で墨縁（r1-ART 7章）。

### 4.2 配置（基準端末の座標、括弧は基準）
| 要素 | 位置 | 基準 |
|---|---|---|
| HP | x56〜236, y10〜22 | 左上（safeL+9） |
| 状態表示 | x56〜, y28〜44（16×16 を 4px 間隔） | 左上 |
| 方位帯 | x302〜542, y6〜30 | 中央（W/2±120） |
| ボス名＋HP（ボス戦） | x262〜582, y6〜32 | 中央（W/2±160） |
| 崩し（ボス戦） | x262〜582, y35〜40 | 中央 |
| 地脈ゲージ（掛軸） | x712〜736, y4〜104 | 右上（safeR−85） |
| 地脈の数値 | x640〜708, y6〜24、右寄せ「地脈 62」 | 右上 |
| 一時停止 | (776,30) | 右上 |
| 教示 | x262〜582, y40〜76 | 中央 |
| 見切りの朱印 | 中心 (620,70)、56×56 | 右上（safeR−177） |
| 字幕 | x222〜522, y300〜336（左利き x322〜622） | 下（safeB−69〜−33）。奥義ボタンと重ねない |
| 音の帯（音が止まったとき） | x302〜542, y60〜88 | 中央。これだけ pointer-events:auto |
| ダメージ数字・予兆の矢印 | 3D から投影 | — |

### 4.3 各要素
- **HP**：筆の一画（`clip-path` の多角形で両端を細く）。中身は紙白 #f4ecd8 を `scaleX(hp/hpMax)`（transform-origin 左）。減った分は朱 #e2452b の層が 0.4s 残り、その後 0.3s で追いつく。回復は即時。25%未満で紙墨パスの `uInk` を0.35へ（周辺の墨のにじみ。07 3.7）と心音（08）。28%以上で戻す（08 の `lowHpOnPct/lowHpOffPct`）。イベントではなく描画・音の側が `hp/hpMax` を見て決める（09 3.1）。数値は出さない。
- **状態表示**（並び順固定）：感染「穢」、醒「醒」、守「守」、被封印「封」、天敵の龍穴「弱」、龍穴の回復中「癒」。四角の下辺の棒が残り時間で縮む（scaleX）。
- **ボタン上の残数**（ボタンと一緒に移動・反転）：
  | ボタン | 表示 |
  |---|---|
  | 符 | 右下に「札」＋数字（14px）。0なら灰色で押せない |
  | 奥義 | 外周の上半分に勾玉9個の弧（所持分は墨、残りは輪郭のみ）。溜め中の輪（下記）。届かない段の目盛りは灰色 |
  | 結界 | 外周を上限数（3〜5）の弧に分割（間6°）。使える分は墨、回復中の1つは扇が時計回りに満ちる（8s）。0なら灰色 |
- **ボタンの見た目**：円相（筆で描いた円、右上20°切れ）、地は墨×0.55×透明度設定、漢字20px（攻は24px）。文字：攻（白雪は「射」）、避（空中は「神通」、白雪は「宙」。空中は紙地に墨字へ反転）、跳、奥義、結界、符、注目、一時停止は「‖」。使えない（能力フラグが偽・空中回避を使用済み）は灰 #8a857c＋斜めの墨線。押した瞬間 0.92倍（80ms）。
- **奥義の溜めの輪**：押した瞬間から外周に輪を表示し、2.0s で一周。段の目盛り 0.6/1.2/2.0s。色は1段まで墨、2段で朱、3段で金箔 #f0cf6a。0.6s未満で離したら「長押し」を上に0.8s。取消圏では灰色の輪と × を押下点に、押下点中心の半径72の薄い円を表示。
- **地脈ゲージ**：縦の掛軸（幅24・高さ100、上下に軸棒6px）。中身は下から満ちる（`scaleY`）、色は暗紫 #2a1730→白銀 #dfe6ea のグラデーション。50に鳥居、100に「清」の印。25/50/75/100 に達したら朱印（1.6→1.0倍）。
- **方位帯**：幅240で ±60°（2px/度）。東西南北の漢字と15°ごとの目盛りの帯（360°＋240px の繰り返し）を `translateX(−yaw×2)` で動かす。目標は朱の三角（下向き、12×10）＋下に距離「42m」12px。±60°の外なら帯の端に横向きの三角。目標はシムの値（05の規則）。
- **ボス戦**：鳥居をくぐった瞬間に方位帯を 0.3s の筆のワイプで消し、ボス名（14px）＋HP（y22〜32、幅320）と崩し（y35〜40）を出す。崩れ中は崩しの棒が朱で点滅しない明滅（不透明度0.6〜1.0、0.5s）。撃破または退出で逆の入れ替え。
- **ダメージ数字**：16個の使い回し。明朝の算用数字14px＋墨縁。相克有利は朱で×1.3、不利は灰で×0.8。0.6s で上へ24px、最後の0.2sで消える。位置は命中点の投影＋命中IDから決めたずれ（±8px）。設定でオフ可。プレイヤーの被ダメは出さない。
- **注目の印**：注目中の標的の投影中心（胸の高さ）に、shuInfo #e2452b の円相（筆の円、右上20°切れ、太さ3px、墨縁1px）。直径＝標的の外接球の投影直径＋16px（最小40px）。注目の開始で1.3→1.0倍（120ms）。標的が画面外・カメラの後ろなら出さない。DOM 1要素を transform で動かす。値は `config/ui.js` の `hudLockPadPx`(16)・`hudLockMinPx`(40)・`hudLockStrokePx`(3)・`hudLockFromMul`(1.3)・`hudLockInS`(0.12)。
- **見切りの朱印**：「見切」の朱印、1.6→1.0倍（120ms、少し行き過ぎる緩急）、−4°、0.8s 表示後 0.2s で消える。
- **画面外予兆の矢印**：6個の使い回し。予兆中の敵が画面外（投影が画面から24px以上外、またはカメラの後ろ）なら、自キャラの投影点を中心に半径90の円上、敵の方向に朱 #e2452b の三角（18×14、墨縁）。漢字付きの予兆は三角の外側に漢字12px。角度差15°以内の矢印は1つにまとめる（漢字は強い順 撃>穢>封）。予兆の開始から判定まで表示。
- **字幕・教示**：字幕は2行まで14px、行高18、中央寄せ。教示は1行14px、墨の地。

### 4.4 configキー表（`src/config/ui.js`。09 1.4 の config 一覧で HUD の表は ui.js）
| configキー | 値 | 単位 | 説明 |
|---|---|---|---|
| hudHpLagDelayS / DrainS | 0.4 / 0.3 | s | 朱の残りと追いつき |
| hudHpLowPct | 25 | % | 低HP演出 |
| hudCompassHalfDeg | 60 | deg | 方位帯の片側 |
| hudCompassPxPerDeg | 2 | px | 方位帯の縮尺 |
| hudBossSwapS | 0.3 | s | 入れ替えのワイプ |
| hudDmgNumRisePx / LifeS / FadeS | 24 / 0.6 / 0.2 | px/s/s | ダメージ数字 |
| hudDmgNumAdvMul / DisMul | 1.3 / 0.8 | 倍 | 相克有利/不利の大きさ |
| hudDmgNumPoolCount | 16 | 個 | 使い回し数 |
| hudOffArrowRadiusPx | 90 | px | 予兆の矢印の円 |
| hudOffArrowMarginPx | 24 | px | 画面外判定の余白 |
| hudOffArrowMergeDeg | 15 | deg | まとめる角度 |
| hudOffArrowMaxCount | 6 | 個 | 上限 |
| hudSealFromMul / InS / HoldS / TiltDeg | 1.6 / 0.12 / 0.8 / −4 | 倍/s/s/deg | 朱印 |
| hudBtnPressMul / PressS | 0.92 / 0.08 | 倍/s | 押下の縮み |
| hudOugiLongHintS | 0.8 | s | 「長押し」の表示 |
| hudLockPadPx / hudLockMinPx / hudLockStrokePx | 16 / 40 / 3 | px | 注目の印（4.3） |
| hudLockFromMul / hudLockInS | 1.3 / 0.12 | 倍 / s | 注目の印の出方 |
| hudStickIdleOpacityMul | 0.4 | 倍 | 待機スティック |

---

## 5. 画面遷移

### 5.1 状態機械
| 画面 | 入る条件 | 出る条件 → 行き先 |
|---|---|---|
| boot | 読み込み完了 | 即 → title |
| title | boot、終了確認後 | 音の選択タップ → 続きがあれば resumeAsk、無ければ stageSelect |
| resumeAsk | 保存データの `retry` が null でない（06 8章） | 「続きから」→ loading（その区画）／「はじめから」→ stageSelect |
| stageSelect | title | 解放ステージが1つなら表示せず即 → charSelect。選択 → charSelect、戻る → title |
| charSelect | stageSelect、結果、死亡、一時停止 | 出陣 → loading、戻る → stageSelect（1つなら title） |
| loading | 出陣・再開 | 生成と `renderer.compile` 完了 → play |
| play | loading、pause の続ける | 一時停止・戻る・非表示 → pause、HP0 → death、ボス撃破 → result |
| pause | play | 各項目（5.6） |
| settings | pause、title、charSelect | 閉じる → 元の画面 |
| death | play | 5.8 |
| result | ボス撃破後の演出終了 | 5.7 |
| 縦向き案内（重ね） | 縦向きになった | 横向きに戻った → 元の画面（play なら pause のまま） |
| ホーム追加案内（重ね） | 5.9 | 閉じる → play（一時停止を解く） |

- 開発中の例外（10 §4.4）：`config/debug.js` の `devMenuOn` が真の間（M9b まで）は、title の音の選択タップの後に stageSelect の代わりに試験メニュー `devMenu`（`ui/menus/devMenu.js`）を出す。M9b 以降は上の表どおりで、試験メニューはタイトルの題字を5回タップで開く。M10a で `devMenuOn`=false。

- 画面切替は 0.3s の筆のワイプ。切替中は入力層を無効にする。

### 5.2 縦向き案内
- `matchMedia('(orientation: portrait)')` が真で表示（全画面、紙の地、z=40）。play 中なら pause にする。
- 文言：「横向きにしてください」。iOS（`/iP(hone|ad|od)/` または Mac＋`maxTouchPoints>1`）には「回らないとき：画面の右上から下へなでてコントロールセンターを開き、『画面縦向きのロック』（鍵と丸い矢印）を切ってください」。それ以外は「回らないとき：クイック設定の『自動回転』をオンにしてください」。横向きに回る端末の図（SVG）。
- 疑似横画面（CSS回転）は作らない。理由：座標変換が入力層全体に波及し、利得が小さい。

### 5.3 タイトル
- 中央に題字「常世祓」（明朝太字、かすれは SVG フィルタ、07）。下に2つのボタン（幅220×高48、間24、中心 y = H×0.72）：「音を出して遊ぶ」「音なしで遊ぶ」。右下に小さく「設定」。
- どちらかのタップの処理の中で、同じ操作内に順に：① 音の起動（08 の手順。「音なし」は AudioContext を作るが主音量0） ② Android のみ全画面と向きロック（8.6） ③ Wake Lock（8.5） ④ `navigator.storage.persist()`（8.7） ⑤ 戻る番兵の `pushState`（8.3）。失敗してもすべて握りつぶして先へ進む。
- 「音なし」を選んだら `settings.soundOn=false`。設定から後で変えられる。

### 5.4 ステージ選択
- 横に並ぶ札形のカード（幅180×高240、間24）。白鷺岬のみ選べ、他は墨塗りの「未」。カードに章題・最高浄化率・最短時間。

### 5.5 キャラ選択（中身は06）
- 回転する五芒星：中心 (W/2−100, H/2+10)、半径120。5点にキャラ（未実装の2人は墨の影＋「封」。`CharacterDef.playable=false`、06 3.1）。左右スワイプ（はじき規則と同じ判定）またはキャラをタップで回す（0.35s）。
- 右の情報欄：x = W−safeR側 から幅240、y 64〜H−90。名前・属性（色＋漢字）・相性3軸（ボス／道中／探索 ◎◯△）・一言・欠け（灰色のボタン絵）・「強化」ボタン。
- 右下に「出陣」（直径96、攻撃ボタンと同じ中心）。左上に「戻る」（44×44）。
- 難易度の選択欄（易しい・普通・難しい）を情報欄の下に。初回は「普通」。

### 5.6 一時停止メニュー
- 背景のゲーム画面は静止（描画は止めず、シムだけ止める）。中央の縦並び（幅260×高44、間8）：
  1. 続ける
  2. 設定
  3. 操作の確認（ボタン配置の図に各操作の説明を重ねる）
  4. 記録地点から（記録地点を通った後のみ。鳥居の後は文言を「ボス前から」にする。06 8章）
  5. ステージ最初から
  6. キャラ選択へ
  7. 全画面に戻す（Android で全画面が解除されているときのみ）
- 4〜6 は確認「〜しますか？（はい／いいえ）」。魂片は拾った時点で保存済みなので失わない旨を1行添える。

### 5.7 結果（中身は06）
- 中央の巻物風の枠：時間・魂片・浄化率（地脈の最大値）・初回撃破なら朱印。下に「キャラ選択へ」（既定）「もう一度」。

### 5.8 死亡時
- 0.8s の墨の暗転のあと、中央に「祓い損ねた」と3択（縦並び）：
  1. **記録地点から**（既定、強調表示）。ボス戦中・鳥居通過後は文言を「ボス前から」にする。記録地点の定義は05、復元する内容は06 8章。
  2. ステージ最初から
  3. キャラ選択へ
- 3s 以内の誤タップ防止：表示から 0.5s は押せない。

### 5.9 ホーム画面追加の案内
- 条件：区画①を初めて抜けた直後、`display-mode: standalone/fullscreen` でない、案内済みフラグが偽。表示中はシム停止。
- 文言：「ホーム画面に追加すると、全画面になり『戻る』の誤動作がなくなります。進行は設定の『引き継ぎ文字列』で移せます」。
- iOS：共有ボタン → 「ホーム画面に追加」の2コマの図。Android：`beforeinstallprompt` を保持していれば「追加する」ボタンで `prompt()`。無ければメニューから追加する図。
- 「あとで」で閉じる。どちらでも案内済みフラグを立て、二度と出さない。

---

## 6. 設定

### 6.1 全項目と既定値（`src/config/settings.js`、保存は09 `SaveDataV1.settings`）
| キー | 既定 | 範囲・選択肢 | 説明 |
|---|---|---|---|
| btnLayout | {} | BtnId→{dxPx,dyPx,scalePct} | 配置編集の上書き（6.2） |
| btnScalePct | 100 | 70〜150（5刻み） | ボタン全体の大きさ |
| btnOpacityPct | 80 | 20〜100（10刻み） | ボタンとスティックの透明度 |
| leftHanded | false | — | 左利き反転（1.8） |
| stickMode | 'hybrid' | 'hybrid' / 'fixed' | 1.5 |
| stickSize | 'M' | 'S' / 'M' / 'L' | 100 / 120 / 140px |
| attackDragCam | true | — | 攻撃ボタンでカメラ（2.7） |
| camSensPct | 100 | 50〜200（10刻み） | px→度の換算に掛ける（`camDeg`、09 3章） |
| camInvertY / camInvertX | false / false | — | 反転 |
| camAutoTurn | 'normal' | 'off' / 'weak' / 'normal' | 自動回り込みの強さ（×0 / ×0.5 / ×1、値は02） |
| camFovOffsetDeg | 0 | −5〜+5 | 02 の計算した縦FOVに加える |
| lockPriority | 'nearest' | 'nearest' / 'center' / 'lowHp' | 注目の優先（選び方は02） |
| ougiInput | 'hold' | 'hold' / 'tap2' | 2.8 |
| fuMode | 'assist' | 'assist' / 'draw' / 'simple' | 3.4 |
| shakePct | 100 | 0〜100（10刻み） | 画面揺れ |
| flashInvert | true | — | 封破などの白黒反転（07） |
| damageNumbers | true | — | ダメージ数字 |
| vibration | true | — | 振動。`navigator.vibrate` が無い端末では項目を隠す |
| difficulty | 'normal' | 'easy' / 'normal' / 'hard' | 中身は03/04。いつでも変更可、即時反映 |
| soundOn | タイトルの選択 | — | 音を出す |
| volMasterPct / volSfxPct / volBgmPct / volAmbPct | 100 / 100 / 100 / 100 | 0〜100 | 音量4系統（相対の dB は08） |
| followMuteSwitch | false | — | 消音スイッチに従う（iOS のみ表示。無音ループを止める、08） |
| homePromptShown | false | — | 5.9 |

- `prefers-reduced-motion: reduce` のとき、初回の既定だけ `shakePct=30`、`camAutoTurn='weak'`（r1-UX B4）。
- 変更は即時反映、設定画面を閉じた時点で保存。
- データ欄：「引き継ぎ文字列を書き出す」（`save.exportString()` の結果を読み取り専用の欄に出し、「写す」で `navigator.clipboard.writeText`。失敗時は欄を全選択）、「読み込む」（貼り付け欄 → `save.importString(s)` の検証 → 失敗なら理由を朱で、成功なら「上書きしますか？」→ 再読み込み）、「設定を初期化」「配置を初期化」、保存の保護の状態（`persisted()` の結果を「あり／なし」で表示）。文字列の形式は06/09。

### 6.2 ボタン配置の編集
1. 一時停止中の戦闘画面の上で開く。全ボタンを表示し、判定円を点線で重ねる。
2. ボタンをドラッグで移動（4px にスナップ）。選んだボタンに個別の大きさ 70〜150% のつまみ。
3. 制約：見た目円が safe 矩形内、上端は `safeT+56` より下、スティック範囲の右端より右（右利き）、攻撃の扇の象限に他のボタンの中心を置かない、見た目円どうしの間隔 ≥ 4px。破った円は朱の輪になり「保存」が押せない。
4. 「保存」「やめる」「初期化（既定配置に戻す）」。保存値は右利き座標・基準 px（deviceScale を掛ける前）。

---

## 7. 導入（チュートリアル）のUI側

### 7.1 方針
- 進行の判定と時間の操作は**シム側**（`stageLogic` が `src/data/tutorial.js` の台本を実行）。リプレイの再現性を守るため。台本の中身は05。
- UI は、シムが出す出来事を受けて表示するだけ。

### 7.2 データの形
- 型 `TutorialStep`・`HighlightTarget`・`HandHint` の正本は 09 3章（05 の追加 `startWhen`・`onStart`・`waitFor` の `standOn`/`near` を含む）。world の強調はステージ物の文字列ID（`ref`）で指す。台本の中身は05 7章。
- シムの出来事：`tutorialStep {step}`（導入の終わりは `step:'done'`。09 3.1）。`unlockedBtns: Set<BtnId>` はシムの状態（隠れたボタンの入力はシムも無視）。

### 7.3 UI の API（`src/ui/tutorialView.js`）
| 関数 | 動作 |
|---|---|
| `tutorial.show(stepId)` | 台本から step を引き、教示領域に `text`、`highlight` と `hand` を表示。前の表示は 0.15s で消す |
| `tutorial.hide()` | 教示・光・手をすべて消す |
| `tutorial.setVisibleButtons(ids)` | 指定以外のボタンを非表示（判定も無効）。新しく増えたボタンは 0.4s の墨のワイプで現れ、光の輪を 2 回脈打たせる |
| `tutorial.highlight(target)` | 対象に朱の二重輪（1.0→1.2倍、0.8s周期）。world は投影点に追従 |
| `tutorial.hand(hint)` | 半透明の指（直径36の紙色の円＋墨縁）が動きを見せる：tap=0.8s周期で押す／hold=押して輪が満ちる（holdS）／drag=pathPx を 1.0s でなぞる／flick=0.18s で横へ払う／starPath=星の点を順にたどる。2回見せたら 1.5s 休んで繰り返す |
| `tutorial.isActive()` | 表示中か |
- `waitFor` を満たすまでシムは次の step を出さない（「操作するまで進まない」）。手の見本はプレイヤーが最初に触れた時点で止める（邪魔をしない）。
- 初回の導入中はボタンが段階的に増える（順番は05、r1-UX B7 が目安）。導入を終えるか省略したら全ボタンを出す。

### 7.4 2回目以降
- 保存データ最上位の `tutorialDone`（09 `SaveDataV1`。settings の中ではない）が真なら、キャラ選択画面に「導入：あり／なし」の切替（既定なし）を出す（06 3.2）。ステージ開始時には何も聞かない。偽なら常に導入あり。

---

## 8. ブラウザ対策（`src/platform/guards.js`。09 1.4）

### 8.1 HTML・CSS
```html
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="theme-color" content="#1b1a1f">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="manifest" href="manifest.webmanifest">  <!-- display:"fullscreen", orientation:"landscape" -->
```
```css
html,body{margin:0;width:100%;height:100%;overflow:hidden;overscroll-behavior:none;background:#1b1a1f}
body{position:fixed;inset:0;touch-action:none;user-select:none;-webkit-user-select:none;
  -webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;-webkit-text-size-adjust:100%}
#root{position:fixed;left:0;top:0}           /* 大きさは visualViewport から JS で */
#input,canvas{touch-action:none}
#hud{pointer-events:none}
input,textarea{user-select:text;-webkit-user-select:text}   /* 引き継ぎ欄だけ選択可 */
.safe-probe{position:fixed;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)}
```

### 8.2 イベントの抑止（`document` に登録）
| イベント | 処理 |
|---|---|
| contextmenu, selectstart, dragstart | `preventDefault()`（引き継ぎ欄の selectstart は除く） |
| gesturestart, gesturechange, gestureend（Safari） | `preventDefault()` |
| touchmove（`passive:false`） | `preventDefault()`（ピンチ・引っ張り更新の保険） |
| dblclick | `preventDefault()` |
| wheel（`ctrlKey` 真、`passive:false`） | `preventDefault()`（PC の拡大防止） |

### 8.3 戻る（Android・iOS 共通の番兵）
1. タイトルのタップで `history.pushState({tokoyo:'guard'},'')` を1回。
2. `popstate` を受けたら：
   - 設定などの下位画面 → その画面を閉じ、番兵を積み直す。
   - play → pause を開き、教示領域に「もう一度『戻る』で終了します」を 2s、番兵を積み直し、`exitArmedUntil = now+2s`。
   - pause・title・charSelect で `now < exitArmedUntil` → 保存して積み直さず `history.back()`（ページを離れる）。そうでなければ play と同じく案内して積み直す。

### 8.4 iOS の戻る・ページ復帰
- `pagehide`：保存（区画の途中保存と設定、06の関数）。`visibilitychange` hidden でも同じ。
- `pageshow` で `e.persisted` が真 → pause を開く。音は次のタップで `resume()`（08）。
- スティック範囲は左端から24px（1.5）。

### 8.5 Wake Lock
- タイトルのタップで `navigator.wakeLock?.request('screen')`。`visibilitychange` で表示に戻ったら、title 以外の画面なら取り直す。失敗は無視。

### 8.6 Android の全画面と向きロック
- iOS 以外で `document.fullscreenEnabled` が真のとき、タイトルのタップで `document.documentElement.requestFullscreen({navigationUI:'hide'})` → 成功後 `screen.orientation.lock('landscape')`。どちらも失敗は無視（X3：依存しない）。
- `fullscreenchange` で全画面が外れても自動で戻さない（ユーザー操作が要るため）。pause に「全画面に戻す」を出す。

### 8.7 保存の保護
- タイトルのタップで `navigator.storage?.persist?.()`。結果を設定のデータ欄に表示。拒否されても何もしない（引き継ぎ文字列で補う）。

### 8.8 音の中断
- `AudioContext.state !== 'running'` かつ `soundOn` のとき、音の帯（4.2）「音を有効にする」を表示。帯のタップと、入力層の任意の `pointerup` で `resume()`（手順は08）。

---

## 9. 受け入れ基準（自動テスト）
1. `computeLayout(844×390, inset 左右47 下21 上0, 既定)` → 攻撃(741,317)・回避(645,296)・跳躍(722,222)・奥義(562,310)・結界(598,212)・符(680,148)・注目(772,150)・一時停止(776,30)（±0.5px）
2. 同条件 → 星の点 木(644,142)・火(724,200)・土(693,294)・金(595,294)・水(564,200)（±1px）
3. W 667〜932・H 320〜430（1px刻み）・既定設定 → 見た目円どうしの間隔 ≥ 0、すべての見た目円が safe 矩形内
4. 基準端末 → どの2ボタンの判定円も重ならない（中心距離 > 判定半径の和）
5. deviceScale：H=330 → 0.85、H=390 → 1.00、H=430 → 1.10（±0.001）。位置は H に関わらず safeB からの距離が一定
6. ランダム1万点の `hitTest` → 「距離÷判定半径が最小」の総当たり結果と100%一致。(840,386) → attack
7. 左利き → 各ボタン x' = W − x（±0.5）、星の中心 x' = W − 644、木は中心の真上・火は中心より右
8. `btnScalePct=150` → 全ボタンが上端 safeT+56 より下（実効倍率の自動縮小が働く）
9. スティック（中、ハイブリッド）：触れた点から右へ 30px → stick.x = 0.432（±0.01）、60px → 1.0、100px → 原点が16px（±1）追従
10. 押下中に visualViewport の高さを 390→340 に変える → スティックの役割と出力が保持される（変化前後で stick の差 < 0.01）
11. 攻撃押下から 27px 移動 → camDeg 合計 0／28px 以降 → camDeg が出る（28px 分は回さない）。attack.pressed はその指で1回だけ
12. 奥義押下から 71px → ougi.down=true・ougiOut=false／72px → ougiOut=true・down=false（取消域の間は真のまま）／55px に戻る → ougiOut=false・pressed=true
13. 奥義の指を回避の判定円へ移動 → 同じtickに ougiOut=true かつ dodge.pressed=true（次のtickは ougiOut=false）、以後指を離すと dodge.released=true
14. 奥義押下中に `blur` → そのtick ougiOut=true・ougi.released=false
15. stick の指に `pointercancel` → 次のtickで stick = (0,0)
16. camera の指：11px・249ms で離す → taps に1件／12px または 250ms → 0件
17. ボタン判定の縁から 23px の位置のタップ → taps 0件、25px → 1件
18. はじき：170ms で横41px・縦10px → flick=+1 が1回、続けて動かしても2回目は出ない／横39px → 0
19. pentagram：木→土→水の点列 → edges [[wood,earth],[earth,water]]
20. 木から土へ向かう途中で火の 30px 以内を通る → 火は捕まらない
21. 吸着：木から土への直線上、土まで 55px で進行方向の誤差 20° → 土を捕捉／誤差 30° → 捕捉しない
22. 始点：木から 43px で down → first=wood／45px → first=null
23. 木→土の後に木へ戻る → 辺は増えない（使用済み）
24. 札2で描く → edges は最大2本、3本目の候補は表示上も灰色
25. 簡易モード：木をタップ → 0.2s 後に「二」の点（水）をタップ → fu.edges [[wood,earth],[earth,water]]・fu.commit=true
26. 3tick 進む描画フレームで押した → pressed は1tick目だけ真、camDeg は3等分（±0.001°）。同じ描画区間で押して離した → 1tick目 down=true・released=false、2tick目 released=true（09 13章の11と同じ）
27. キーボード W+D → stick (0.707,0.707)（±0.01）、Shift 併用 → (0.354,0.354)
28. HUD の更新関数を300フレーム回す → style への書き込みは transform と opacity のみ、値が同じフレームは書き込み0件（スパイで確認）
29. play 中に `popstate` → pause が開き、`history.state.tokoyo==='guard'` に戻っている
30. 視点を 390×844 にする → 縦向き案内が表示され、シムの tick が進まない（`?test=1` ではループが止まっているので `getState().paused===true` で確かめる）

## 依頼者が実機で確かめること
1. 右手の親指だけで、攻撃・回避・跳躍・注目に持ち替えずに届くか。奥義を押したまま回避へ滑らせて、溜めを捨てて避けられるか。
2. 符の構えから、補助モードで「浄（2画）」「醒（5画）」が3回に2回以上描けるか。外周の点を誤って拾わないか。
3. Safari でツールバーが出ている状態・ホーム画面に追加した状態の両方で、ボタンが欠けたり重なったりしないか。
4. 画面の左端から右へなでたとき（iOS の戻る）・Android の戻るボタンで、ゲームが止まって終了の案内が出るか。
5. マナーモード（消音スイッチ）オンとオフで、「音を出して遊ぶ」の音が期待どおりになるか。
6. 縦向きロック中に縦で開いたとき、案内の文だけでロックを外して遊び始められるか。

## coreへの変更提案
1. **導入用の世界倍率**（処理済み：core v0.3 4章に採用。D52）：core 4章の世界倍率に「導入中の倍率（0〜1。最初の予兆で0.2、最初の符で0）」を加える。r1-UX B7 の「×0.2」「完全に止める」を実現するには時間の規則に入れる必要がある。あわせて、導入の符の段階では構えの制限時間（1.5s/3.0s）を止める例外を03に書く。
2. **奥義の「56px以内で再開」の意味**（処理済み：core v0.3 5章）：core 5章に「取消圏から 56px 以内に戻ると**0から**溜め直す」と明記する。溜めを保ったまま自由に動けると、3段を常に持ち歩けてしまうため。
3. **符の構えの手動取消**（処理済み：core v0.3 7.4）：core 7.4 に「描き始める前に限り、左手側（スティック範囲）のタップで取消（消費なし）」を加える。構え中はボタンを隠すため、取消の手段が待ち時間（1.5s）しか無い。
4. **InputFrame の項目**（処理済み：09 に一本化。`camHeld`・`flick`・`ageF`・`fu.commit/cancel` は採用、`camPx`→09 の `camDeg`、`ougiCancel`→09 の `ougiOut`、`fu.start/newEdges`→09 の `fu.first/edges` に読み替え。D49）：r1-ENG の型から `cam` を `camPx`（単位を名前に）に改め、`camHeld`・`ougiCancel`・`flick`・`btn.*.ageF` を加え、`fu` を `{touching,start,newEdges,commit,cancel}` にする（09 の共通型として採用を求める）。
