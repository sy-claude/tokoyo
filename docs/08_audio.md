# 08 音（audio）v0.3

> v0.3（第3回統合）：`bossMoveSfx` を04のボス技IDで確定（3.3）、区画番号を05に合わせた（4章）、BGM の状態名 idle／loading／ready／playing／missing／error を定義（5.2）、設定キーの改名（D68）。

**この文書でできること**
- 効果音と環境音は、すべてプログラムで作ります。その作り方（音の高さ・長さ・響き）と音量の決まりを定めます。
- BGMは依頼者が Gemini で作った曲のファイルを使います。曲の頼み方（そのまま貼れる指示文）、選び方、リポジトリへの置き方も書いてあります。
- iPhoneのマナーモード（消音スイッチ）、アプリの切替、「音なしで遊ぶ」を選んだ場合の扱いも決めます。

**関連文書**：00_core（11）／decisions（D34, D42）／01（タイトルの2択・音の帯・設定の音量・`followMuteSwitch`）／03（5.6 手応えのイベント）／04（敵とボスの技ID）／07（8.2 同じ場面の見た目）／**09（3.1 SimEvent の名前と中身が正本、1.4 `audio/` の構成、4.4 音の乱数の種）**

**方針の変更（依頼者の決定 U6、D48 で承認済み）**：BGMは合成ではなく音声ファイル（`public/audio/bgm/`）。効果音・環境音は Web Audio の合成のまま。core v0.3 の11章・12章11に反映済み。

---

## 1. 音の構成（`src/audio/engine.js`）

### 1.1 つなぎ方
```
各効果音の声 ─ 声の音量 ─(定位 StereoPanner)─┬─ busSfx ──┐
UI の声 ───────────────────────────────┼─ busUi ───┤
                                        └─ 残響へ送る ─ reverb(Convolver) ─ busReverb ─┤
BGM の曲 ─ 曲の音量(クロスフェード) ─ 曲の色調フィルタ ─ busBgm ─ bgmDuck ─ worldFx ─┤
環境音 ─────────────────────────── busAmb ─────────── worldFx ─┤
                                                     master ─ compressor ─ destination
```
- `worldFx`：BGM と環境音だけにかかる低域通過（符の構え・見切り・一時停止で絞る。効果音は絞らない）。BGM と環境音は同じ1つの `worldFx` を通す。
- BGM は残響に送らない（ファイルに響きがあるため）。
- `AudioContext({latencyHint:'interactive'})`。サンプリング周波数は端末の既定。
- 音量の設定（01）：系統の倍率 ＝ `(設定% / 100)²`。`volMasterPct`→master、`volSfxPct`→busSfx と busUi、`volBgmPct`→busBgm、`volAmbPct`→busAmb。

| configキー | 値 | 単位 | 説明 |
|---|---|---|---|
| busSfxDb | 0 | dB | 効果音（基準） |
| busUiDb | −6 | dB | UI |
| busBgmDb | −8 | dB | BGM（曲は5.5で正規化済み。r1の−14は合成BGMの想定だったため変更） |
| busAmbDb | −18 | dB | 環境音 |
| busReverbDb | −6 | dB | 残響の戻り |
| masterDb | 0 | dB | |
| compThresholdDb / compKneeDb / compRatioMul | −18 / 12 / 4 | dB / dB / 倍 | 主出力のコンプレッサー |
| compAttackS / compReleaseS | 0.003 / 0.25 | s | |

### 1.2 残響（起動時に1回作る）
- 1.8s のステレオのインパルス応答。各チャンネル独立の白色雑音（音の乱数）× `exp(−6.91·t/1.8)`（1.8sで−60dB）。先頭に12msの無音。1極の低域通過を掛け、遮断周波数を 8000Hz（t=0）→1500Hz（t=1.8）へ直線で下げる（尾が暗くなる）。`ConvolverNode.normalize=true`。

| configキー | 値 | 単位 |
|---|---|---|
| reverbLengthS / reverbPredelayS | 1.8 / 0.012 | s |
| reverbLpStartHz / reverbLpEndHz | 8000 / 1500 | Hz |

### 1.3 声の管理
- 1回の効果音の発音＝1声（中の発振器の数は問わない）。**同時に24声まで**。持続する層（BGM・環境音・心音・奥義3段の和音・ボスの岩の擦れ）は数えない。
- 優先度：3＝予兆・見切り・被弾・封破・奥義の発動・ボスの技／2＝命中・撃破・符・結界・穢石・浄化／1＝振り・回避・敵の声・魂片／0＝足音・着地・跳躍・UIの移動。
- 25声目：鳴っている声のうち「優先度が新しい音以下で最も低く、その中で最も古い」声を10msで0にして止め、新しい音を鳴らす。該当が無ければ新しい音を捨てる。
- **同じ音IDが30ms以内に始まっていれば捨てる**（命中の属性の層は命中と同じ1声に含めるので別扱いしない）。
- **音程のばらつき ±5%**：全周波数に `r∈[0.95,1.05]`（音用の乱数：09 4.4 の `seed ^ 0x9e3779b9`。シムのハッシュに含めない）。3.2 の「固定」欄に○がある音（音階で音程を伝える音）は ばらつかせない。
- 定位：`pos` を持つ音は、聞き手（カメラ）からの水平の角度 θ で `pan = clamp(sin θ, −1, 1) × 0.5`、距離 d で `gain × clamp(1 − (d − 4)/36, 0.25, 1)`。

| configキー | 値 | 単位 |
|---|---|---|
| voiceMaxCount | 24 | 声 |
| sameSoundGapS | 0.03 | s |
| pitchJitterPct | 5 | % |
| voiceStealFadeS | 0.01 | s |
| panWidthMul | 0.5 | 倍 |
| distNearM / distFarM / distMinMul | 4 / 40 / 0.25 | m / m / 倍 |

### 1.4 ダッキングと世界の音色
| 条件 | 動き |
|---|---|
| `ougiRelease`・`fuhou`・`bossDefeat` | bgmDuck を −5dB へ0.05sで下げ、0.4s保持、0.6sで0dBへ。重なったら保持を延長 |
| 符の構え（`fuStart`→`fuCast`/`fuCancel`） | worldFx を 800Hz へ0.15s |
| 見切り（`mikiri`） | worldFx を 1500Hz へ0.1s、1.5s後に戻す（符の構え中は 800Hz を優先） |
| 一時停止 | worldFx 1000Hz、busBgm −12dB（0.3s） |
| `combatMode` on | busAmb −4dB（2s） |

| configキー | 値 | 単位 |
|---|---|---|
| duckDb / duckAttackS / duckHoldS / duckReleaseS | −5 / 0.05 / 0.4 / 0.6 | dB / s / s / s |
| worldFxOpenHz / worldFxFuHz / worldFxMikiriHz / worldFxPauseHz | 20000 / 800 / 1500 / 1000 | Hz |
| worldFxRampS | 0.15 | s |
| pauseBgmDb / combatAmbDb | −12 / −4 | dB |

### 1.5 音が読む情報
- イベント：09 3.1 の SimEvent（tick ごとに配送）。UI の音は `ui/` から `audio.ui(id)` を直接呼ぶ。
- 毎描画、`app/` が `audio.update(view)` を呼ぶ（心音・敵の声・岩の擦れ・定位に使う）。
```js
/** @typedef {{scene:string, paused:boolean, listener:{pos:V3, yawDeg:number},
 *  player:{pos:V3, hpRatio:number}, enemies:{id:number, def:string, pos:V3}[],
 *  boss:{id:number, pos:V3, speedMps:number, phase:1|2}|null}} AudioView */
/** @typedef {{sound:string, pos?:V3, prio:0|1|2|3, gainDb?:number, pan?:number, param?:number}} SoundCmd */
```
- `audio/router.js` の `routeEvent(ev, view, cfg) → SoundCmd[]` は**純関数**（Node で試験する）。

---

## 2. iOS 対策と開始・中断（`src/audio/unlock.js`）

### 2.1 タイトルのタップ（01 のタップ処理の中で、同期的に順に）
1. `ctx` が無ければ作る。
2. `navigator.audioSession` があれば `type = followMuteSwitch ? 'ambient' : 'playback'`。
3. `ctx.resume()`（待たずに次へ）。
4. 1サンプルの無音バッファを鳴らす。
5. `followMuteSwitch` が偽なら、**無音のWAVを `<audio loop playsinline>` で再生**（`muted` にしない）。WAV はコードで作る：8000Hz・8bit・モノラル・1.0s、全サンプル0x80、44バイトの見出し＋8000バイト → `Blob('audio/wav')` → `URL.createObjectURL`。
6. master の音量：「音を出して遊ぶ」は 1、「音なしで遊ぶ」は 0（01：AudioContext は作る）。
7. 「音を出して遊ぶ」なら BGM の読み込みを始める（5.3）。「音なし」では読み込まない。
- 各手順の例外はすべて捕まえて先へ進む（console.error を出さない。`console.info` 1行のみ）。

### 2.2 中断と復帰
| 出来事 | 処理 |
|---|---|
| `visibilitychange` hidden / `pagehide` | `ctx.suspend()`、無音WAVを pause。予定済みの音は ctx の時計と一緒に止まるので組み直さない |
| visible / `pageshow`（persisted） | 自動では再開しない（09：一時停止メニューが出る）。次の `pointerup` で 2.1 の 2〜5 を再実行 |
| `ctx.onstatechange` で `'interrupted'` または `'suspended'`（soundOn かつ前面） | 01 の「音を有効にする」帯を出す。帯のタップ・入力層の任意の `pointerup` で 2.1 の 2〜5 |
| `resume()` 後 `audioResumeCheckS` 経っても `'running'` でない | 帯を出したまま |
| `'running'` に戻った | 帯を消す。BGM の予定（5.4）は時計が止まっていたのでそのまま続く |
| 設定 `followMuteSwitch` の切替（設定画面のタップ内） | 真：audioSession を 'ambient'、無音WAVを止める。偽：'playback'、無音WAVを再生 |
| 設定 `soundOn` を偽→真（タップ内） | master 1、2.1 の 2〜5、BGM の読み込み開始 |

| configキー | 値 | 単位 | 説明 |
|---|---|---|---|
| audioResumeCheckS | 0.5 | s | 復帰の確認待ち |
| silentWavRateHz / silentWavLenS | 8000 / 1.0 | Hz / s | 無音WAV |
| silentLoopMode | 'always' | — | 'always'＝audioSession があっても無音WAVを流す／'fallback'＝無いときだけ（実機確認で決める） |

### 2.3 音なしモードの代わりの見た目（`soundOn=false` のとき、ui/render が `audio.soundOffCues` を見る）
| 音で伝えていたこと | 代わり |
|---|---|
| 画面外の予兆（定位） | 01 の矢印を予兆の間 4Hz で明滅（1.0→0.4） |
| 予兆の種類の音 | 頭上の漢字を出す時に字を1.3→1.0倍（80ms） |
| 低HPの心音 | 紙墨パスの `uInk` を心音と同じ周期で ±0.08 脈打たせる（07） |
| 奥義の段が上がる鈴 | ボタンの円相が段の色で1回光る（120ms） |
| 浄化・地脈の段の鈴 | 金箔の数を×1.5 |
| 魂片の連続の上がる音程 | 魂片を拾った時に ボタン上でなく HP 横に「＋n」を出す |
| 結界の回復 | 結界の残数の印が1回光る |
| 敵が近くで唸る | なし（見える範囲の情報で足りる） |

---

## 3. 効果音（`src/audio/sfx.js`、`config/audio.js` の表で数値を持つ）

### 3.1 部品の書き方
- `T(波形, f0→f1, 滑りs)`：発振器。周波数は指数で滑る（f0=f1 なら固定）。
- `N(色, フィルタ 種類 周波数 Q)`：雑音。白・ピンク（Kellet の近似）・茶色の各2sのバッファを起動時に1回作り、開始位置をずらして使う。`周波数a→b` は掃引。
- `E(a, d)`：音量。0から a 秒で頂点へ直線、その後 `setTargetAtTime(0, 開始+a, d/6.9)` で d 秒後に約−60dB。音源は a+d+0.05 秒で止める。
- `@−x`：頂点の音量（dBFS、ばらつき前）。`→rv0.3`：残響への送り（既定0.15）。
- 楽器の部品：

| 名 | 作り方 |
|---|---|
| 大太鼓 `odaiko(f)` | T(sine, 2f→f, 0.15) E(0.002, 1.0)@−4 ＋ N(白, 低域 1500 Q0.7) E(0.001, 0.05)@−14 |
| 縁打ち `kachi` | N(白, 帯域 2500 Q4) E(0.001, 0.04)@−8 ＋ T(triangle, 900) E(0.001, 0.04)@−12 |
| 拍子木 `hyoshigi(f=1200)` | 正弦 f・2.17f・3.25f（1.2/2.6/3.9kHz）を各 E(0.001, 0.05)@−8/−11/−14 ＋ N(白, 高域 3000) E(0, 0.001)@−12 |
| 木魚 `mokugyo(f=500)` | T(sine, f→0.97f, 0.1) を帯域 f Q3 に通す E(0.001, 0.15)@−8 |
| 鈴 `suzu(f, d=0.45)` | 正弦 f×[1, 2.0, 2.76, 5.40, 8.93]、音量 [0, −4, −8, −12, −16]dB、各部分音は d/(1+0.5i) で減衰 @−14 |
| 鈴の群れ `suzuMany(n, fLo, fHi)` | suzu を n 個、f は fLo〜fHi の乱数、5〜30ms ずつずらす |
| りん `rin(f, うなりHz, d)` | 正弦 f と f+うなり 各@−12 ＋ 正弦 2.76f @−24（減衰 d×0.4）、E(0.005, d) |
| 筆 `brush(s)` | N(ピンク, 帯域 1800→900 Q1.2, s秒) E(0.02, s)@−16 |
| 金属 `clang(f)` | 正弦 f×[1, 1.47, 2.09, 2.56, 3.1] E(0.001, 0.6)@−8 ＋ N(白, 高域 5000) E(0.001, 0.08)@−12 |
| 結晶 `crystal(f)` | 正弦 f×[1, 1.37, 1.91, 2.6] E(0.001, 0.25)@−10 ＋ N(白, 高域 4000) E(0.001, 0.06)@−14 |
| 息 `breath(s)` | N(白, 帯域 1200 Q0.8) E(0.01, s)@−18 |

### 3.2 一覧
| 音ID | 作り方 | 優先 | 固定 |
|---|---|---|---|
| hitLight | T(sine, 150→60, 0.08) E(0.001, 0.08)@−6 ＋ N(白, 高域 2000) E(0.001, 0.03)@−12 | 2 | |
| hitMid | T(sine, 170→55, 0.10) E(0.001, 0.10)@−5 ＋ N(白, 高域 2000) E(0.001, 0.04)@−10 | 2 | |
| hitHeavy | hitMid ＋ odaiko(55) →rv0.25 | 2 | |
| 属性の層（命中に重ねる） | 木 N(白, 帯域 800 Q8) E(0.001, 0.06)@−10 ＋ T(triangle, 800→760, 0.05)@−14（竹）／火 N(白, 高域 3000) の4ms の粒6個を120ms に散らす @−16（パチパチ）／土 T(sine, 50) を低域 200 に E(0.002, 0.25)@−8／金 正弦 2400×[1, 1.53, 2.37, 3.01] E(0.001, 0.35)@−14／水 T(sine, 1200→400, 0.03) E(0.001, 0.06)@−12（しずく） | — | |
| sealedLayer | rin(900, 3, 0.4)@−20（封印中の敵への命中に重ねる） | — | |
| guard | clang(1100) の部分音を3つ（1, 1.6, 2.3）、E(0.001, 0.3) ＋ N(白, 帯域 3000) E(0, 0.02) | 2 | |
| kill | N(ピンク, 低域 2000→300, 0.4) E(0.005, 0.45)@−10 ＋ suzu(2800)@−22 | 2 | |
| swingLight | N(白, 帯域 400→2000 Q1.5, 0.15) E(0.02, 0.13)@−12 | 1 | |
| swingHeavy | N(白, 帯域 300→1400 Q1.5, 0.22) E(0.03, 0.2)@−9 ＋ T(sine, 90→60, 0.2)@−18 | 1 | |
| bowShot | T(sawtooth, 220→196, 0.08) を低域 1800→600 に E(0.001, 0.25)@−12 ＋ N(白, 高域 4000) E(0, 0.01)@−20 ＋ swingLight の0.08s版@−16 | 1 | |
| dodgeStep | breath(0.12) ＋ N(ピンク, 低域 600) E(0.005, 0.1)@−20（衣擦れ） | 1 | |
| airDash | N(白, 帯域 600→2400 Q2, 0.18) E(0.01, 0.17)@−12 ＋ T(sine, 80→50, 0.1)@−18 | 1 | |
| flip | N(白, 帯域 800→1600 Q1.5, 0.25) E(0.02, 0.23)@−14 ＋ 衣擦れ | 1 | |
| mikiri | hyoshigi(1200) ＋ 30ms 後に suzu(4200)@−12 →rv0.3 | 3 | ○ |
| jump | breath(0.08)@−22 | 0 | |
| land | N(ピンク, 低域 400) E(0.002, 0.08)、音量 −20＋2×min(fallM, 3) dB | 0 | |
| footstep | 草 N(白, 帯域 2500 Q0.7) E(0.002, 0.05)@−26／砂 N(白, 低域 1200) E(0.005, 0.07)@−24／石 T(triangle, 220→200, 0.03) E(0.001, 0.03)@−24 ＋ N(白, 高域 3000) E(0, 0.01)@−26／岩 石の f=160。主人公のみ。唐笠は gataGeta | 0 | |
| ougiCharge0 | N(ピンク, 帯域 500 Q1) E(0.3, 0.2)@−18 | 1 | |
| ougiCharge1/2/3 | suzu(1175)／suzu(1568)／suzu(1760)、3段は続けて持続の和音（鋸歯 A4・B4・E5・F♯5 を低域 1400、立ち上がり 0.3s、@−20）を `ougiRelease`・`ougiCancel` まで | 1 | ○ |
| ougiCancel | T(sine, 1175→880, 0.2) E(0.001, 0.25)@−18 ＋ brush(0.12)、持続和音は0.15sで消す | 1 | |
| ougiRelease1/2/3 | 1：odaiko(60) ＋ swingHeavy／2：1 ＋ clang(1800)@−12／3：odaiko(50) を0と0.12s ＋ clang(1800) ＋ swingHeavy、→rv0.5 | 3 | |
| kekkaiPlace | rin(600, 2, 3.0)@−12。罠は rin(800, 2, 1.5)@−16 | 2 | |
| kekkaiTrap | rin(600, 2, 1.0) ＋ kachi | 2 | |
| kekkaiExpire | N(ピンク, 高域 3000) E(0.005, 0.1)@−22（理由 expire/hits/trapTimeout。fuhou は鳴らさない） | 1 | |
| kekkaiFail | mokugyo(300)@−14 | 1 | |
| kekkaiCharge | suzu(2600)@−24 | 0 | ○ |
| fuhou | odaiko(55) ＋ clang(2400) ＋ N(白, 帯域 1500 Q0.5) E(0.001, 0.3)@−8、big は +3dB・→rv0.5 | 3 | |
| fuStart | T(sine, 300→150, 0.4) を低域 600 に E(0.05, 0.4)@−18 | 2 | |
| fuStroke | brush(0.12) ＋ suzu(画の音)@−14。画 index 1〜5 → 1175・1245・1568・1760・1865Hz（D・E♭・G・A・B♭ の都節） | 2 | ○ |
| fuCast | 共通：hyoshigi(1200) を0と0.09s。一穴：＋T(sine, 1800→2600, 0.12)@−14／浄：＋suzuMany(8, 3000, 4200)／守：＋rin(700, 1.5, 2.0) ＋ N(ピンク, 帯域 2500) を18Hz で振幅変調0.6s@−20（紙の羽ばたき）／滅：＋odaiko(45) ＋ brush(0.3)@−10／醒：＋suzu 1175・1568・1760・2349 を80ms おき | 2 | ○ |
| fuCancel | N(ピンク, 帯域 900→1800 Q1.2, 0.1) E(0.01, 0.1)@−18 ＋ mokugyo(400)@−20 | 1 | |
| eikiSpawn | N(茶) ＋ T(sawtooth, 55) を低域 300 に、音量を 0→頂点へ1.2sで上げ（逆再生風）0.05sで切る @−12 | 2 | |
| eikiPurify | suzuMany(8, 3000, 4000) ＋ rin(1800, 0.5, 1.5)@−20 →rv0.4 | 2 | |
| ekakuBreak | crystal(3100) | 2 | |
| esekiBreak | crystal を 0/40/90ms に f=2600/3300/4100 ＋ N(白, 高域 3000) E(0.001, 0.15)@−12。first=true は ＋suzu(3500) | 2 | |
| tamakake | suzu(音, d=0.3)@−16。音＝陽音階 D6・E6・G6・A6・B6・D7・E7・G7・A7・B7 の chain 番目（10以上は B7） | 1 | ○ |
| gaugeStage | 段1〜3：rin(880, 1, 2.0) ＋ suzuMany(5, 3000, 3800)。段4（清）：odaiko(70) ＋ suzuMany(8, 3000, 4200) ＋ 正弦 D5・A5・E6 の和音を2sで膨らませ4sで消す @−16 →rv0.5 | 2 | ○ |
| gateOpen | rin(440, 1.5, 6.0)@−8 ＋ suzuMany(6, 2800, 3600) →rv0.6 | 2 | ○ |
| ryuketsu | heal：rin(1046, 1, 2.0)@−16／curse：正弦 220 と 233 E(0.1, 1.2)@−16 ＋ N(茶, 低域 300)@−22／neutral：rin(784, 1, 1.2)@−20／deplete：T(sine, 784→523, 0.3) E(0.01, 0.4)@−20 | 2 | ○ |
| infectOn / infectOff | T(triangle, 110) に 6Hz ±30セントの揺れ、低域 400、E(0.1, 0.8)@−16／suzu(2600)@−22 | 2 | |
| buffEnd | 醒：suzu 1760→1175（2音、80ms）@−22／守：紙の羽ばたき0.2s | 1 | ○ |
| hurtFlinch | T(sine, 120→70, 0.08) E(0.001, 0.1)@−6 ＋ N(ピンク, 低域 1500) E(0.001, 0.06)@−10 | 3 | |
| hurtDown | hurtFlinch ＋ odaiko(70)@−8 | 3 | |
| death | odaiko(45) ＋ rin(300, 1, 5.0)@−10 | 3 | |
| heartbeat（持続） | 「ドッ」T(sine, 55) E(0.005, 0.12)@−10、0.18s 後「クン」T(sine, 48) E(0.005, 0.14)@−13。周期 60/70 s、hpRatio<0.10 は 60/90 s | — | ○ |
| seaFall | N(白, 低域 3000→600, 0.5) E(0.005, 0.6)@−8 ＋ N(茶, 低域 300) E(0.02, 0.8)@−12 | 2 | |
| respawn | suzu(2600) ＋ rin(1046, 1, 0.8)@−20 | 1 | ○ |
| teleGeki（撃） | kachi を帯域 1500 に下げ ＋ T(triangle, 600)@−8 | 3 | |
| teleE（穢） | N(茶) ＋ T(sawtooth, 73) を低域 350 に、0→頂点を min(durF/60−0.1, 1.0) s で上げて切る @−10 | 3 | |
| teleFuu（封） | rin(1568, 3, 1.2)@−10 | 3 | |
| projBlocked | N(白, 高域 4000) E(0, 0.02)@−20（守で弾を消した） | 0 | |
| uiConfirm / uiBack / uiMove / uiStamp / uiLock | hyoshigi(1200)@−6／mokugyo(500)／suzu(3200, d=0.08)@−18／N(ピンク, 低域 800) E(0.001, 0.05)@−14／kachi@−22（busUi） | 0 | |

- 命中の段：`heavy` または `hitstopF ≥ 12` → hitHeavy、`hitstopF ≥ 8` → hitMid、他 → hitLight。属性の層は `hit.element`（攻撃側）。`affinity` adv は命中＋2dB・属性の層＋3dB、dis は属性の層を省き命中を低域 2000Hz に通す。`seal` sealed は sealedLayer を足す。
- 定位：画面外の予兆（`telegraph.offscreen`）は pan を `sin θ × 0.9`、＋3dB。同じ attackInstanceId の予兆は1回。

### 3.3 敵とボスの声
| 種 | きっかけ | 作り方 |
|---|---|---|
| 穢狗 | 待機の唸り：主人公から15m以内で 3〜6s ごと（敵ごとに乱数） | N(茶, 低域 250) を 18Hz で振幅変調、0.6s @−20 |
| 穢狗 | その敵の `telegraph` | N(白, 帯域 900 Q3) E(0.01, 0.25)@−14 ＋ 唸り |
| 灯魂 | 待機：4〜8s ごと | N(ピンク, 帯域 3000 Q1) を 12Hz で振幅変調、0.4s @−24（紙の擦れ） |
| 灯魂 | その敵の `projectileSpawn` | 「ポッ」T(sine, 400→180, 0.06) E(0.001, 0.08)@−10 ＋ N(白, 帯域 1000) E(0, 0.03)@−16 |
| 唐笠 | その敵の移動中、0.35s ごと（gataGeta） | hyoshigi(700)@−16 |
| 唐笠 | その敵の `swing`（着地の衝撃波） | odaiko(80)@−8 ＋ hyoshigi(700) |
| 面鬼 | その敵の glyph 付き `telegraph` | 吠え：T(sawtooth, 70→55, 0.8) を低域 500 ＋ N(茶) を 25Hz で振幅変調、E(0.08, 1.0)@−8 |
| 面鬼 | `guard`／`kuzushi` on | guard／clang(1100) ＋ odaiko(60) |
| 石凝神 | 移動中（持続） | N(茶) を帯域 180 Q0.8、音量 ∝ min(speedMps/2, 1)、最大 @−14（岩の擦れ） |
| 石凝神 | `bossIntro` | 咆哮：T(sawtooth, 45→38, 2.0) ＋ N(茶, 低域 400) ＋ odaiko(40)、@−4 →rv0.6 |
| 石凝神 | `bossPhase` 2 | 咆哮 ＋ 縄の切れる音 N(白, 帯域 2000 Q2) E(0, 0.08) を3回（0/0.15/0.32s） |
| 石凝神 | ボスの `swing`（moveId で下の `bossMoveSfx` 表を引く） | 表のとおり。予兆の音は8章の `telegraph` の漢字別（teleGeki・teleE・teleFuu）で、ボス専用の予兆音は無い |
| 石凝神 | `kuzushi` on／`kanameBreak`／`bossDefeat` | clang(1600) ＋ odaiko(55)／crystal(2600) ＋ odaiko(60)／odaiko(40) を0/0.4/0.8s ＋ rin(220, 1, 8.0) ＋ 1.2s 後に suzuMany(8, 3000, 4200)、→rv0.6 |

- 敵の声は1体につき同時1声。15m より遠い敵は鳴らさない。

`bossMoveSfx`（`config/audio.js` の `sfxRecipes` の中。技IDは04 4.2 で確定）
| moveId | 発動（`swing`）の音 |
|---|---|
| `boss.slam` | odaiko(40) ＋ N(茶, 低域 300) E(0.01, 0.6) |
| `boss.fan` | 灯魂の「ポッ」を f×0.6 で60ms おきに5回 |
| `boss.eiki` | 無し（teleE と `eikiSpawn` の音で足りる） |
| `boss.kekkai` | rin(523, 2, 2.0) |
| `boss.jibashiri` | odaiko(90) の0.2s版を0.1s おきに6回（岩柱の本数と同じ） |
| `boss.shiko` | odaiko(45) ＋ N(茶) E(0.01, 0.4) |
- 表に無い moveId のボスの `swing` は鳴らさない（`data/validate` が表と04の技IDの一致を検査する）。

---

## 4. 環境音（`src/audio/ambience.js`）

| 層 | 作り方 |
|---|---|
| 波 | ピンク雑音（6sのループ）→ 低域（遮断 500＋400·sin(2π·0.08t) Hz、Q0.5）→ 音量 0.55＋0.45·sin(2π·0.08t＋π/2) → pan ±0.3 を0.03Hz で揺らす。揺れは発振器を AudioParam につなぐ（毎フレームの計算なし） |
| 風 | 白色雑音 → 帯域（Q1.5、中心は3sごとに 300〜1200Hz の乱数へ `setTargetAtTime` τ1.0）。崖道では 6〜12s ごとに突風（+6dB を1.5sで、2sで戻す） |
| 鳶 | 20〜40s ごと（区画の表で有効、`combatMode` 中は鳴らさない）。「ピー」正弦 2200→2300Hz 0.35s、0.08s 空けて「ヒョロロ」正弦 1900→1500Hz 0.9s に 8Hz ±60セントの揺れ。低域 4000、pan ±0.6 の乱数、@−14、→rv0.6 |

| 場所（`zoneEnter.zone`＝05 1.2 の区画番号、または場面） | 波 | 風 | 突風 | 鳶 |
|---|---|---|---|---|
| 1 浜の参道 | 1.0 | 0.4 | 無 | 有 |
| 2 磐座の丘 | 0.5 | 0.6 | 無 | 有 |
| 3 千本鳥居の崖道 | 0.7 | 1.0 | 有 | 有 |
| 4 ボス舞台 | 0.8 | 0.7 | 無 | 無 |
| タイトル・選択・結果 | 0.6 | 0.3 | 無 | 有 |

- 区画番号は05 1.2 の `StageDef.zones[].id`（1＝①浜の参道、2＝②磐座の丘、3＝③千本鳥居の崖道、4＝④ボス舞台）。区画0（どの rect にも入らない＝海の上の空中など）は直前の区画の配合のまま。
- 倍率は層の音量（1.0＝`ambWaveDb`/`ambWindDb`）。区画が変わったら3sで寄せる。

---

## 5. BGM（音声ファイル、`src/audio/bgm.js`）

### 5.1 曲とファイル
| 曲ID | 用途 | 再生する場面 |
|---|---|---|
| title | タイトル | タップ後〜ステージ開始まで（select が無ければ選択画面も） |
| select（任意） | キャラ選択 | 選択画面（無ければ title を続ける） |
| explore | 白鷺岬・探索 | ステージ中、戦闘でないとき |
| battle | 白鷺岬・戦闘 | `combatMode` on |
| boss1 | ボス第1段階 | `bossIntro` 〜 |
| boss2 | ボス第2段階 | `bossPhase` 2 〜 |
| result | 結果・清め | 結果画面 |

- 置き場所：`public/audio/bgm/<曲ID>.m4a`（AAC 128〜160kbps、48kHz、ステレオ）。`.m4a` が無ければ同名の `.mp3` を試す。URL は `import.meta.env.BASE_URL + 'audio/bgm/' + id + '.m4a'`。
- 開発中は `public/audio/bgm/.gitkeep` だけを置く（ファイルが無くても動く）。

### 5.2 失敗しても止まらない
- 曲ごとの状態（`__game.audio().bgm.state`、09 10.2）：`idle`（まだ読んでいない）→ `loading`（fetch 中・展開中）→ `ready`（展開済み、鳴っていない）→ `playing`（鳴っている。止めたら `ready`、展開を捨てたら `idle`）。失敗は2つ：`missing`＝ファイルが無い（404。`.m4a` と `.mp3` の両方）、`error`＝ネットワーク失敗・`decodeAudioData` の失敗（壊れたファイル）。どちらも `console.info` を1回だけ出し、`console.error` と例外は出さない。失敗した曲は同じ起動の間は読み直さない。
- `missing`・`error` の曲へ切り替える要求 → 今の曲を1.5sで消して無音（`bgmFallbackSynthEnabled` が真なら 5.8 の仮BGM）。
- 音なしモードでは読み込み自体をしない。

### 5.3 読み込みとメモリ
1. タイトルのタップ後、圧縮データ（ArrayBuffer）を title→select→explore→battle→boss1→boss2→result の順に1本ずつ `fetch` して全部持つ（1本約2〜3MB）。
2. 展開は必要な曲だけ。**`decodeAudioData` には `buf.slice(0)` を渡す**（渡した ArrayBuffer は使えなくなるため。元は再展開用に残す）。
3. 展開は `new OfflineAudioContext(2, 1, bgmDecodeRateHz)` の `decodeAudioData` で行い、32kHz の AudioBuffer にしてメモリを約2/3にする（2分で約31MB）。この方法が例外を出したら主の ctx で展開する。
4. 展開済みは最大 `bgmDecodedMaxCount`（3）曲。超えたら、再生中・予定中でない曲のうち最も古く使った曲を捨てる。
5. 展開の時機：

| きっかけ | 展開する | 捨ててよい |
|---|---|---|
| タイトルのタップ | title, select | — |
| ステージ開始 | explore, battle | title, select |
| `gaugeStage` 2（鳥居が開く）／ボス前から再挑戦 | boss1 | — |
| `bossIntro` | boss2 | explore |
| `bossDefeat` | result | battle, boss1 |
| 結果→選択 | title, select | boss2 |

6. 展開時に音量をそろえる：全標本の16個おきの二乗平均から RMS(dBFS) を求め、曲の倍率 ＝ `bgmTargetRmsDb − RMS + bgm<Id>GainDb`（±12dB で止める）。
7. 切替の要求の時に曲が未展開 → 今の曲を最大 `bgmWaitMaxS` 続け、展開が済んだら切り替える。間に合わなければ今の曲を消し、済み次第フェードインで始める。

### 5.4 ループ（終端と先頭の重ね合わせ）
- 曲ごとの値：`loopStartS`・`loopEndS`（0＝自動）、重ねの長さ X。
- 自動：先頭の −50dBFS 未満の部分を飛ばした位置を loopStartS、末尾の −50dBFS 未満を除いた位置を loopEndS、X＝`bgmLoopXfadeS`（2.0s）。
- 1周を「区間の音源（AudioBufferSourceNode）」1つで鳴らし、次の区間を先に予定する。重ね方は次の優先順：
  1. loopEndS の後ろに X 秒以上の音がある：旧区間は loopEndS＋X まで鳴らし、旧が loopEndS に来た時刻に新区間を loopStartS から始め、X 秒で等パワーのクロスフェード。
  2. loopStartS の前に X 秒以上の音がある：旧が loopEndS−X に来た時刻に新区間を loopStartS−X から始め、X 秒で重ねる。
  3. どちらも無い（自動の既定）：旧が loopEndS−X に来た時刻に新区間を loopStartS から始め、X 秒で重ねる（拍はずれるが、つなぎ目の段差は消える）。
- 等パワー：旧の音量 cos(πu/2)、新 sin(πu/2)、u は 0→1。`setValueCurveAtTime` に32点で渡す。
- 予定は 0.25s ごとの見張り（`setInterval`）で、`ctx.currentTime` を見て 1.0s 先まで入れる。hidden 中は ctx が止まるので見張りも何もしない。

### 5.5 曲の切替
| 遷移 | 方法 |
|---|---|
| explore → battle（`combatMode` on） | 拍合わせ：両方の `tempoBpm>0` なら、旧の次の小節頭で新を `entryS` から始め、旧の2小節ぶんで等パワーのクロスフェード。テンポ不明なら即時1.5s |
| battle → explore（`combatMode` off） | `bgmCombatOffHoldS`（4s）待つ。その間に on が来たら取り消し。待ち終えたら拍合わせなしで4sのクロスフェード。explore は前に止めた位置から続ける |
| 最短の保持 | battle に入ってから `bgmMinHoldS`（6s）は explore へ戻さない |
| → boss1（`bossIntro`） | 今の曲を2sで消し、`bossIntro` の0.8s後（咆哮の後）に boss1 を entryS から1.0sで入れる |
| boss1 → boss2（`bossPhase` 2） | 拍合わせ（両方の tempoBpm>0）：boss1 の次の小節頭で boss2 を始め、boss1 の2小節で重ねる。不明なら即時2s |
| → 無音（`bossDefeat`・`playerDeath`） | 1.5sで消す |
| → result（結果画面） | 0.5sの無音の後、1.0sで入れる |
| title ↔ select | 拍合わせなし1.5s |
| ボス前から再挑戦（`respawn` retryBoss） | 今の曲を0.5sで消し、boss1 を entryS から |

- 拍の計算：小節の長さ `bar = 4×60/tempoBpm`、今の再生位置 p（曲の中の秒）、次の小節頭 `b = beatOffsetS + ceil((p − beatOffsetS)/bar)·bar`。待ち `b − p` が 0.05s 未満なら次の小節。
- battle と boss1・boss2 は毎回 entryS から。explore と title は止めた位置を覚えて続きから。

### 5.6 清め（地脈ゲージ）と強弱
- explore と battle にだけ「曲の色調フィルタ」（低域通過＋高域の棚）を掛け、地脈の段で開く。穢れた岬では音がこもり、祓うほど澄む。

| 段（`gaugeStage`） | 0（開始） | 1（25） | 2（50） | 3（75） | 4（100・清） |
|---|---|---|---|---|---|
| 低域の遮断 Hz | 4000 | 6000 | 9000 | 14000 | 20000 |
| 3kHz 以上の棚 dB | 0 | 0 | 0 | 0 | +2 |

- 変化は3sかけて。清（段4）は gaugeStage の音（3.2）が「清め」の合図になる。boss1・boss2・result には掛けない。

### 5.7 曲の設定（`config/audio.js`、`<Id>` は Title/Select/Explore/Battle/Boss1/Boss2/Result）
| configキー | 既定 | 単位 | 説明 |
|---|---|---|---|
| bgm`<Id>`LoopStartS / bgm`<Id>`LoopEndS | 0 / 0 | s | 0＝自動（5.4） |
| bgm`<Id>`TempoBpm | 0 | bpm | 0＝不明（拍合わせしない）。実測して入れる（発注のテンポは目安） |
| bgm`<Id>`BeatOffsetS | 0 | s | 最初の小節頭の位置 |
| bgm`<Id>`EntryS | 0 | s | 入るときの開始位置 |
| bgm`<Id>`GainDb | 0 | dB | 正規化後の微調整 |
| bgmTargetRmsDb | −20 | dB | 正規化の目標 |
| bgmLoopXfadeS | 2.0 | s | ループの重ね |
| bgmDecodeRateHz | 32000 | Hz | 展開の周波数 |
| bgmDecodedMaxCount | 3 | 曲 | |
| bgmWaitMaxS | 4 | s | |
| bgmCombatOffHoldS / bgmMinHoldS | 4 / 6 | s | |
| bgmFallbackSynthEnabled | false | — | 5.8 |

- 依頼者が曲を置いたら、実装AIが `?debug=1` の「BGM」欄で ループ点・テンポ・小節頭を測り、この表に書く。欄の機能：曲の選択、再生位置のつまみ、「継ぎ目を聴く」（loopEndS の4s前から、つないで loopStartS の4s後まで）、メトロノームのクリックを重ねる（テンポと小節頭の確認）、「値をコピー」。

### 5.8 ファイルが無いときの仮BGM（任意・簡素）
`bgmFallbackSynthEnabled` が真のときだけ。explore：正弦6音（A4・B4・E5・F♯5・A5・B5）を各−30dB、8sで膨らみ8sで引く持続音。battle と boss1：odaiko を96BPM の型「D...d.d.D...dddd」（16分、D＝odaiko(60)、d＝odaiko(90) の−6dB）。boss2：同じ型を120BPM＋8分の当り鉦（clang(3200) の0.08s版 @−20）。他の曲は無音。

---

## 6. BGM 発注書（Gemini・Lyria 3 Pro 用）

### 6.1 全曲に共通の約束
- 歌・声・語り・ハミング・掛け声は一切なし（インストゥルメンタル）。
- 主音は全曲 D（レ）。探索・戦闘・ボスは都節音階（D・E♭・G・A・B♭）、結果は陽音階（D・E・G・A・B）。同じ主音なので切り替えても濁らない。
- テンポは比が簡単な数にする：探索72 ↔ 戦闘96（3:4）、ボス第1 96 ↔ 第2 120（4:5）。
- 長さは約2分（メモリのため。3分にしない）。4/4拍子、テンポは最初から最後まで一定。
- 冒頭に無音・長い前奏を入れない。最後はフェードアウトせず、「ジャーン」と終わらず、1小節目へ戻れる形で小節の切れ目で終える。
- 波・風・鳥などの効果音は入れない（ゲームが別に鳴らす）。
- 原作の名前・作曲者名・アーティスト名は書かない（楽器と情景だけで描く）。
- 同じ指示でも毎回違う曲ができ、対話での手直しはできない。**各曲3〜5回作って一番良いものを選ぶ**。

### 6.2 曲ごとの仕様
| 曲ID | 長さ | テンポ | 調 | 楽器 | 雰囲気 | 構成 |
|---|---|---|---|---|---|---|
| title | 約2分 | 60 | D 都節 | 尺八、箏、遠い大太鼓（4小節に1打） | 霜月の夕暮れの岬、霧、静けさ、品 | 主題16小節→展開8→主題の変奏8 |
| select | 約1分30秒 | 72 | D 都節 | 箏のアルペジオ、締太鼓（弱く）、篠笛 | 出発前の静かな決意 | 主題8→応答8→主題8 |
| explore | 約2分 | 72 | D 都節 | 笙の持続和音、篠笛の旋律（間を多く）、箏の点描 | 夕刻の浜と岩の丘、少し不穏、余白 | 持続の上で旋律が現れては消える。旋律16→間8→旋律16 |
| battle | 約2分 | 96 | D 都節 | 大太鼓・締太鼓の合奏、篠笛の鋭い旋律、三味線の強い撥 | 緊迫、疾走、祓いの戦い | 太鼓の型8→笛の主題16→太鼓の変化8→主題16 |
| boss1 | 約2分30秒 | 96 | D 都節 | 大太鼓の重い連打、低い尺八、琵琶の撥の打撃、低い鉦 | 巨大な岩の神、重く荘厳 | 重い型8→主題16→間8→主題の変奏16→重い型8 |
| boss2 | 約2分 | 120 | D 都節 | 当り鉦の速い刻み、締太鼓の連打、篠笛の高音、琵琶のかき鳴らし | 怒りと崩壊、切迫 | 刻み8→主題16→激化16→主題8 |
| result | 約1分30秒 | 72 | D 陽音階 | 箏、笙の澄んだ和音、鈴、篠笛のおだやかな旋律 | 浄化、夕日、安堵 | 主題8→展開8→主題8 |

### 6.3 Gemini に貼る指示文（そのままコピー）

**title**
```
インストゥルメンタルのみ。歌声・語り・ハミング・掛け声は一切入れないでください。
日本の伝統楽器による、和風アクションゲームのタイトル画面の音楽。
情景：霜月の夕暮れ、霧のかかった海辺の岬。遠くに古い鳥居と、海に沈む大きな夕日。
雰囲気：静か、神秘的、少し寂しく、品がある。
楽器：尺八（息づかいの多い長い音）、箏（まばらなアルペジオ）、遠くで鳴る低い大太鼓（4小節に1回だけ）。洋楽器・ドラムセット・シンセサイザーは使わない。
テンポ60BPM、4/4拍子、レ（D）を主音とする都節音階（レ・ミ♭・ソ・ラ・シ♭）。長さは約2分。テンポは最後まで一定。
構成：1拍目からすぐ本編を始める（無音や長い前奏なし）。主題16小節→展開8小節→主題の変奏8小節。
終わり方：フェードアウトせず、最後の一撃で終わらせず、同じ音量・同じ楽器のまま小節の切れ目で終え、冒頭へ自然にループできるようにする。
波・風・鳥などの効果音は入れない。
```

**select**
```
インストゥルメンタルのみ。歌声・語り・ハミング・掛け声は一切入れないでください。
和風アクションゲームのキャラクター選択画面の音楽。三人の祓い手から一人を選ぶ場面。
雰囲気：出発前の静かな決意、ほのかな高揚。
楽器：箏のアルペジオ、弱く刻む締太鼓、篠笛の短い旋律。洋楽器・ドラムセット・シンセサイザーは使わない。
テンポ72BPM、4/4拍子、レ（D）を主音とする都節音階（レ・ミ♭・ソ・ラ・シ♭）。長さは約1分30秒。テンポは最後まで一定。
構成：冒頭からすぐ始める（無音や前奏なし）。主題8小節→応答8小節→主題8小節。
終わり方：フェードアウトせず、終止の一撃も入れず、小節の切れ目で終えて冒頭へ自然にループできるようにする。
効果音は入れない。
```

**explore**
```
インストゥルメンタルのみ。歌声・語り・ハミング・掛け声は一切入れないでください。
和風アクションゲームの探索中に流れるBGM。何度繰り返し聴いても疲れない、控えめな音楽。
情景：夕刻の砂浜の参道、苔むした岩の丘、遠くの海。土地が穢れていて、少し不穏。
雰囲気：静か、余白が多い、神秘的、少し不安。
楽器：笙の持続する和音（ゆっくり膨らんでは引く）を土台に、篠笛の旋律が間を空けて現れては消える。箏が時々一音だけ鳴る。打楽器はほとんど使わない。洋楽器・シンセサイザーは使わない。
テンポ72BPM、4/4拍子、レ（D）を主音とする都節音階（レ・ミ♭・ソ・ラ・シ♭）。長さは約2分。テンポは最後まで一定。
構成：冒頭から笙の和音が鳴っている（無音なし）。旋律16小節→旋律なしの間8小節→旋律16小節。盛り上がりは作らない。
終わり方：フェードアウトせず、冒頭と同じ笙の和音の状態で小節の切れ目で終え、冒頭へ自然にループできるようにする。
効果音は入れない。
```

**battle**
```
インストゥルメンタルのみ。歌声・語り・ハミング・掛け声は一切入れないでください。
和風アクションゲームの戦闘中のBGM。妖怪の群れと戦う場面。
雰囲気：緊迫、疾走感、力強い、祓いの戦い。
楽器：大太鼓と締太鼓の合奏（途切れない力強いリズム）、篠笛の鋭い旋律、三味線の強い撥の刻み。洋楽器・ドラムセット・エレキギター・シンセサイザーは使わない。
テンポ96BPM、4/4拍子、レ（D）を主音とする都節音階（レ・ミ♭・ソ・ラ・シ♭）。長さは約2分。テンポは最後まで一定。
構成：1拍目から太鼓が全力で始まる（無音や静かな前奏なし）。太鼓の型8小節→笛の主題16小節→太鼓の変化8小節→主題16小節。
終わり方：フェードアウトせず、終止の一撃も入れず、太鼓の勢いのまま小節の切れ目で終え、冒頭へ自然にループできるようにする。
効果音は入れない。
```

**boss1**
```
インストゥルメンタルのみ。歌声・語り・ハミング・掛け声は一切入れないでください。
和風アクションゲームのボス戦（前半）のBGM。注連縄を巻いた巨大な岩の神が、夕日を背に浮かぶ岬の岩舞台で戦う。
雰囲気：重い、荘厳、威圧的、古い神への畏れ。
楽器：大太鼓の重い連打、低く唸る尺八、琵琶の撥の強い打撃、低い鉦。洋楽器・ドラムセット・シンセサイザーは使わない。
テンポ96BPM、4/4拍子、レ（D）を主音とする都節音階（レ・ミ♭・ソ・ラ・シ♭）。長さは約2分30秒。テンポは最後まで一定。
構成：1拍目から重い太鼓で始める（無音や前奏なし）。重い型8小節→主題16小節→間8小節→主題の変奏16小節→重い型8小節。
終わり方：フェードアウトせず、終止の一撃も入れず、小節の切れ目で終え、冒頭へ自然にループできるようにする。
効果音は入れない。
```

**boss2**
```
インストゥルメンタルのみ。歌声・語り・ハミング・掛け声は一切入れないでください。
和風アクションゲームのボス戦（後半・最終局面）のBGM。岩の神の注連縄が切れ、穢れの亀裂が走り、怒り狂う。
雰囲気：切迫、激しい、崩壊、最後の決戦。
楽器：当り鉦の速い刻み、締太鼓の連打、大太鼓、篠笛の高音の叫ぶような旋律、琵琶の激しいかき鳴らし。洋楽器・ドラムセット・シンセサイザーは使わない。
テンポ120BPM、4/4拍子、レ（D）を主音とする都節音階（レ・ミ♭・ソ・ラ・シ♭）。長さは約2分。テンポは最後まで一定。
構成：1拍目から鉦と太鼓の刻みで始める（無音や前奏なし）。刻み8小節→主題16小節→激化16小節→主題8小節。
終わり方：フェードアウトせず、終止の一撃も入れず、勢いのまま小節の切れ目で終え、冒頭へ自然にループできるようにする。
効果音は入れない。
```

**result**
```
インストゥルメンタルのみ。歌声・語り・ハミング・掛け声は一切入れないでください。
和風アクションゲームのステージクリア後の結果画面の音楽。穢れが祓われ、岬が清められた。
情景：澄んだ夕日、静かな海、清らかな空気。
雰囲気：浄化、安堵、あたたかい、晴れやか。
楽器：箏、笙の澄んだ和音、小さな鈴、篠笛のおだやかな旋律。洋楽器・ドラムセット・シンセサイザーは使わない。
テンポ72BPM、4/4拍子、レ（D）を主音とする陽音階（レ・ミ・ソ・ラ・シ）。長さは約1分30秒。テンポは最後まで一定。
構成：冒頭からすぐ始める（無音や前奏なし）。主題8小節→展開8小節→主題8小節。
終わり方：フェードアウトせず、終止の一撃も入れず、小節の切れ目で終え、冒頭へ自然にループできるようにする。
効果音は入れない。
```

### 6.4 候補の選び方（依頼者のチェックリスト）
各曲3〜5本を聴き、全部「はい」のものから好みで1本選ぶ。
1. 声（歌・ハミング・掛け声・ささやき）が一度も入っていない。
2. 最初の1秒から音が鳴っている（無音・長い前奏が無い）。
3. 最後がフェードアウトしていない。「ジャーン」で終わっていない。
4. 手拍子をしながら最後まで聴いて、テンポが途中で変わらない。
5. 途中で急に音量が大きく／小さくならない。
6. ドラムセット・エレキギター・ピアノ・シンセの音が目立たない。
7. 音が割れていない、こもっていない。
8. 探索・結果の曲は、3回続けて聴いても疲れない。
9. 戦闘曲を探索曲のすぐ後に聴いて、雰囲気が自然につながる（ボス第1→第2も同様）。
10. 置いた後、ゲームの `?debug=1` の「継ぎ目を聴く」で、つなぎ目の違和感が小さい（違和感があれば、気になる秒数をメモして AI に伝える）。

---

## 7. ファイルをリポジトリに置く手順（依頼者向け）
1. Gemini で選んだ曲をダウンロードする。
2. 拡張子を確かめる。`.m4a` か `.mp3` なら、ファイル名を曲ID（`title` `select` `explore` `battle` `boss1` `boss2` `result`、半角小文字）に変える。例：`explore.m4a`。
3. GitHub でリポジトリを開き、`public` → `audio` → `bgm` のフォルダへ進む。
4. 右上の「Add file」→「Upload files」。ファイルをドラッグして入れる（1つ25MBまで）。
5. 下の「Commit changes」で「Commit directly to the main branch」を選び、緑のボタンを押す。数分で公開版に反映される。
6. `.m4a`・`.mp3` 以外（`.wav` や動画の `.mp4` など）だった場合：リポジトリ直下の `assets-raw/bgm/` に曲IDの名前で置き（例 `explore.wav`）、次の作業で Claude に「BGMの変換をして」と頼む（AI が ffmpeg で `-vn -c:a aac -b:a 160k -ar 48000` の `.m4a` にして `public/audio/bgm/` に置く）。`assets-raw/` は公開されない。
7. 置いたら Claude に「BGMを置いた」と伝える。AI が5.7のループ点・テンポを測って設定する。
- 差し替えは同じ名前でもう一度アップロードするだけ。曲を外すときはファイルを消す（無音で動く）。

---

## 8. イベント→音（`audio/router.js`。名前は 09 3.1 の正本）
| SimEvent | 音 |
|---|---|
| swing | 主人公：heavy で swingHeavy、他 swingLight。敵：3.3 の表（唐笠・ボス） |
| hit | 段別の命中＋属性の層（＋sealedLayer）、`pos` で定位 |
| guard | guard |
| kill | kill |
| telegraph | glyph 'geki'→teleGeki、'e'→teleE、'fuu'→teleFuu、null→なし。＋敵の声（3.3） |
| projectileSpawn | 主人公の矢→bowShot、一穴は fuCast で鳴らすので無し。灯魂→「ポッ」 |
| projectileEnd | reason 'mamori' → projBlocked。他は無し |
| mikiri | mikiri ＋ worldFx |
| dodge | step→dodgeStep、airDash→airDash、flip→flip |
| jump / land / footstep | jump / land / footstep（主人公のみ） |
| kekkaiPlace / kekkaiTrapTrigger / kekkaiBreak / kekkaiCharge / kekkaiFail | kekkaiPlace（trap で罠の音）/ kekkaiTrap / kekkaiExpire（fuhou 以外）/ kekkaiCharge / kekkaiFail |
| fuhou | fuhou ＋ ダッキング |
| ougiCharge | stage 0〜3 → ougiCharge0〜3 |
| ougiCancel | ougiCancel |
| ougiRelease | ougiRelease1〜3 ＋ ダッキング |
| fuStart / fuStroke / fuCast / fuCancel | fuStart＋worldFx / fuStroke(index) / fuCast(kind)＋worldFx を戻す / fuCancel＋worldFx を戻す |
| eikiSpawn / eikiPurify / ekakuBreak | eikiSpawn / eikiPurify / ekakuBreak |
| infect | on→infectOn、off→infectOff |
| esekiBreak | esekiBreak |
| tamakakePickup | tamakake(chain) |
| gaugeStage | gaugeStage(stage) ＋ BGM の色調（5.6） |
| bossGateOpen | gateOpen |
| ryuketsuEnter / ryuketsuDeplete | ryuketsu(relation) / ryuketsu deplete |
| buff | on の sei は fuCast で鳴らす。off → buffEnd。ryuketsuCurse on → ryuketsu curse |
| playerHurt | flinch→hurtFlinch、down→hurtDown |
| playerSealed | on → teleFuu を pan 0 で |
| playerDeath | death ＋ BGM を消す |
| seaFall / respawn | seaFall / respawn（reason retryBoss は BGM の5.5。restart・retryCheckpoint は explore を先頭から） |
| zoneEnter | 環境音の配合（4章） |
| lockOn | targetId が数値なら uiLock |
| combatMode | BGM の切替（5.5）＋ busAmb |
| bossIntro / bossPhase / kanameBreak / bossDefeat | 3.3 の表 ＋ BGM（5.5）。bossDefeat はダッキング |
| kuzushi | on のとき 3.3（面鬼・ボス） |
| stageClear | 無し（結果画面で result） |
| gaugeChange / ryuketsuExit / checkpoint / camReset / hitRevoked / esekiHit / tutorialStep | 無し |

- `kekkaiFail`・`hitRevoked`・`esekiHit`・`buff.kind='mamori'`・`telegraph.moveId` は 09 で追加済み。ボス技の発動の音は `swing.moveId` で `bossMoveSfx`（3.3、04の技ID）を引く。`kekkaiFail` の理由（trapLimit・cooldown・noCharge・range）で音は変えない。

- `audio.update(view)` から：心音（hpRatio<0.25 で開始、≥0.28 で停止）、敵の待機の声、唐笠の下駄、ボスの岩の擦れ、定位の聞き手。
- UI（`audio.ui(id)`）：決定 uiConfirm、戻る uiBack、項目の移動 uiMove、朱印の表示 uiStamp。

---

## 9. config 表（`src/config/audio.js`。上記の表に無いもの）
| configキー | 値 | 単位 | 説明 |
|---|---|---|---|
| lowHpOnPct / lowHpOffPct / lowHpFastPct | 25 / 28 / 10 | % | 心音の開始・停止・速くなる境 |
| heartbeatBpm / heartbeatFastBpm | 70 / 90 | bpm | 心音の速さ |
| enemyVoiceRangeM | 15 | m | 敵の声が届く距離 |
| inuGrowlMinS / inuGrowlMaxS | 3 / 6 | s | 穢狗の唸りの間隔 |
| tomoshiRustleMinS / tomoshiRustleMaxS | 4 / 8 | s | 灯魂の擦れの間隔 |
| karakasaGetaS | 0.35 | s | 下駄の間隔 |
| bossGrindMaxDb / bossGrindFullMps | −14 / 2 | dB / m/s | 岩の擦れ |
| offscreenPanMul / offscreenBoostDb | 0.9 / 3 | 倍 / dB | 画面外の予兆 |
| ambWaveDb / ambWindDb / ambTobiDb | 0 / −4 / −14 | dB | 環境音の層（busAmb の中） |
| ambZoneFadeS | 3 | s | 区画の切替 |
| tobiMinS / tobiMaxS | 20 / 40 | s | 鳶の間隔 |
| gustMinS / gustMaxS / gustDb | 6 / 12 / 6 | s / s / dB | 突風 |
| bgmPurityLpHz0〜bgmPurityLpHz4 | 4000 / 6000 / 9000 / 14000 / 20000 | Hz | 5.6 |
| bgmPurityShelf4Db / bgmPurityRampS | 2 / 3 | dB / s | 5.6 |
| bgmBossIntroDelayS | 0.8 | s | 咆哮の後に boss1 |
| bgmUnsyncedXfadeS / bgmCombatOffXfadeS | 1.5 / 4 | s | 5.5 |
| bgmSchedulerTickS / bgmScheduleAheadS | 0.25 / 1.0 | s | 5.4 |

- 3.1・3.2・3.3 の各数値（周波数・長さ・音量）は `sfxRecipes` として同じファイルの1つの表に入れる（09 の数値の直書き禁止に従う）。キーは `<音ID>` ごとの入れ子で、09 の configKeys 検査の対象外の「data 的な表」とする（下の提案3）。

---

## 10. 受け入れ基準（自動）
Node（純関数）：
1. `routeEvent` に 8章の各イベントを1つずつ渡す → 表どおりの音ID（全行一致）。
2. `routeEvent(hit{heavy:false, hitstopF:7/8/12})` → hitLight / hitMid / hitHeavy。
3. `routeEvent(hit{affinity:'dis'})` → 属性の層を含まない。
4. 声の割り当て：同じtickに優先1の音を30個 → 鳴る数24。続けて優先3を1個 → 鳴る（最古の優先1が止まる）。
5. 優先3が24声のとき優先1を1個 → 捨てられる。
6. 同じ音IDを 0.02s 差で2回 → 1回。0.04s 差 → 2回。
7. 音程の倍率を1000回 → すべて 0.95〜1.05、「固定」の音は1.000。
8. 小節頭：tempoBpm 72・beatOffsetS 0・p=10.0s → 次の小節頭 13.333s（±0.001）。p=13.30 → 16.667s（0.05s 未満の待ちは次へ）。
9. ループの予定：長さ120s・loopStartS 3.75・loopEndS 116.25・X 2・後ろの余り3.75s → 方法1、新区間の開始＝旧の loopEndS 到達時刻（±0.001s）。
10. 自動のループ点：先頭0.5s・末尾1.0sが無音の試験信号 → loopStartS 0.5±0.01、loopEndS＝長さ−1.0±0.01。
11. 正規化：RMS −30dBFS の曲 → 倍率 +10dB（±0.1）。−45dBFS → +12dB で止まる。
12. 展開の計画：全場面を順にたどる → 展開済みが3曲を超えない。再生中の曲は捨てない。
13. 無音WAV の生成 → 8044バイト、先頭 'RIFF'・8バイト目から 'WAVE'。
14. 心音：hpRatio 0.24 → 開始、周期 0.857s（±0.001）。0.27 → 続く。0.29 → 停止。0.09 → 周期 0.667s。
15. 定位：真右・画面外の予兆 → pan 0.9（±0.01）。正面 → |pan| ≤0.01。

Playwright（`?test=1&audio=1`。提案2）：
16. 「音を出して遊ぶ」をタップ → 1s以内に `ctx.state === 'running'`。
17. 「音なしで遊ぶ」 → master の値 0、`/audio/bgm/` への要求0件。
18. hidden を発火 → `'suspended'`。続く `pointerup` → 0.5s以内に `'running'`。
19. ctx を `suspend()` で止める（soundOn） → 音の帯が出る。帯をタップ → `'running'`、帯が消える。
20. BGM ファイルが無い状態で起動〜ボス撃破のリプレイ → console.error 0、各曲の状態 `missing`、例外0。
21. 壊れたファイル（中身が乱数）を返す → `error`、console.error 0。
22. 試験用の短い曲（10s・96BPM のクリック）で `combatMode` on → battle の音量が2小節＋0.1s以内に1.0（±0.02）、explore が0。
23. `combatMode` off→2s後に on → battle のまま（explore の音量0のまま）。
24. `ougiRelease` → 0.1s後の bgmDuck −5±0.2dB、1.2s後 0±0.2dB。
25. `fuStart` → 0.2s後 worldFx 800Hz（±10）。`fuCast` → 0.2s後 20000Hz（±10）。
26. `gaugeStage` 4 → 3.1s後、explore の遮断 20000Hz（±10）。
27. `OfflineAudioContext` で 3.2 の全音IDを1つずつ鳴らす → 頂点 −20〜−0.5dBFS、NaN 0、最後の10msが −60dBFS 未満。
28. 残響のインパルス応答 → 長さ 1.812s（±1標本）、1.7s 付近の音量が先頭比 −50dB 以下。
29. `followMuteSwitch` を真に（`audioSession` を偽物に差し替え） → `type==='ambient'`、無音WAV要素が paused。

## 11. 依頼者が実機で確かめること
1. iPhone のマナーモード（消音スイッチ）を**オン**にして「音を出して遊ぶ」 → 音が鳴るか。**オフ**でも鳴るか。設定の「消音スイッチに従う」をオンにすると、マナーモード中は鳴らなくなるか。
2. ゲーム中にホーム画面へ戻り、また開いて画面をタップ → 音が戻るか。電話や通知の後も戻るか（戻らなければ上の帯「音を有効にする」が出るか）。
3. BGM を置いた後、探索→戦闘→探索、ボスの前半→後半の切り替わりが自然か。曲の継ぎ目で途切れたり音が飛んだりしないか。
4. 効果音・BGM・環境音の大きさのバランス（BGMが効果音を消していないか、予兆の音が聞こえるか）。
5. 「音なしで遊ぶ」で、予兆の矢印の点滅などで不便がないか。

## 12. coreへの変更提案
> 処理済み（core v0.3／09 v1.1）：1 は core 11・D48 に採用。2 は 09 10.1・10.2 に採用。3 は core 0章と 09 2章8に採用（D61）。4 は 09 1.1 に採用。5 は 01 を修正済み。
1. **11章の「音：Web Audioの合成のみ」を「効果音・環境音は Web Audio の合成。BGM は依頼者が生成した音声ファイル（`public/audio/bgm/`、無くても無音で動く）」に変更**。D42 も同様に。理由：依頼者の決定。外部ファイル不使用の前提の例外は BGM のみとする。
2. **09 の `?test=1` は音を無効にするが、`&audio=1` で音を有効にできるようにする**（Chromium は `--autoplay-policy=no-user-gesture-required`）。`window.__game.audio()` に `{state, voices, lastSounds[], busDb, bgm:{track, state, gains}}` を足す。理由：10章の試験に必要。
3. **0章の単位接尾辞に `Bpm` を足す**（09 の提案P2 の `Hz`・`Db`・`Count` に加えて）。効果音の合成レシピ `sfxRecipes` は周波数・長さの数が多いため、`config/audio.js` 内の入れ子の表とし、キーの接尾辞検査の対象外にする。理由：音楽のテンポに当てはまる接尾辞が無い／レシピを1値1キーにすると数百キーになり読めない。
4. **09 1.1 の `public/` に `audio/bgm/`（.gitkeep）、最上位に `assets-raw/`（公開しない変換前の置き場）を足す**。理由：7章の手順。
5. **01 の `uLowHp`** は07 の紙墨パスに無い。07 の `uInk`（低HPで0.35）に統一する（01の修正）。理由：同じ効果に2つの名前がある。
