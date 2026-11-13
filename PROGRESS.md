# 進捗
## 現在のM：M0a 土台（ブランチ claude/affectionate-bohr-2n6fyg）— 完了。次は M0b

## 済み
M0a（受け入れ基準：09受1〜10・13・17〜20・22・23、01受27、M0a-1〜3）
- [x] 雛形：package.json（依存4つ・版固定）、vite・tsconfig・Playwright の設定、index.html、manifest・icon、CI（`.github/workflows/deploy.yml` と控え `docs/ci/deploy.yml`）（`deps.test › fourDeps`・`pinnedVersions`、`basePath.test › basePathBuild`＝09受4・22）
- [x] 時計：実tickと局所時間、倍率は掛け算で 1/4096 に丸め、変更は次のtickから（`time.test › scaleProduct`＝09受10、`hitstopRealTicks`＝09受9、`worldMulNextTick`、`localFExact`）
- [x] ループ：60Hz 固定、1描画で最大5tick、一時停止中は進めない（`loop.test › maxFiveTicks`＝09受8、`pausedNoTicks`）
- [x] 乱数・ハッシュ・決定論（`rng.test`、`hash.test`、`replay.test › sameSeedSameHash`＝09受7、`replay m0_walk`、e2e `boot.spec › replayMatchesNode`＝Node とブラウザで同じハッシュ）
- [x] 保存：`tokoyo:` 名前空間・版・移行・壊れたデータの退避・引き継ぎ文字列（`saveSchema.test › noVersionToBak`＝09受17、`handoffRoundTrip`＝09受18、`migrationChain`、e2e `noVersionSaveToBak`）
- [x] 設定の仕組み：ConfigTable → cfg、単位の接尾辞の検査（`config.test`、`configKeys.test › unitSuffix`）
- [x] 不変条件の検査群（09受3）：`forbidden.test`（`detectsMathRandom` ほか）、`imports.test › layerDirections`、`literals.test`（数値・色・絶対パス）
- [x] 型：`src/data/types.js` に 09 3章・3.1 と 07 6.1 の型を全部写した
- [x] シム：試験場（床と開始点）、仮の移動（走り 6.5m/s の等速）、仮のカメラ（後方5m・高さ1.5m、camDeg で回る）（e2e `walkForward`＝09受13、`cameraTurnAndPitch`、`stepSixty`＝09受6、`testModeNoLoop`＝09受5）
- [x] 入力：キーボード（01 2.12）と合成入力（`keyboard.test › stickDiagonal`＝01受27、`shortTap`、`ougiSlide`）
- [x] 描画：灰色の床＋1m格子、単色のカプセル。描画命令は2（e2e `budget.spec › drawCallBudget`＝09受20、`sandbox300`＝09受19、`qualityParam`＝M0a-2、`normalLoopRuns`＝M0a-1）
- [x] デバッグ：`window.__game`（`?test=1`）、数値表示と調整パネル（`?debug=1`。e2e `debugPanelCopy`＝09受23）
- [x] verify：`npm ci`＋`verify:fast` 4秒、`npm run verify` 13秒（単体89件・e2e 24件・縮小一覧。09受1・2）
- [x] M0a-3：push 後の CI の check ジョブが成功（型検査・単体テスト・ブラウザ試験。deploy は main だけなので作業ブランチではスキップ）

### スクリーンショットの確認（M0a の8枚。sheet.png・sheet_gray.png）
1. 起動直後：合格（床が下半分、カプセルが中央下、格子が見える）
2. 60tick 前進：合格（6.5m 進み、カメラが追う）
3. yaw +90°：合格（床の端の向きが変わり、回ったことが分かる）
4. 縦角60°：合格（見下ろし。南の端の手前に置いたので床の端が見える）
5. `?debug=1`：合格（60fps・描画命令2・tick・パネルの文字が読める）
6. 667×375：合格（欠けなし）
7. 932×430：合格（欠けなし）
8. `q=low`：合格（絵は同じで粗いだけ）

## 次
- [ ] M0b 入力層・ブラウザ対策・タイトルと音の起動（`docs/10_milestones.md` §M0b）
  - M0a から送ったもの：なし（調整パネルも M0a で作った）
  - M0b で使う入口：`src/input/keyboard.js` の `build()` と同じ形でタッチの collector を作り、`app/boot.js` の `loop.tick` で合成する。`__game.layout` は M0b で中身を入れる

## 既知の問題
- 公開URL（GitHub Pages）は main に merge してから反映される。404 のときは Settings → Pages → Source が「GitHub Actions」かを確認（SETUP_GUIDE A3）

## 依頼者に聞くこと
- **カメラを回す向き**（設計書の中で書き方が2通りあったため）
  - A：右へ動かす（→キー、M0b 以降は指を右へ）と、**視点が右を向く**（一般的な3Dゲームと同じ）
  - B：右へ動かすと、視点が左を向く（カメラの位置が右へ回る）
  - 推奨は A。A で作ってあります。M0b でタッチ操作が入ったときに実機で違和感があれば、設定の「左右反転」（01 6.1 の `camInvertX`）で逆にもできます。

## 決めたこと（設計書に具体値が無かった部分）
- 向きの内部表現：角度は全部 `F=(sin yaw, 0, cos yaw)`（05 1.1）にそろえた。入力の `camDeg[0]`（右+）はカメラの yaw から**引く**（`sim/camera.js`）。縦は `camDeg[1]` を足す（上から見下ろす向きが＋）
- 仮の値（後のMで本物に置き換える）：`collision.m0CapsuleRM/HM`（0.35／1.7＝楓真と同じ）、`camera.camNearM/camFarM`（0.1／400）、`debug.gray*`（灰色の表示の色・格子）。プレイヤーの HP は仮に1
- M0a の一覧に無かったが、数値を直書きしないために足した設定キー：`camera.camExploreDistM`・`camExplorePivotHM`・`camFovYDeg`（02 9.2 の値）、`quality.drawCallMaxCount`（09 8.9）、`input.refViewPx`（[844,390]。合成入力の画面サイズの既定と e2e の視点）、`debug.eventRingCount`・`fpsWindowS`・`overlayRefreshS`
- `src/config/index.js`：全部の表の一覧（ここだけ config 同士を import する。`imports.test` は「同じ層の中」は許可）
- `__game.renderInfo()` に `pixelRatio` と `quality` を足した（budget.spec と M0a-2 が読む）
- 引き継ぎ文字列の検査値（CRC32）は base64url の文字列に対して計算（どの1文字を変えても確実に拒否するため）
- 壊れた保存は `.bak` に写したあと元を消す（次の起動で `.bak` を上書きしないため）
- 引数なしで開いたときの場面は試験場（タイトルが入る M0b まで）
- 格子は床のシェーダーで描く（描画命令1つ。遠くは床の色へ溶かしてちらつきを防ぐ）
- 撮影：4枚目は床の端が入るように南の端の手前（30,0,55）へ移してから見下ろす。5枚目だけは通常のループで撮る（FPS は実際に回さないと出ないため）
- キーボード：符の構え中のキー（1〜5・Enter・Esc）は符を作る M2.5 で足す。P／Esc は今はループを止めるだけ（メニューは M10a）
- 追加したテスト補助：`tests/unit/basePath.test.js`（09受22）、`tests/unit/helpers/`、`tests/replays/runner.js`
- テストの期待値は config・data から計算。設計書の数字そのものを確かめるテストは名前の先頭に `[検算]`（調整で値を変えたら、そこだけ直す。`config.test › [検算] docValues` など4件）

## PR本文
題名：M0a: 土台（雛形・CI・時計・乱数・保存・灰色の床）

説明：
- ゲームの土台を作りました。毎秒60回の更新、2つの時計、種つきの乱数、状態のハッシュ、保存（引き継ぎ文字列つき）、設定の仕組みです。
- 画面には灰色の床（1m の格子）と棒（カプセル）が出ます。PC のキーボード（WASD・矢印）で動きます。指の操作は次の M0b です。
- 設計の約束（数値は config だけ、シムは時刻・乱数・画面を知らない、依存は4つ、など）を自動で検査するテストを入れました。
- `?debug=1` で数値表示と調整パネル、`?test=1` で自動テスト用の入口が使えます。
- GitHub Actions の設定を入れました（main に merge すると公開URLへ自動で反映）。

verify 結果：`npm run verify` 成功（型検査・単体テスト89件・ブラウザ試験24件・スクリーンショット8枚、合計13秒）。コンソールのエラー0件。GitHub Actions の check も成功。

依頼者が試すこと（merge して数分後）：
https://sy-claude.github.io/tokoyo/
1. 公開URLをスマホで開き、横向きにして、灰色の床と棒（カプセル）が見えるか。まだ指では動きません。
2. URL の最後に `?debug=1` を付けて開き、右上に数字が出るか。出た画面のスクリーンショットを送ってください。
3. GitHub の「Actions」タブで、緑のチェックが付いているか。

依頼者に判断を求める点：
- カメラを回す向き。A＝右へ動かすと視点が右を向く（推奨・この形で作成済み）／B＝逆。M0b で指の操作が入ってから実機で決めれば十分です。
