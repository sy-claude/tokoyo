# 進捗
## 現在のM：M1a キャラの見た目（トゥーン・輪郭・剛体スキン）— **途中で中断**（ブランチ claude/dreamy-mendel-jivs5s。依頼者の指示で途中のまま保存）
- 次のセッションは「§M1a の続き」として始める（新しいMに進まない）。残りは下の「次」。
- この時点の検査：`npm run verify:fast` 成功（型検査・単体165件・ビルド）。**ブラウザ試験（e2e）と撮影8枚は未実施**（`npm run verify` を通していない）。

## 済み
M1a（途中。受け入れ基準：07受5・6・7・8・25、09 §2 の7、M1a-1・2）
- [x] config：`palette`（07 2章の全表）、`render`（07 3.1・3.3・4章・10.2 の使う行）、`anim`（07 6.5・6.6・6.8）
- [x] data：`rigs/fuma.js`（骨34本・部品・ばね15本・長巻・待機の姿勢）、`rigs/shapes.js`（押し出しの断面）、`rigs/faces.js`、`characters.js`（楓真の見た目の欄だけ）、`validate.js` に `validateRig`・`validatePoseJoints`・`poseableBones`
- [x] render：`renderer.js`（07 3.1 の形）、`warmup.js`、`materials/{toon, outline}.js`、`rig/{buildRig, pose, springs, face}.js`、`actors/playerView.js`、`stage/light.js`、`frame.js`（カプセルを楓真に置き換え。床は灰色のまま）
- [x] 単体テスト（全部成功）：`rig.test`（`skinnedMeshCount`＝07受5・不変条件7、`skinWeightOne`＝07受6、`outlineSharesBones`＝10 §M1a のリスク、`poseAtPure`＝不変条件7、`poseJointNames`＝07受7、`idlePose`、`springStep`、`springsFollowAccel`、`breeze`、`[検算] boneTable` ほか）、`palette.test`（`allKeysParse`＝07受8、`[検算] docValues`・`fumaColors`）、`outlineWidth.test`（`clamp`＝M1a-1、`formula`、`nearKeepsWorldWidth`、`shaderInjection`）、`toon.test`（階調・光の向き・顔アトラスの uv）
- [x] リプレイ `m1a_orbit`（立ったままカメラで一周 → 少し走って止まる、360tick）。m0_walk・m0b_touch のハッシュは変わらず
- [x] 手で確かめたこと（開発サーバ＋ヘッドレスのブラウザで撮影）：試験場に楓真が立つ。描画命令5（床1＋本体2＋武器2）、プログラム3で事前コンパイルの後に増えない、コンソールのエラー0件
- [ ] **未実施**：`tests/e2e/warmup.spec.js`（書いただけで未実行。07受25・M1a-2・07受5 のブラウザ側）
- [ ] **未実施**：`tests/e2e/shots.spec.js` を M1a の8枚に置き換える（今は M0b の8枚のまま）。縮小一覧の確認と合否の記録
- [ ] **未実施**：`npm run verify`（e2e 全部）。前のMの e2e（boot・budget・touch・guards・audioUnlock）が今の描画で通るかも未確認

M0b（受け入れ基準：01受1・3〜18・26・28〜30、09受11・12・14〜16・21、08受13・16〜19、M0b-1〜3）
- [x] 配置：`input/layout.js`（computeLayout・hitTest・扇・左利き・自動縮小）。`layout.test`（`refPositions`・`[検算] refPositions の値`＝01受1、`allSizesFit`＝01受3、`refHitNoOverlap`＝01受4、`h320HitNoOverlap`＝09受16、`deviceScale`＝01受5、`hitTestRandom`＝01受6、`leftHanded`＝01受7、`scale150`＝01受8）。星の点も計算（01受2 は `[検算] starPoints` で先に確認。描く処理は M2.5）
- [x] 指の役割：`input/pointerRouter.js`（スティック・カメラ・ボタン・攻撃→カメラ・奥義→回避・取消扱い・4本まで）、`input/gestures.js`（タップ・はじき）、`input/collector.js`（InputFrame。押下は1tick目だけ、camDeg を n 等分、短いタップ、ageF、静かな解放）。`collector.test`（`stickHybrid`＝01受9、`stickKeptOnResize`＝01受10、`attackDragCamera`＝01受11、`ougiCancelZone`＝01受12、`ougiSlideToDodge`＝01受13、`ougiBlur`＝01受14、`stickCancel`＝01受15、`touchCancelAll`＝09受15、`twoFingers`＝09受14、`multiTick`＝01受26・09受11、`ageF`＝09受12）、`gestures.test`（`tapLimits`＝01受16、`tapClearance`＝01受17、`flick`＝01受18）
- [x] ブラウザ対策：`index.html`（01 8.1 の HTML・CSS、#root/#input/#hud/#menus）、`platform/{guards, viewport, wakeLock}.js`（抑止・戻るの番兵・hidden/pagehide/blur・全画面と向き・persist・visualViewport と safe-area）。e2e `guards.spec`（`hiddenPauses`＝09受21、`popstatePauses`＝01受29、`portraitPrompt`＝01受30、`pauseButton`、`menuReleasesFingers`、`suppressed`、`lowHeight`）
- [x] 画面：`ui/{style, buttonsView, hud(音の帯と教示), rotatePrompt}.js`、`ui/menus/{title, devMenu, pause, common}.js`、`app/scenes.js`（title → 試験メニュー → 試験場、一時停止、縦向き・高さ不足の重ね）。`hud.test › hudWritesOnlyTransformOpacity`＝01受28、`buttonsWritesOnlyTransformOpacity`
- [x] 音：`audio/engine.js`（ctx・バス・主音量・確認音「りん」uiRin＝rin(880,1,1.2)@−12 を busUi へ）、`audio/unlock.js`（08 2.1 の1〜6、中断と復帰、無音WAV）、`__game.audio()`。`hud.test › silentWav`＝08受13、e2e `audioUnlock.spec`（`soundOnRunning`＝08受16、`soundOffMuted`＝08受17、`hiddenResume`＝08受18、`soundBand`＝08受19）
- [x] config：`input`（09 5.4＋01 2.11 の全行）、`layout`（01 1.3）、`settings`（01 6.1 の既定値）、`ui`（01 4.4＋音の帯・教示・メニューの寸法）、`camera`（基準感度2行）、`palette`（07 2.1 の UI の5色）、`audio`（08 1.1・1.3・2.2 と sfxRecipes）
- [x] e2e `touch.spec`（`titleToSandbox`＝M0b-1、`stickDrag`＝M0b-2、`devMenuOverlay`＝M0b-3、`twoFingers`＝09受14、`touchCancel`＝09受15、`tapButton`、`cameraDrag`）。補助 `tests/e2e/helpers/touch.js`（CDP のタッチ）
- [x] リプレイ `m0b_touch`（入力層を通したスティックとカメラ、360tick。2本同時・1描画2tick を含む）。m0_walk のハッシュは変わらず
- [x] verify：`npm run verify` 成功 18.0s（verify:fast 2.9s、単体132件、e2e 42件、縮小一覧 8/8）。コンソールのエラー0件

### スクリーンショットの確認（M0b の8枚。sheet.png・sheet_gray.png）
1. タイトル：合格（題字が上寄り中央、2つのボタンが中央下に横並び、「設定」が右下）
2. 試験メニュー：合格（項目は 200×48 以上で指で押せる。選んでいる品質は朱の枠と下線。白黒でも分かる）
3. 試験場 844×390：合格（7ボタンが右下の扇形、一時停止が右上、待機スティックが左下に薄く）
4. 667×375：合格（重なり・欠けなし）
5. 932×430：合格（重なり・欠けなし。注目は safe 矩形の内へ寄せた）
6. 左利き：合格（ボタンとスティックが左右反転、一時停止は右上のまま）
7. 390×844：合格（紙の地に「横向きにしてください」と回る端末の図、回らないときの文）
8. 一時停止：合格（「続ける」「タイトルへ」の2項目、背後は止まった試験場を暗くしたもの）

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

- [x] 依頼者の実機確認（iPhone の Safari・横向き）：公開URLで床とカプセルが表示、`?debug=1` で 59fps（17.0ms）・描画命令2・DPR 1.5、Actions は3回とも緑（main の deploy を含む）

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
- [ ] **§M1a の続き**（この順で）
  1. `npx playwright test tests/e2e/warmup.spec.js` を通す。`normalLoopWarm` は題名ほど確かめていない（canvas の有無だけ）ので、数値表示（`debug/overlay.js`）に programs の数を data 属性で出して、通常のループでも「事前コンパイルの数のまま」を確かめる形に直す
  2. `tests/e2e/shots.spec.js` を 10 §M1a の表の8枚に置き換える。作り方の案：`setConfig('camera.camExploreDistM', 距離)`＋`setInput({camDeg:[向き, 縦]})`＋`step(1)`。正面＝camDeg 180、右横（武器の側）＝−90、背面＝0、斜め上＝距離2・[150, 35]、10m・25m は距離だけ変える。7枚目は背面3mで `step(90)` の後（`playerRig().springs` が t=0 と違うことを状態で判定）。8枚目は `q=low`
  3. `npm run verify` → `sheet.png`・`sheet_gray.png` を見て、8枚の合否をここに書く（白黒版で体が背景より暗いこと）
  4. PR本文を書く（10 §M1a の「依頼者が試すこと」「判断を求める点」）
- M1a から送るもの：技のポーズ由来の揺れ（腕の振りに袖が遅れる動き。今のばねは「キャラ全体の加速度＋そよ風」だけが入力）は M2a〜M3a、歩き・走りのアニメは M2a、白雪・岩丈・敵の顔と造形（`ico`・`tube` の形）は M4a・M9a
- M0b から送ったもの：奥義の「タップ2回」方式（01 2.8。設定画面の M10a で）、使えないボタンの×（M3a〜）、符の構え中の指（fuCancel・draw。M2.5）、振動（各M）、一時停止の「設定」以下の項目（M10a）、タイトルの「設定」（今は押しても何も起きない。M10a）、ホーム画面追加の案内（01 5.9）
- 実機メモ：前回の iPhone は表示領域の高さが約310px（ツールバーあり）。320 未満なので、試験場に入ると1回だけ「ツールバーを隠すと遊びやすくなります」が出る（3秒）

## 既知の問題
- **M1a は e2e 未実施のまま保存した**（上の「次」）。作業ブランチの CI（check ジョブ）は、撮影や前のMの e2e で落ちる可能性がある。main には入れない
- 陰の段がかなり暗い（肌の陰は濃い茶、袴の陰はほぼ黒）。07 3.3 の式どおり（陰段は shadowTint を線形の色で全部掛ける）。撮影を見てから「依頼者に聞くこと」に載せるか決める
- 細い物（刃の幅 3.5cm）は 3m 以上離れると輪郭の墨が勝って暗い線に見える（輪郭 2.6px が両側に付くため）
- ヘッドレスのブラウザには明朝体が無いので、スクリーンショットの文字はゴシックで出る（実機の iPhone はヒラギノ明朝）
- 公開URL（GitHub Pages）は main に merge してから反映される。404 のときは Settings → Pages → Source が「GitHub Actions」かを確認（SETUP_GUIDE A3）

## 依頼者に聞くこと
- **袖・髪・鉢巻の尾の揺れの強さ**（07 6.5 の式の単位が書かれていない）：式のままだと走り出しでも約2°しか揺れず、見えない。A 加速度を20倍にして入れる（推奨・実装済み。`anim.springAccelMul`。走り出しで鉢巻の尾が約35°）／B 弱く（10倍）／C 強く（30倍）
- **立っているときのそよ風**（設計書に無い追加）：待機では揺れの入力が呼吸しか無く、10 §M1a の撮影7（待機1.5秒で袖・髪が揺れている）を満たせない。A そよ風を入れる（推奨・実装済み。`anim.breeze*`。鉢巻の尾が数度ゆれる）／B 入れない（立っている間は動かない）
- **髪の地**（07 6.4 の部品表に無い追加）：髪束5本だけでは後ろから頭皮が見える。A 頭頂〜うなじを覆う墨色の球冠を1つ足す（推奨・実装済み）／B 部品表どおり（後ろ頭に肌が見える）
- **鉢巻の半径**：部品表の 0.142m だと、縦に伸ばした頭と髪が突き抜ける。A 0.147m にする（推奨・実装済み）／B 0.142m のまま
- **顔アトラスのセル番号の食い違い**（07 6.8）：「痛がる顔＝セル番号＋8」だと楓真・白雪・岩丈の痛がる顔が 8・9・10 で、敵の目（8 灯魂・9 唐笠・10 面鬼）と重なる。A 敵の目を 12・13・14 へ移す（推奨。今は楓真だけなので未着手、M4a で決める）／B 痛がる顔を別の行へ
- **楓真の背**：部品表どおりに組むと頭頂は約1.81m（表題の「1.72m」より高い）。部品表を正として組んだ。A このまま（推奨）／B 1.72m になるよう全体を縮める
- **カメラの縦の向き**（設計書に無い）：A 指を上へなぞると視点が上を向く（推奨。今は A）／B 逆。逆にしたい人向けには設定の上下反転（`camInvertY`）
- **大きい画面で注目ボタンが右端からはみ出す**（01 1.2 と 01受3 の食い違い）：A はみ出す分だけ内側へ寄せる（推奨・実装済み）／B 位置にも deviceScale を掛ける（設計の変更）
- お使いのスマホの機種名（M1b の品質の既定と M10b の性能確認に使う）
- （回答済み）ボタンの大きさ：**A そのまま**で確定（M0b の確認時）

## 決めたこと（設計書に具体値が無かった部分）
- **M1a**
  - 型の追加（`data/types.js`。docs は変えていない）：`RigDef.stance`（待機の基本姿勢。関節名→[x,y,z]度）、`SpringDef.restDeg`（ばねの釣り合いの角度 [x,z]＝07 6.5 の式の θ0）、`cap` の dims に伸び `[半径,開き角,sx,sy,sz]`、`extrude` の dims に `[形名,長さ,細り,幅,反り]`
  - 部品の `rotDeg` は「Z ひねり → X 傾け → Y 向き」の順（three の Euler 'YXZ'）。関節のポーズは設計書どおり 'XYZ'。sphere・cap の伸びは、回した後に骨の座標の軸に沿って掛ける
  - 形の原点：cyl・cone・extrude は関節から −Y へ伸ばす。box・sphere・cap は中心。lathe は両端を円板でふさぐ。`ico`・`tube` は使うキャラを作るMで足す（今は呼ぶとエラー）
  - 分割：円柱・回転体8、胴10（設計書どおり）。頭・顔・髪の地・鉢巻は16（互いに突き抜けないため。`anim.rigPartSegs`）
  - 押し出しの断面（`data/rigs/shapes.js`）：髪束 `tuft`＝頭の丸みに合わせた三日月形の花びら（両端を結ぶ線から「反り」だけ膨らむ）、刃 `curvedBlade`＝峰が厚く刃先が薄い三角（根元はまっすぐで先が反る）、峰 `bladeSpine`＝刃に重ねる細い帯
  - 楓真：髪束は前髪2（細い1束が藍の帯）＋後ろへ跳ねる3。大袖は腕の外側に垂れる板（表地0.035m＋裏地0.016m の2枚で 0.05m）。柄紐は 0.06m の朱の輪を 0.12m おきに10個。鍔の色は峰と同じ
  - 待機の姿勢：半身に立ち、右手の長巻を斜めに提げる（刃は右前の下、石突は背中を横切って左肩の後ろ上）。後ろから見ると背中を斜めに横切る
  - 顔（`data/rigs/faces.js`）：目・口の位置と大きさ。閉じた目は下へふくらむ1画、痛がる顔は「＞＜」と「へ」の字の口。顔は頭の前面70°の球冠に正面から写す
  - 光：`render/stage/light.js`（`sunAzimuthDeg`・`mainLightDir`。純関数）。足したキー `render.lightAzimuthOffsetDeg`(35)・`lightElevationDeg`(40)
  - 輪郭の太さ：「画面上で1.5〜4pxに clamp」は、近いときの太り（max(深度,1.5m)）を掛けた後に行う。足したキー `render.outlineNearM`・`outlineNoise*`・`outlineLightBoostRatio`・`rimSoftRatio`・`toonRampPx`・`texFaceCellPx`（式の中の定数を config に出した）
  - 事前コンパイル：M1a は場面を画面へ直接描くので、暖機も画面の左下 1×1 に描く（描画先が違うとシェーダーの出力変換が別物になるため）。M1b で場面の描画先ができたら同じ形式の 1×1 の描画先に替える。暖機で作った材質は捨てない（捨てると three がプログラムも捨てる）
  - 揺れ：入力はキャラ全体の加速度（シムの速度の差）＋そよ風。tick が飛んだ分は積分し、600tick より多く飛んだら釣り合いへ戻す。ヒットストップ中は止める。足したキー `anim.springAccelMul`・`springAccelMaxMps2`・`springResetGapF`・`breeze*`
  - まばたきは描画側の乱数（`presentationSeed(world.seed)`）。時計を使わないので撮影は毎回同じ
  - `__game` への追加（09 10.2 に無いもの）：`renderInfo()` に `compileCalls`・`programsAtWarmup`、`playerRig()`（ばねの角度・描画命令の数・メッシュの一覧）。`debug.lumaProbe` は M7d で作る（07受9 が M7d のため）
  - 仮の値の整理：`debug.grayCapsule*` を削除（カプセルを楓真に置き換えた）。床と背景の灰色は M1b まで残す
- **M0b**
  - 引数なしで開くとタイトル。`?test=1` は試験場（09 10.1：タイトルを飛ばす）、`?test=1&scene=title` はタイトルから
  - 画面の名前：`getState().scene` は画面（'title'・'devMenu'・シムの場面名）を返す。タイトルと試験メニューの背後には試験場のワールドを置いたまま（シムは止める）
  - タイトル：2つのボタンは横並び（220×48、間24、中心 y=H×0.72）。題字は上端とボタンの間の中央、72px（`ui.titleGlyphPx`）。下に小さく「とこよばらい」
  - 試験メニューの項目：試験場・数値表示・品質 高/中/低・タイトルへ（`自動` は品質の自動切替を作る M1b で足す）。項目は 200×48（`ui.devMenuItemWPx/HPx`）
  - 一時停止の背景：墨を半分の濃さで重ねる。見出し「一時停止」
  - 画面切替の筆のワイプ（0.3s）は左→右の clip-path。`?test=1` では0にした写しを画面の部品に渡す（cfg は変えない。調整パネルの差分に出ないため）
  - 確認音の音ID は `uiRin`（08 3.2 の uiConfirm とは別。10 §M0b の rin(880,1,1.2)@−12）。「音なし」では鳴らさない
  - 音の帯の出る条件：音の解錠をした後・soundOn・ctx が running でない・画面が見えている。消えているときは opacity 0 と scale(0)（指を受けない。pointer-events を毎フレーム書き換えない）
  - 教示の文（「もう一度『戻る』で終了します」など）はメニューより手前（z=35）に出す（一時停止の上でも読めるため）
  - 一時停止を開くもの：一時停止ボタン・P/Esc・戻る・hidden/pagehide・blur・縦向き・高さ280未満。閉じた後も、触れていた指は離すまで無視
  - ボタンの見た目：円相は SVG の弧（右上 −45° を中心に20°切れる）、太さ6px、地は墨×0.55、文字は紙白に墨縁。2文字のボタンは直径×0.8 に収まるよう縮める（`ui.uiBtnGlyphFitRatio`）。透明度設定は要素の opacity
  - スティックの表示：台座は墨×0.55の円＋円相、つまみは紙白。待機中は不透明度×0.4、触れている間は原点に台座、指の位置（台座の半径まで）につまみ
  - `__game` への追加（09 10.2 に無いもの）：`getState().lastInput`（直前のtickにシムへ渡した InputFrame）、`audio().masterGain`（主音量の倍率。08受17 用）、`audioSuspend()`（08受19 用）、`setSettings(p)`（左利きの撮影用）、`pointers()`（指の役割の一覧）
  - `__game.step(n)` は指の入力（collector）と setInput を合成し、1回の step(n) を「n tick 進む1描画」として扱う
  - 足した config キー（数値を直書きしないため）：`layout.btnScaleMinMul/MaxMul/ShrinkStepMul`（01 1.2 の式の 0.7・1.5・0.05）、`ui.hudSoundBand*`・`hudTeach*`・`hudLowHeightHintS`・`backExitArmS`・`ui*`（文字と円相）・`sceneWipeS`・`title*`・`menuItem*`・`devMenuItem*`、`audio.worldFxOpenHz`・`envDecayDivRatio`・`envStopPadS`・声の管理の4行（08 1.3）。`core/units.js` に `PCT`・`MS_PER_S`・`dbToGain`
  - 設定の表（`config/settings.js`）の選択肢は `choices` に書く（`ConfigEntry` に `choices?` を足した）
  - 数値表示（`?debug=1`）は一時停止ボタンを隠さないよう、右から96px 内側に出す
- **カメラを回す向きは A で確定**（依頼者の回答、M0a の確認時）：右へ動かす（→キー、指を右へ）と視点が右を向く。M0b のタッチ操作もこの向きで作る。逆にしたい人向けには設定の左右反転（01 6.1 の `camInvertX`）
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
（M1a は途中のため未作成。下は前回 M0b のもの）

題名：M0b: 入力層・ブラウザ対策・タイトルと音の起動

説明：
- 指の操作を作りました。左の親指でスティック、右側のなぞりで見回し、2本の指を同時に使えます。ボタン7つと一時停止が右手の位置に出ます（押しても技はまだ出ません）。
- タイトル（「音を出して遊ぶ」「音なしで遊ぶ」）→ 試験メニュー → 試験場、の流れを作りました。「音を出して遊ぶ」で「りん」と鳴ります。
- スマホのブラウザ対策：縦向きの案内、戻る操作で消えずに一時停止、画面を離れたら一時停止して保存、拡大や長押しメニューの抑止。
- 一時停止メニューは「続ける」「タイトルへ」の2つです。
- 設計の数値（ボタンの位置・判定・タップやはじきの条件）を自動テストで確かめています。

verify 結果：`npm run verify` 成功（型検査・単体テスト・ブラウザ試験42件・スクリーンショット8枚、合計18秒）。単体テスト132件。コンソールのエラー0件。リプレイ：m0b_touch を追加（m0_walk は変化なし）。

依頼者が試すこと（merge して数分後）：
https://sy-claude.github.io/tokoyo/
1. 公開URLを開き「音を出して遊ぶ」を押すと「りん」と鳴るか。iPhone はマナーモードのオンとオフの両方で試してください。
2. 試験メニューの「試験場」で、左の親指で棒が動き、右側のなぞりで見回せるか。2本の指を同時に使えるか。
3. 縦向きにすると案内が出て、横に戻すと続きから遊べるか（一時停止の「続ける」で再開）。
4. 画面の左端から右へなでる（iPhone）・戻るボタン（Android）で、ゲームが消えずに一時停止になるか。
5. ボタンは右手の親指で届く位置に見えるか（まだ押しても何も起きません）。

依頼者に判断を求める点：
- ボタンの大きさ：A そのまま（推奨）／B 大きく（115%）／C 小さく（90%）。
- お使いのスマホの機種名（後の回で画質の既定と性能確認に使います）。
- カメラの縦の向き：A 指を上へなぞると上を見る（推奨。横の向きと同じ考え方）／B 逆。
