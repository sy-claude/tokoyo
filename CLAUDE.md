# 常世祓（とこよばらい）— 実装AIへの指示

スマホブラウザ（横画面・タッチ）向けの和風・陰陽五行3Dアクション。Three.js（WebGLRenderer）＋Vite＋素のJavaScript（JSDoc＋checkJs）。
依頼者は非エンジニア。設計は `docs/` に確定済み。**あなたの仕事は設計どおりに実装し、自分で検証すること**。

## 毎セッションの手順
1. `PROGRESS.md` を読む（無ければ M0a から）。指示されたマイルストーン（M）の節を `docs/10_milestones.md` で読む。
2. そのMの「読む文書と節」**だけ**を読む（全文書を読まない。`docs/00_core.md` は毎回読む）。
3. 実装 → `npm run verify:fast` → `npm run verify`（ブラウザが無ければ縮退。09 11.4）→ スクリーンショットの縮小一覧を自分で見て確認。
4. `PROGRESS.md` を更新 → commit → push。最終メッセージに「PR本文」（題名・要約5行以内・verify結果・依頼者が試すこと3行）を書く。

## 絶対に守ること（不変条件。詳細は docs/00_core.md 12章、docs/09_tech.md 2章）
1. 60Hz固定更新・整数tick・決定論（シード付き乱数、ID順更新）。`src/sim` と `src/core` で `Math.random` / `Date.now` / `performance.now` / DOM / 音 を使わない。
2. 時計は2つ（実tick／局所時間）、時間倍率は掛け算（00_core 4章）。
3. カメラはシム側。描画は補間するだけ。
4. シムへの入力は `InputFrame` のみ。
5. 衝突と見た目は同じステージデータから作る。攻撃判定は骨に依存しない。
6. キャラは剛体スキンの1メッシュ。
7. **数値は `src/config/` と `src/data/` にだけ書く**。数値の設定キーは名前の末尾に単位（00_core 0章の一覧：`F` `S` `M` `Mps` `Mps2` `Deg` `DegPs` `Px` `Mul` `Pct` `Hz` `Db` `Bpm`、無次元は `Count` `Ratio`）。
8. 保存は `tokoyo:` 名前空間＋版番号＋移行関数。
9. 描画命令は戦闘中110以下、後処理1パス、DPR上限1.5。
10. 色は `THREE.Color` を通す。
11. 依存は three・vite・typescript・playwright の4つだけ（版を固定）。追加しない。BGMは `public/audio/bgm/` の静的ファイルのみ許可（無くても無音で動く）。

## 進め方の規則
- 指示されたMの範囲だけ作る。「やらないこと」に書かれたものは作らない。
- 設計書どうしの矛盾・不明点に気づいたら、**推測で埋めずに** `PROGRESS.md` の「依頼者に聞くこと」に選択肢と推奨を書き、推奨で進める（作業は止めない）。設計を大きく変える必要があるときだけ、作業前に1〜3行で質問する。
- 優先順位：`docs/00_core.md` ＞ 各詳細設計書（01〜09）＞ `docs/10_milestones.md`。型名・イベント名・フォルダ構成は `docs/09_tech.md` が正本。
- 設計書に具体値が無い「見た目の創作部分」（技のポーズのキーフレーム、細部の断面形、演出の細かな見た目など）は自分で決めてよい。決めた内容は `PROGRESS.md` に短く記録する。
- ファイルは必要な箇所だけ読む。大規模なリファクタは指示があるときだけ。
- 依頼者への説明は平易な日本語で短く。コードの解説は不要。

## コマンド（docs/09_tech.md 1章）
- `npm run dev` 開発サーバ ／ `npm run build` ／ `npm run preview`
- `npm run verify:fast` 型検査＋単体テスト＋ビルド（90秒以内）
- `npm run verify` 上記＋ヘッドレスChromiumのスマホ横画面e2e＋スクリーンショット（10分以内）
- `npm run replays:update` 意図して挙動を変えたときだけリプレイを更新
- URL：`?debug=1` 調整パネル ／ `?test=1&seed=N` テストモード ／ `?bench=1` 性能測定 ／ `?scene=sandbox|stage|boss|fu-test|title`、見本室 `gallery-rigs|gallery-vfx|stage-view|gallery-ui`（10 §G）

## 文書の地図
00_core（原則・用語・時間・不変条件）／01 操作とUI／02 移動とカメラ／03 戦闘と陰陽術／04 敵とボス／05 ステージ／06 キャラと強化・保存／07 美術／08 音／09 技術／10 マイルストーン／decisions（決定の理由）
