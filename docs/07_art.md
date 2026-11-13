# 07 美術・描画（art）v0.3

> v0.3（第3回統合）：千本鳥居は1.0m間隔（05の配置が正）、磐座は配置で scale 0.7、乗れる岩は上面を平らに。8.2 のボス技を04の技IDに置き換え。予兆の地面の形は EnemyAttackDef.marker から引く。設定キーを接尾辞の規則で改名（D68）。

> v0.2（第2回統合）：8.2 のイベント名を 09 3.1 の正本に統一（`bossMove`・`lowHpEnter` などは廃止）。画面揺れの量は 03 5.4、適用は 02 6.6。低HPは `uInk`。

**この文書でできること**
- 画面の色・明るさ・線の決まりと、全色コードの表がわかる。
- 描画の順番とシェーダーの中身（トゥーン・輪郭・地形・霧・紙墨パス）を、そのまま実装できる。
- キャラ・敵・ボス・小道具・演出（VFX）・UIの見た目の作り方と、性能の上限がわかる。

**関連文書**：00_core（1.2 視覚の憲法、11、12）／decisions（D8, D36〜D41, D47）／03（技のポーズ）／04（予兆・ボス技）／05（配置表の`kind`）／08（同じイベント名で音）／09（剛体スキン・円配列・品質段階の実装、イベント名の確定）／01（UIの配置）

---

## 1. 視覚の憲法

### 1.1 十か条（00_core 1.2 の展開。上ほど優先）
1. 紙が主役、墨が骨、朱は情報、金は祝福。色の意味を混ぜない。
2. 明度の三層：背景は明、体は暗、危険は「暗い芯＋明るい縁」、味方の弾は「明るい芯＋属性色の縁」。白黒でも遊べる。
3. 最高彩度の朱 `shuInfo` #e2452b はゲーム情報（予兆・朱印・命中閃光・注目表示）専用。環境の朱は #a3412e 以下。**例外は夕日 #d9502e のみ**（空にあり方位の目印。ゲーム情報と形・位置が重ならない）。
4. 加算合成は「暗い面の上」と「1〜3fの閃光」だけ。他は通常合成か乗算。発光体は墨の縁で囲む。
5. 属性は色と漢字（または形）の二重で示す。金は白銀＋鋼の縁＋墨の縁。
6. 基本図形を裸で見せない（先細り、衣で関節を隠す、1体1特徴形、頭・手・武器1.2倍）。
7. 揺れるもの（袖・髪・紙垂・舌・尾・鉢巻）は必ずばねで揺らす。
8. 予兆は一つの型：頭上の漢字＋墨の輪郭＋朱が中心から縁へ満ち、満ちた瞬間が判定。
9. 余白：遠景は霧と霞で紙に溶かす。敵・弾・予兆の霧は×0.35。
10. 予算：描画命令110以下（目標80）、後処理1パス、DPR上限1.5、半透明の全画面板は禁止、1体＝1メッシュ＋輪郭。

### 1.2 明度の規則（測り方を固定）
- 明度 Y ＝ 最終画素の sRGB 値で `0.2126R+0.7152G+0.0722B`（0〜1）。

| 層 | 対象 | Yの範囲 |
|---|---|---|
| 背景 | 紙・霧・空・地面・岩の明面 | 0.70〜0.95。陰面は0.55以上かつ背景面積の30%以下 |
| 体 | キャラ・敵の胴体（シルエット平均） | 0.15〜0.45。明るい衣（白雪）は暗い部品で囲み、シルエット平均で守る |
| 危険 | 敵弾・予兆の塗り・穢域 | 芯 ≤0.35、縁 ≥0.65 |
| 味方の弾 | 矢・一穴・符 | 芯 ≥0.85、縁は属性の芯色、外周に墨1px |

- 例外：地上2.5m以上の物（松の葉）、千本鳥居の柱（画面の25%以下）、崖の墨線、文字。

### 1.3 白黒検査
1. Playwright（09）で3場面を撮る：S1 浜で穢狗3体、S2 千本鳥居で灯魂の射撃、S3 ボス第2段階の穢弾の扇。
2. 各画像を上記 Y で白黒化し、色版と白黒版を左右に並べた4×2の縮小一覧1枚にする（AIが目視）。
3. 自動の明度検査：`__game.debug.lumaProbe(id)` が対象の投影中心5×5px平均（芯）と、半径24pxの環（周囲）の平均を返す。敵の体は |芯−周囲| ≥0.25、敵弾は芯 ≤0.35 かつ外縁環（半径を弾の画面半径×0.9）≥0.65。

---

## 2. パレット（`config/palette.js`）

値は sRGB の16進文字列。**必ず `new THREE.Color(hex)` を通して**線形に変換し、頂点色・uniformへ入れる（直書き禁止）。

### 2.1 基本・情報・穢れ
| configキー | 値 | 説明 |
|---|---|---|
| paper | #efe6d2 | 紙。霧と地平の色 |
| paperWhite | #f4ecd8 | HPの中身、紙垂の明部 |
| ink | #1b1a1f | 墨。輪郭・縁 |
| inkGray | #8a857c | 灰（不利のダメージ数字、燃え尽きた結界の辺） |
| shuInfo | #e2452b | 情報の朱（予兆・朱印・命中・注目） |
| shuEnv | #a3412e | 環境の朱（鳥居・柄紐） |
| shuEnvShade | #6e2a22 | 環境の朱の陰 |
| sunDisk | #d9502e | 夕日（唯一の例外） |
| kegareCore | #2a1730 | 穢れの芯（暗紫） |
| kegareRim | #b0306a | 穢れの縁（朱紫） |
| kegareHalo | #f2d6e2 | 敵弾の外縁（明るい縁） |
| goldLeaf | #f0cf6a | 金箔（浄化・報酬） |
| goldLeafEdge | #8a6a20 | 金箔の裏面 |
| steel | #7d8fa0 | 鋼（金属性の縁） |
| rimHero | #ffd9a0 | 主人公の縁の光 |
| rimEnemy | #b0306a | 敵の縁の光 |
| shadowTint | #8088a8 | 陰の藍寄せ（乗算） |
| purityDim | #8a80a0 | 穢れの色調（乗算） |
| purityWarm | #fff1dc | 清の色調（乗算） |

### 2.2 属性（キーは `elem{Wood|Fire|Earth|Metal|Water}{Ui|Core|Rim}`）
| 属性 | Ui | Core（VFXの芯） | Rim（縁） | 字 | 形の記号 |
|---|---|---|---|---|---|
| 木 Wood | #3f8f5a | #6fd08a | #1b1a1f | 木 | 縦の筆線・若葉 |
| 火 Fire | #e06a2c | #ffb070 | #b8321f | 火 | 上向きの炎の舌 |
| 土 Earth | #b8862b | #e0b04a | #5a3f14 | 土 | 落ちる砂・岩片 |
| 金 Metal | #dfe6ea | #ffffff | #7d8fa0（＋外周に墨） | 金 | 菱形・きらめき線 |
| 水 Water | #2b4a8f | #5b8be0 | #14234a | 水 | 円い波紋・しずく |

### 2.3 環境
| configキー | 値 | 説明 |
|---|---|---|
| skyTop | #8e8a88 | 空の天頂（薄墨） |
| skyHorizon | #efe6d2 | 地平（＝紙） |
| skySunGlow | #f3d2a2 | 太陽の周り |
| skyBelow | #e3d8c2 | 地平より下 |
| fog | #efe6d2 | 霧 |
| island1 / island2 / island3 | #b9b2a6 / #cfc6b6 / #ddd3c0 | 島影（近→遠） |
| kasumi | #f1e9d8 | 霞の帯 |
| seaNear / seaFar | #6f7f80 / #8e9a98 | 海（藍は使わない） |
| seaFoam | #f2ecdf | 波線・青海波 |
| rockLit / rockShade | #bdb6aa / #8c877c | 岩の明面／陰面 |
| rockMoss | #8e9670 | 岩の上面の苔 |
| grassDry | #c9b98e | 枯れ草の平地 |
| grassTip | #d6c79a | 草叢の先 |
| sand / sandWet | #dccfb0 / #b9ab8c | 参道・浜／波打ち際 |
| pineNeedle / pineNeedleUnder / pineBark | #7d8862 / #5d6648 / #4a3a30 | 松 |
| toriiBlack | #1b1a1f | 笠木・根巻 |
| shimenawa / shimenawaGroove | #c9b98a / #9a8a60 | 注連縄 |
| shide | #f4efe2 | 紙垂 |
| stoneLantern | #b5aea0 | 石灯籠 |
| lanternWindow | #f3d2a2 | 灯籠の火袋（照明計算なし） |
| boatWood / boatInner | #6a5a48 / #3a3028 | 小舟 |
| bossStone / bossCarve | #a8a296 / #6e6a62 | ボス舞台の床と彫り |
| nogikuPetal / nogikuCenter | #f4efe2 / #e0b04a | 野菊 |
| momiji | #b8452e | 紅葉（地脈100の落葉。環境の朱の範囲） |
| esekiAka / esekiKi / esekiAo | #d24a34 / #e0b04a / #4f86c6 | 穢石の縁色（芯は kegareCore） |

---

## 3. 描画パイプライン（`config/render.js`）

### 3.1 レンダラー
| configキー | 値 | 単位 | 説明 |
|---|---|---|---|
| rendererAntialias | false | — | 作成時のみ指定可。後処理と深度テクスチャがあるため切る |
| rendererPowerPreference | 'high-performance' | — | |
| rendererAlpha / rendererStencil | false / false | — | |
| toneMapping | 'NoToneMapping' | — | 色を表のとおり出す |
| outputColorSpace | 'SRGBColorSpace' | — | 紙墨パスで `#include <colorspace_fragment>` |
| （dprMaxMul） | — | — | 品質ごとの値で 09 8.9 の `config/quality.js` に置く（render.js には置かない） |
| （sceneRtScaleMul） | — | — | 09 8.9 の `renderScaleMul`（`config/quality.js`）と同じもの。名前と値はそちらが正（10 R10） |
| sceneRtType | 'HalfFloatType' | — | 暗部の縞を防ぐ。作成失敗時は UnsignedByteType |
| msaaSamplesCount | 0 | — | MSAAなし（深度テクスチャとの相性。輪郭と紙の粒で隠す） |

- 起動時：`ColorManagement.enabled=true`、`renderer.info.autoReset=false`（毎フレーム手動で reset。シーン＋後処理の合計を数える）、全素材を `renderer.compile(scene,camera)`。
- `document.hidden` の間は描画しない。

### 3.2 毎フレームの順序
1. 円配列（3.5）・時間・霧の uniform を更新。
2. `setRenderTarget(sceneRt)`（色＋`DepthTexture` UnsignedIntType）。不透明 → 透明（three の既定順）。空は `renderOrder=-10`・深度書き込みなし。
3. `setRenderTarget(null)`、全画面三角形1枚に紙墨パス（3.7）。
4. DOMのHUD（8章）はWebGL外。

### 3.3 トゥーン（人物・敵・大きな小道具）
- 主光：方位＝夕日の方位＋35°、仰角40°（夕日の仰角12°では上面が陰ばかりになるため）。
- 夕日の方位 `sunAzimuthDeg`：StageDef の `bossGate`→ボス舞台中心の水平方向（門から見て舞台の真後ろに夕日）。座標は +X＝東、−Z＝北、方位は北から時計回り。
- 階調（16×1 の DataTexture、Nearest、mipなし）。h＝0.5·dot(N,L)+0.5。

| configキー | 値 | 説明 |
|---|---|---|
| toonEdge1Ratio / toonEdge2Ratio | 0.35 / 0.62 | hの境目 |
| toonLevelDarkRatio / toonLevelMidRatio / toonLevelLitRatio | 0.58 / 0.80 / 0.98 | 明るさの倍率 |
| toonShadowTintDarkMul | 1.0 | 陰段で `shadowTint` を掛ける割合 |
| toonShadowTintMidMul | 0.35 | 中段で `shadowTint` を混ぜる割合 |
| rimPowerRatio / rimStepRatio / rimStrengthRatio | 3.0 / 0.55 / 0.35 | rim＝smoothstep(step, step+0.05, (1−N·V)^power)×strength |

- 色＝頂点色 × 段の倍率 × mix(白, shadowTint, 段の藍寄せ割合) ＋ rim×縁色（主人公 `rimHero`、敵 `rimEnemy`、醒の間は `goldLeaf`）。
- 敵ごとの uniform：`uHitFlash`（0〜1、被弾で1→3fで0、白へ mix）、`uDissolve`（撃破の溶解、6.3）。敵は素材を clone（プログラムは共有）。

### 3.4 環境の焼き込み（地形・統合した小道具）
- 読み込み時に頂点ごと：`light = 0.62 + 0.38·max(dot(n,L),0)`、遮蔽 `occ = clamp((周囲8方向3m先の最高点 − h)/3m, 0, 1)`、`ao = 1 − 0.35·occ`。頂点色＝基本色×light×ao。照明計算なしで描く。
- 小道具（岩・灯籠・鳥居）は light を3段（0.58/0.80/0.98）に量子化して焼く。地形は量子化しない。
- 小道具は `flatShading` 相当（`toNonIndexed`→`computeVertexNormals`）。

### 3.5 地形シェーダー
- 色（頂点色に焼く）：傾き s＝1−n.y。s<0.18 は `grassDry`（StageDef の面種別が参道/浜なら `sand`）、0.18〜0.45 は線形に混ぜ、>0.45 は `rockLit`。海面＋0.6m 以下は `sandWet`。明るさを fbm（周波数0.15/m）で ±6%。
- 崖の墨線：頂点属性 `aInk` ＝ smoothstep(0.35, 0.60, |その頂点の傾き − 4近傍の傾き平均|)。フラグメントで `mix(色, ink, aInk·0.85)`。
- 千本鳥居の床の縞：uniform `uToriiPath`（始点xz、方向、間隔1.0m、本数）。道幅1.8m内で `fract(沿う距離/1.0)` が 0〜0.35 の所を×0.85。縞は05 2.4 の鳥居がある区間（s 2〜16・20〜36・40〜57）にだけ付ける。
- **円の配列（最大16）**：同じ GLSL 片 `groundCircles` を地形・`bossFloor`・`pavingStone` の素材で共有。

| uniform | 型 | 中身 |
|---|---|---|
| uGroundCircleA[16] | vec4 | x, z（m）, 半径（m）, 種類（0なし 1穢域 2龍穴 3丸影） |
| uGroundCircleB[16] | vec4 | 穢域：浄化進行0〜1, 種, 出現進行0〜1, 未使用／龍穴：属性0〜4（木火土金水）, 有効0/1, 切替ワイプ0〜1, 未使用／丸影：不透明度, 縁のぼけ（m）, 0, 0 |

- 割り当て（毎描画、CPU）：①カメラ40m以内の穢域を近い順に最大6 ②龍穴を近い順に最大2 ③丸影：主人公→ボス→敵の近い順。16で打ち切り（遠い影から捨てる）。
- 各フラグメントで16回ループ、種類0と `距離>半径×1.3` は飛ばす。
- 穢域：d＝距離/半径。縁 `rE = 1 + 0.12·(fbm3(角度·3 + 時間·0.05, 種) − 0.5)`。渦：極座標の角度に `時間·0.3 + (1−d)·2.0` を足して fbm を引き、内側の濃さを ±15%。内側 `m = 1 − smoothstep(rE−0.04, rE, d·(1/出現進行))`。色 `*= mix(1, kegareCore, 0.6·m)`。縁の線（幅0.05·半径）は `kegareRim` に、`0.5+0.5·sin(時間·2π·1.2)` で `kegareHalo` へ最大35%寄せる（暗い芯＋明るい縁）。浄化：`d < 浄化進行·rE` の内側は穢れを消し、境目0.04に `paperWhite` の線＋`goldLeaf` 30%。
- 龍穴：同心円3本（d＝0.35/0.65/0.95、幅0.03）を属性の Ui 色で、輪の内側は属性 Core 色を12%混ぜる。ワイプ中は角度方向に墨の帯（`ink`）が走り、色を差し替える。
- 丸影：`mix(1, ink, 不透明度·(1−smoothstep(半径−ぼけ, 半径, 距離)))` を乗算。不透明度0.45、ぼけ＝半径×0.5。浮く敵は高さ h で不透明度×clamp(1−h/6,0.2,1)。半径：人物0.45m、穢狗0.5、灯魂0.4、唐笠0.6、面鬼0.9、ボス4.0、ボスの拳1.2。

### 3.6 霧（自作）
`f = clamp(smoothstep(fogNearM, fogFarM, 距離), 0, fogMaxMul) · uFogScale` ＋ 高さの霧 `(1−f)·heightFogMul·exp(−max(y−海面,0)/heightFogFalloffM)·smoothstep(20,60,距離)`。色は `fog`。

| configキー | 値 | 単位 | 説明 |
|---|---|---|---|
| fogNearM / fogFarM | 25 / 140 | m | 低は 18 / 90 |
| fogMaxMul | 0.92 | 倍 | 遠景も形を少し残す |
| heightFogMul / heightFogFalloffM | 0.30 / 6 | 倍 / m | 海霧 |
| fogScaleDangerMul | 0.35 | 倍 | 敵・敵弾・予兆・穢石の uFogScale |
| outlineFogBlend | true | — | 小道具の輪郭は霧色へ寄せる。敵・主人公の輪郭は寄せない |

空・夕日・島影・霞は霧の対象外（自前のグラデーション）。

### 3.7 紙墨パス（1パス、`paperInkPass`）
順序（1つのフラグメントシェーダー内）：
1. **にじみ**（高・中）：中心色の Y<0.25（墨の近く）なら、`tNoise` で uv を ±0.0015 ずらして読み直し、50%混ぜる。
2. **深度輪郭**（高のみ）：深度を線形化。十字4点（シーン描画先の1.5px）との差の最大／中心深度を、閾値 `0.02·(0.75+0.5·低周波ノイズ)` で smoothstep。線の濃さ×(1−霧量)、空（深度1）は除外。`mix(色, ink, 線·0.8)`。
3. **色調**：`uPurity`＜0.5 は t＝(0.5−p)/0.5 で彩度−40%·t と `purityDim` 乗算を t で。≥0.5 は t＝(p−0.5)/0.5 で `purityWarm` 乗算を t で。`uDesat`（符の構え0.8）で彩度を下げる。地脈100の波：`uWaveCenter` から `uWaveRadius` 以内は p＝1。明るさを5段に量子化した値を20%だけ混ぜる。
4. **紙**：`hash(gl_FragCoord.xy)` の粒 ±4%、`valueNoise(gl_FragCoord.xy / vec2(80,8))` の繊維 ±3%（表示解像度で計算）。
5. **墨の周辺減光**：`v = smoothstep(0.45, 0.95, 中心距離 + 0.08·ノイズ)·(0.18 + 0.6·uInk)` で ink へ。
6. **反転**：`mix(色, 1−色, uInvert)`。
7. 線形→sRGB、**ディザ** 4×4 Bayer ±1/255。

| uniform | 型 | 説明 |
|---|---|---|
| tColor / tDepth / tNoise | sampler2D | シーン色・深度・256²の R8 ノイズ（起動時に生成、repeat） |
| uResolution / uRtResolution | vec2 | 表示画素 / 描画先画素 |
| uCameraNear / uCameraFar | float | 深度の線形化 |
| uTime | float | 秒（実tick/60） |
| uPurity | float | 0〜1（地脈の段階、1.5sで補間） |
| uDesat | float | 0〜1 |
| uInk | float | 0〜1（見切り0.6・奥義3段0.8・符の構え0.5・低HP0.35。同時に複数あれば最大値。0.25sで寄せる。低HP表現の名前もこれ（`uLowHp` は使わない）） |
| uInvert | float | 0か1（封破2f、奥義3段1f。設定 `flashInvert`=false（01 6.1）で常に0） |
| uWaveCenter / uWaveRadius | vec2 / float | uv / 画面対角に対する比（0→1.5を2.0s） |
| uFogColor | vec3 | 線を霧で薄める用 |
| uBleedOn / uEdgeOn | float | 品質で0/1 |

`uPurity` の段：地脈 0〜24→0.0、25→0.25、50→0.5、75→0.75、100→1.0。

### 3.8 品質段階（判定と切替は09。ここは中身）
| 項目 | 高 | 中 | 低 |
|---|---|---|---|
| DPR上限 | 1.5 | 1.25 | 1.0 |
| sceneRtScaleMul | 0.85 | 0.85 | 1.0 |
| にじみ／深度輪郭 | 有／有 | 有／無 | 無／無 |
| 小道具の輪郭（裏面押し出し） | 全部 | 目印のみ（明神鳥居・主の磐座・要石・穢石） | 無 |
| 粒子の上限 `particleCount` | 1500 | 800 | 500 |
| 草叢 | 600 | 350 | 150 |
| 霧 | 25/140 | 25/140 | 18/90、地形の描画距離110m |
| 見切りの残像 | 3 | 3 | 1 |

自動切替：2sの中央値フレーム時間が18msを超えたら1段下げる。上げない。切替後4sは判定しない。

---

## 4. 輪郭（裏面押し出し）

- 対象：キャラ・敵・ボス・武器・品質表の小道具。輪郭メッシュは同じジオメトリ＋`BackSide`＋墨の `MeshBasicMaterial`（`onBeforeCompile`）。
- **平均法線属性** `aOutlineNormal`：部品ごと（統合前）に、位置が1e-4m以内で一致する頂点の法線を平均。
- 注入（剛体スキン）：`#include <beginnormal_vertex>` を `vec3 objectNormal = aOutlineNormal;` に置換（skinnormal で骨の回転が掛かる）。`#include <skinning_vertex>` の直後に `transformed += normalize(objectNormal) * w;`。静的物は `#include <begin_vertex>` の直後。
- 太さ：`w = uOutlinePx · pxToM · (0.6 + 0.8·noise3(物体座標·3)) · (1 + 0.5·(1 − dot(Nview, Lview)))`、`pxToM = max(視点深度, 1.5m) · 2·tan(fovY/2) / 画面の高さpx`（uniform `uPxPerM` を毎リサイズで更新）。画面上で1.5〜4pxに clamp。

| configキー | 値 | 単位 | 説明 |
|---|---|---|---|
| outlineHeroPx | 2.6 | px | 主人公・武器 |
| outlineEnemyPx | 2.4 | px | 敵・ボス |
| outlinePropPx | 2.0 | px | 小道具（霧色へ寄せる） |
| outlineMinPx / outlineMaxPx | 1.5 / 4.0 | px | |

---

## 5. 空と遠景

| 物 | 作り方 | 描画命令 |
|---|---|---|
| 空の球 | 半径900m、BackSide、深度書込なし、`renderOrder=-10`。h＝dir.y：h≥0 は `mix(skyHorizon, skyTop, smoothstep(0,0.55,h))`、太陽方向との内積の8乗×0.8で `skySunGlow` へ（h<0.35のみ）、h<0 は `skyBelow` | 1 |
| 夕日 | 平たい円（CircleGeometry 64分割）、距離800m、角半径4.5°、仰角12°、`sunDisk` 単色、霧なし、常にカメラへ向ける | 1 |
| 島影3層 | 横長の帯（1D の尾根ノイズ `1−|noise|` で上辺）、距離300/450/650m、高さ25/40/60m、色 island1〜3、霧なし、不透明 | 3 |
| 霞の帯 | 横長の板4本を1つに統合（中景60〜200m、長さ80〜160m、高さ6〜10m）。頂点の不透明度で両端0→中央0.85。`kasumi`、通常合成、深度書込なし | 1 |
| 海 | 400m四方、64×64分割。波＝3つの正弦（振幅0.18/0.10/0.05m、波長18/9/4.5m、速さ1.6/1.1/0.7m/s、方向は岸へ向けて±25°）。色はフレネルで `seaNear`→`seaFar`。頂点属性 `aShoreDistM`（読み込み時に陸からの距離を計算）で `fract(aShoreDistM/2.4 − 時間·0.15) < 0.06` かつ 30m以内に `seaFoam` の波線（岸から離れるほど細く）。30m以遠は青海波：3m格子のずらし並べで同心円弧3本（幅0.06m）を `seaFoam` 18%、距離で消す。霧あり | 1 |

---

## 6. キャラ・敵・ボスの造形（`config/anim.js`、data の `rig`）

### 6.1 剛体スキンの作り方
1. 部品ごとに形を作る（原点＝骨の関節。手足は −Y 方向に伸ばす）→ 部品の `offsetM`・`rotDeg` を適用 → 頂点色（palette）・`aOutlineNormal`・`aFaceUv`（顔以外は −1）を付ける。
2. `mergeGeometries` で1つに。部品の骨番号を `skinIndex=(i,0,0,0)`、`skinWeight=(1,0,0,0)`。
3. `Bone` を下表の階層で作り、バインド姿勢（全関節0°＝直立・腕を体側に下ろす）で `Skeleton` を作る。`SkinnedMesh` 本体＋輪郭の `SkinnedMesh`（同じジオメトリと Skeleton）。
4. 武器は別の小さな `SkinnedMesh`（骨1〜2本）＋輪郭。手の骨の子の `weapon` ソケットに付ける。

```js
/** @typedef {{name:string, parent:string|null, posM:[number,number,number]}} BoneDef */
/** @typedef {{name:string, shape:'lathe'|'cyl'|'cone'|'box'|'sphere'|'cap'|'extrude'|'ico'|'tube',
 *  dims:(number|string|number[])[], bone:string, offsetM:[number,number,number], rotDeg:[number,number,number],
 *  color:string, faceCell?:number}} RigPartDef   color は palette のキーまたは16進。dims は lathe が [半径,高さ] の列、extrude が先頭に形名の文字列 */
/** @typedef {{bone:string, axes:'xz'|'x', gainMul:number, limitDeg:number}} SpringDef */
/** @typedef {{scaleMul:number, bones:BoneDef[], parts:RigPartDef[], springs:SpringDef[], weapon?:{socket:string, parts:RigPartDef[], bones:BoneDef[]}}} RigDef */
```
`CharacterDef.rig` と `EnemyDef.rig` はこの `RigDef`。形の dims：lathe＝[[半径,高さ]…]／cyl＝[上半径,下半径,高さ]／cone＝[半径,高さ]／box＝[幅,高さ,奥行]／sphere＝[半径,sx,sy,sz]／cap＝[半径,開き角]／extrude＝[形名,長さ,先端の細り倍率]／ico＝[半径,分割,ノイズ振幅]。円柱・回転体の分割は8（胴は10）。

### 6.2 共通の造形規則（9か条）
1. 黒塗り・高さ64pxで誰か分かる。1体に1つの特徴形。
2. 胴は回転体で先細り。手足は上下で太さの違う円柱、関節は衣で隠す。
3. 大袖は0.05m厚の箱を腕から垂らしてばね、袴は太ももごとの円錐2つ（回転＝自分の太もも50%＋両脚平均50%）。
4. 頭・手・足・武器は1.2倍。人物は約6頭身。
5. 顔は Canvas 128²（6.4）。
6. 髪は先細りの押し出し3〜6束＋後ろ髪4節の鎖（ばね）。墨色に藍の帯 #4a5a8a を1本。
7. 動きは姿勢から姿勢へ（予備3〜6f、行き過ぎ、緩やかな戻り）。
8. 二次的な揺れ：ばね k=120、減衰比0.4（6.5）。
9. 主色3＋墨＋肌まで。隣り合う部品の明度差25%以上。

### 6.3 骨の名前（03・04・09と共通、ポーズデータはこの名前のみ参照）
**人型（祓人3人・面鬼）**。位置は親からの相対（m、楓真1.72m基準）。白雪は `scaleMul` 0.92、岩丈は1.13（肩の x のみ ×1.35）。キャラの正面は +Z、左は +X。

| 骨 | 親 | posM | 骨 | 親 | posM |
|---|---|---|---|---|---|
| root | — | 0,0,0（足元） | armL / armR | chest | ±0.19,0.17,0 |
| hips | root | 0,0.95,0 | forearmL/R | armL/R | 0,−0.28,0 |
| spine | hips | 0,0.10,0 | handL/R | forearmL/R | 0,−0.25,0 |
| chest | spine | 0,0.18,0 | thighL/R | hips | ±0.10,−0.04,0 |
| neck | chest | 0,0.22,0 | shinL/R | thighL/R | 0,−0.44,0 |
| head | neck | 0,0.08,0 | footL/R | shinL/R | 0,−0.40,0 |
| weapon | handR（白雪は handL） | 0,−0.06,0.02 | | | |

二次（ばね専用、ポーズで指定しない）：`sleeveL/R`（armL/R, ±0.02,−0.02,0）、`hakamaL/R`（hips, ±0.10,−0.04,0）、`hemB`（hips, 0,−0.02,−0.10）、`hair1..4`（head→順に子, 0,−0.02,−0.11 / 以降 0,−0.08,0）、楓真の `hachiA1..3`・`hachiB1..3`（head, ±0.03,0.06,−0.13 / 以降 0,−0.2,0）、白雪の `kazuki1..2`（head, 0,0,−0.12 / 0,−0.18,0）。

**敵・ボス**
| 種 | 骨（ポーズ対象）| ばね専用 |
|---|---|---|
| 穢狗 | root, pelvis, chest(pelvis), neck, head, jaw(head), flA/flB/flC(chest→順), frA/B/C, blA/B/C(pelvis→順), brA/B/C | tail1..5 |
| 灯魂 | root, body, lid(body。口の上半分の蝶番), eye(lid) | tongue1..3 |
| 唐笠 | root, leg, canopy(leg), geta(leg) | tongue1..3 |
| 面鬼 | 人型（weapon なし）＋ mask(chest) | hemF, hemB |
| 石凝神 | root, rockBase, rockWaist, rockChest, rockShoulder, head, fistL(root), fistR(root) | （紙垂はメッシュに固定） |

### 6.4 部品表
寸法は m。色は palette キーまたは16進。

**楓真（木・1.72m）** 特徴形＝斜めの長柄と鉢巻の尾2本
| 部品 | 形・寸法 | 骨 | 色 |
|---|---|---|---|
| 頭 | sphere r0.135 (1,1.12,1)、+0.13上 | head | 肌 #c99a78 |
| 顔 | cap r0.137 開き70°、前向き | head | 顔セル0 |
| 髪束×5 | extrude 'tuft' 長0.16〜0.22 細り0.2 | head | ink＋藍帯 |
| 後ろ髪 | box 0.08×0.10×0.03 ×4 | hair1..4 | ink |
| 鉢巻 | cyl 0.142/0.142/0.04 | head | #f2ecdf |
| 鉢巻の尾 | box 0.05×0.20×0.01 ×3×2 | hachiA/B1..3 | #f2ecdf |
| 首 | cyl 0.05/0.06/0.10 | neck | 肌 |
| 胴（羽織） | lathe [[0.16,0],[0.19,0.18],[0.17,0.38],[0.13,0.46]]（spineから） | spine | #2f5a3e |
| 帯 | cyl 0.155/0.155/0.07 | spine | #3a2e28 |
| 羽織の裾 | lathe 末広がり r0.17→0.24、高0.28 | hemB | #2f5a3e |
| 上腕・前腕 | cyl 0.055/0.045/0.28、0.045/0.035/0.25 | arm/forearm | #26262b |
| 大袖 | box 0.30×0.40×0.05 | sleeveL/R | #2f5a3e（裏 #24452f） |
| 手 | box 0.08×0.10×0.04（1.2倍込み） | hand | 肌 |
| 袴 | cone r0.20 h0.62 末広がり | hakamaL/R | #26262b |
| すね・足 | cyl 0.05/0.045/0.40、box 0.10×0.07×0.24 | shin/foot | #26262b、足袋 #e8e0cc |
| 長巻（武器） | 柄 cyl r0.022 長1.2（柄紐の縞 shuEnv 0.06m間隔）、鍔 cyl r0.05 h0.012、刃 extrude 'curvedBlade' 長0.9 幅0.035 反り0.04 | weapon | 柄 #2a2622、刃 #c9ccd0、峰 #5d636b |

**白雪（金・1.58m）** 特徴形＝身長より長い縦の弓
| 部品 | 形・寸法 | 骨 | 色 |
|---|---|---|---|
| 頭・顔 | 楓真と同形 | head | 肌 #d4a988、顔セル1 |
| 被衣 | lathe 頭巾 r0.16→0.20 高0.30、背の垂れ box 0.34×0.36×0.03 ×2 | head / kazuki1..2 | #ece8df（縁に ink の帯0.02） |
| 髪 | extrude 'tuft' ×6 長0.25〜0.40、後ろ髪4節 | head / hair1..4 | #c8ced4、帯 #7d8fa0 |
| 胴 | lathe（楓真の0.92倍、腰を細く0.13） | spine | #ece8df 上半、#1f2433 帯 |
| 大袖 | box 0.26×0.36×0.05 | sleeve | #ece8df（袖口 ink 0.03） |
| 腕・手 | 楓真と同形 | | #1f2433（籠手）、肌 |
| 袴 | cone r0.19 h0.60 | hakama | #1f2433 |
| 和弓（武器） | 弓体 tube 円弧（全長2.2m、r0.016、握りは下から1/3）、弦 box 0.004×…×0.004 ×2（上下端→`bowNock`）、矢 cyl r0.006 長0.85（`bowNock`、非番は scale 0） | bowRoot / bowNock | 弓 #1a1a1a、弦 #dfe6ea、矢羽 #f2ecdf |

**岩丈（土・1.95m）** 特徴形＝肩衣の張りと大槌
| 部品 | 形・寸法 | 骨 | 色 |
|---|---|---|---|
| 頭 | sphere r0.15 (1,1.05,1)、顎 box 0.16×0.06×0.10 | head | 肌 #b07a52、顔セル2 |
| 髪・鉢金 | box 0.30×0.05×0.30 の髷、cyl 鉢金 r0.152 h0.05 | head | ink、#3a3d42 |
| 胴 | lathe 太い樽形 r0.24→0.28→0.22、高0.50 | spine | 肌 |
| 肩衣 | box 0.32×0.05×0.30 ×2（肩から外へ15°張る）＋背板 box 0.50×0.40×0.04 | chest | #8a6a2a |
| 腹当て | lathe 前半分 r0.27 高0.30 | spine | #2a2622 |
| 縄の帯 | tube 輪 r0.26 太0.03（2本ねじり） | spine | shimenawa |
| 上腕・前腕 | cyl 0.08/0.07/0.30、0.085/0.06/0.27（前腕が太い） | arm/forearm | 肌、手甲 #2a2622 |
| 手 | box 0.12×0.13×0.06 | hand | 肌 |
| 袴（膝丈） | cone r0.24 h0.48 | hakama | #2a2622 |
| すね・足 | cyl 0.07/0.06/0.42（脚絆 #c9b98a）、box 0.13×0.08×0.27 | shin/foot | |
| 大槌（武器） | 柄 cyl r0.035 長1.3、頭 box 0.5×0.5×0.8（長辺が柄と直交）、鉄帯 box 0.52×0.52×0.06 ×2 | weapon | 木 #5a4030、鉄 #3a3d42 |

**敵**（属性は00_core 10。属性色は目などの1か所だけ）
| 種 | 部品（形・寸法・骨） | 色 |
|---|---|---|
| 穢狗（水） 体長1.1m 肩高0.6m 特徴形＝背の毛先の列 | 胸 lathe 楔形 長0.45（chest）、腰 lathe 長0.35（pelvis）、頭 cone 鼻先 r0.11 長0.32（head）、顎 box 0.08×0.03×0.22（jaw）、脚 cyl 3節 0.05→0.03、長 0.22/0.20/0.12（つま先立ち）、尾 cone ×5 節0.12（tail1..5）、毛先 cone r0.04 h0.16 ×9 を背の線に後ろへ35°（chest/pelvis） | 体 #17151a、目と口の中 elemWaterCore（加算可：暗い体の上）、毛先の先端は #3a3f5a へ |
| 灯魂（金） 高0.9m 径0.6m 特徴形＝一つ目と裂けた口 | 胴 lathe 提灯形 r0.30（下半分 body / 上半分 lid、口の線で分割）、肋 tube 輪 ×8（各半分の骨へ）、蓋 cyl r0.16 h0.06 上下、目 cap（顔セル8）、舌 box 0.08×0.14×0.02 ×3（tongue1..3） | 上 #e2d6bb、下 #8f8066、肋・蓋 ink、舌 shuEnv。射撃の予兆中は内側の uniform `uGlow` で elemMetalCore（暗い口の中に加算） |
| 唐笠（木） 傘径1.2m 特徴形＝破れ傘の円錐 | 傘 cone r0.6 h0.45 12分割 開き（縁の頂点をノイズで±0.06 削りぎざぎざ、canopy）、骨 box 0.01×0.01×0.6 ×12（canopy）、目 cap（顔セル9）、脚 cyl 0.05/0.04/0.7（leg）、下駄 box 0.20×0.05×0.30＋歯2（geta）、舌 box ×3 | 傘 #2e4a34 に ink のまだら（頂点色ノイズ）、骨 ink、舌 shuEnv、目の瞳 elemWoodCore |
| 面鬼（土） 2.6m 猫背 特徴形＝幅0.8mの鬼面 | 人型 scaleMul 1.5（腕の長さ×1.4、chest を前へ20°）。衣 lathe 裾ぎざぎざ（hips から hemF/hemB）、鬼面 sphere r0.42 (1,1.1,0.45)＋角 cone ×2＋眉 box＋牙 cone ×4（mask）、面の裏の顔 cap 一つ目（顔セル10、崩れで見える） | 面 #b8862b、眉・牙 #f2ecdf、角 ink、体 #1d1a1f |

**石凝神（土・ボス・高8m）** 特徴形＝浮く岩の積み重ねと離れた拳
| 部品 | 形・寸法 | 骨 | 色 |
|---|---|---|---|
| 基岩 | ico r1.6 分割2 ノイズ0.25 (1.4,0.8,1.2) | rockBase | rockShade〜rockLit |
| 腰岩・胸岩・肩岩 | ico r1.3 / 1.5 / 1.4、隙間0.3m | rockWaist/Chest/Shoulder | 同上 |
| 頂の顔岩 | ico r1.0、彫った顔は頂点色（眉・目の溝 ink、目は elemEarthCore を `uEyeGlow` で） | head | |
| 核の鏡 | cyl r0.6 h0.12（胸岩の正面） | rockChest | #c9ccd0、割れ目 shuInfo（崩し量に応じ `uCrack`） |
| 拳 | ico r0.9 (1.2,1,1) ×2 | fistL/R | |
| 注連縄の輪 | tube 輪（岩ごとに1本、半径＝岩×1.05） | 各岩 | shimenawa |
| 紙垂 | ShapeGeometry ジグザグ ×12（縄に固定） | 各岩 | shide |
| 穢れの亀裂 | 素材で fbm のしきい値 `uCorrupt`（第2段階で0→1を2s） | — | kegareRim（加算可：暗い岩の溝） |
三角形 約8,000。第2段階は岩の間隔を骨の位置で1.3倍、縄は切れて非表示（頂点色のαでなく、縄の部品ごとに骨の scale 0）。

### 6.5 二次的な揺れ（描画側。シムに影響しない）
- 各ばね骨は親の世界加速度（局所座標）を入力にした角度ばね：`θ'' = −k(θ−θ0) − c·θ' − a·gainMul`、k=120、c=2·0.4·√120≈8.76。1/60s 固定で実tickごとに積分、ヒットストップ中は止める、角度は ±limitDeg で止める。
- 対象と gainMul：大袖0.06、袴0.03、羽織の裾0.04、後ろ髪0.08、鉢巻の尾0.10、被衣0.07、穢狗の尾0.08、灯魂・唐笠の舌0.12、面鬼の裾0.05。limitDeg：袴25、他70。

| configキー | 値 | 単位 |
|---|---|---|
| springKRatio | 120 | 1/s² |
| springDampingRatio | 0.4 | — |

### 6.6 手続きアニメ（移動・待機）
| configキー | 値 | 単位 | 説明 |
|---|---|---|---|
| walkStrideM / runStrideM | 0.70 / 1.60 | m | 1歩の長さ（位相速度＝速度/歩幅·π） |
| walkThighDeg / runThighDeg | 25 / 45 | deg | 太ももの振り |
| walkKneeDeg / runKneeDeg | 10 / 70 | deg | 膝の最大曲げ（`max(0,sin(φ+π/2))`） |
| walkArmDeg / runArmDeg | 15 / 35 | deg | 腕は脚と逆位相 |
| walkBobM / runBobM | 0.03 / 0.06 | m | hips の上下（`|sin φ|`） |
| walkLeanDeg / runLeanDeg | 3 / 12 | deg | 前傾 |
| idleBreathDeg / idleBreathS | 1.5 / 4.0 | deg / s | chest の X 回転 |
| animTwosEnabled | true | — | 待機と歩きは2tickに1回更新（手描き感） |
| poseBlendInF / poseBlendOutF | 3 / 6 | f | 技ポーズの入り・抜け |
| blinkMinS / blinkMaxS / blinkF | 3 / 5 / 6 | s / s / f | まばたき（描画側の乱数） |

速度で歩き↔走りを線形に混ぜる（2.5→6.5 m/s）。

### 6.7 技のポーズ（03・04の MoveDef.pose）
- `pose: {f:number, joints:Record<骨名,[x,y,z]>}[]`。角度は度、Euler 'XYZ'、バインド姿勢からの相対。f は技の局所f。
- 補間：関節ごとに、その関節を含むキーだけを使い Catmull-Rom（両端は端点を複製）。行き過ぎはキーで表す。
- キーに無い関節は移動・待機の層の値。技の層は全関節に重み1（poseBlendInF/OutF で入り抜け）。
- 使える骨：6.3の「ポーズ対象」と `weapon`。`root` と ばね専用の骨は不可（データ検証でエラー）。
- 被弾の層：怯みは chest −15°X を12fでばね状に戻す。

### 6.8 顔（Canvas）
- 顔アトラス 512²（128²×16セル）を起動時に描く。セル：0楓真 1白雪 2岩丈（各：開・閉・痛の3つ＝セル番号＋0/+4/+8の行）、8灯魂の一つ目、9唐笠の目、10面鬼の裏の顔。
- 描き方：背景は肌色、目は ink の2画（上まぶたは太さ7px・下は3px、目尻を上げる）、瞳は直径14pxの ink。口は楓真・岩丈が1画、白雪は無し。灯魂・唐笠の目は白目 #f2ecdf に瞳 ink＋属性Coreの細い虹彩。

---

## 7. 小道具（`kind` 名は05の配置表と同じ文字列）

### 7.1 kind 一覧（確定）
`torii` `senbonTorii` `toro` `rock`（variant 0〜5） `iwakura` `pine` `boat` `pavingStone` `grass` `shimenawa` `bossFloor` `bossRock` `bossRope` `kanameishi` `eseki`（variant 'aka'|'ki'|'ao'）。実行時生成：`nogiku`（浄化跡）、`shide`（縄に自動配置）、`eikaku`（穢域の中心、05の穢域定義から）。

### 7.2 統合の方法
- **区画の統合チャンク**：静的な `torii` `toro` `rock` `iwakura` `pine` `boat` `bossRock` `shimenawa` は区画ごとに1つのジオメトリへ統合（toonStatic 素材1＋輪郭1）。視錐台外は描かない。
- インスタンス：`senbonTorii`・`grass`・`shide`・`nogiku`・`eseki`/`eikaku`（結晶）・`kanameishi`。

### 7.3 レシピ
| kind | 形・寸法 | 三角形 | 描画 |
|---|---|---|---|
| torii 明神鳥居 | 柱 cyl 0.22/0.26/4.2 内へ2°傾け間隔4.0、根巻 cyl 0.34/0.38/0.35 toriiBlack、笠木 box 6.4×0.28×0.5（x方向16分割、y+=0.0117·x²で反り）toriiBlack、島木 box 6.0×0.18×0.4 shuEnv、貫 box 5.2×0.22×0.16（y3.3）、額束 box 0.18×0.6×0.14、額 box 0.5×0.7×0.06 ink | 700 | 統合 |
| senbonTorii | 柱 cyl 0.12/0.13/2.6 間隔1.9、笠木 box 2.2×0.14×0.22（反り）、貫 box 1.9×0.1×0.08、根巻 ink。50基を1.0m間隔（配置は05 2.4 が正：R4 の s 2〜16・20〜36・40〜57、海側の切れ目2か所）。色 ±4%（instanceColor）。カメラから1.2〜3.0mは Bayer4×4 ディザで抜く（`discard`）| 200×50 | 1＋輪郭1 |
| toro 石灯籠 | 基礎 六角 cyl r0.35 h0.15、竿 cyl r0.11 h0.8、中台 六角 r0.3 h0.12、火袋 六角 r0.22 h0.3（窓面は lanternWindow、光の焼き込みなし）、笠 lathe 六角の反り r0.45 h0.25、宝珠 sphere r0.08＋尖り。全高1.9。色 stoneLantern、上向き面に rockMoss 30% | 350 | 統合 |
| rock 0〜5 | ico r1 分割2、fbm3(p·1.3+種)で法線方向に±0.28、拡大：0 (1.4,0.8,1.1) 1 (1,1.6,1) 2 (1.8,0.6,1.2) 3 (1.1,1.1,1.1) 4 (0.9,2.2,0.8) 5 (2.2,1.0,1.6)。n.y>0.7 に rockMoss 40%。**乗れる岩**（05 で `walkable:true`）は上面を平らにする（`flatTop`）：当たりの上面の高さ `pos.y + 1.6·ay·sy`（05 2.1）から0.3m以内の頂点はノイズを0にし、それより上の頂点をその高さへ下ろす。見た目の上面と当たりの上面の差は0（足が埋まらず浮かない）。平らな面は rockMoss 60% | 320 | 統合 |
| iwakura 主の磐座 | rock5 ×2.6 ＋ 高さ45%に楕円の注連縄＋紙垂8。配置では scale 0.7 を掛ける（05 2.3。当たりの箱 高3.64 と一致） | 900 | 統合 |
| pine 松 | 幹 tube（5点の S字、傾き0〜15°、r0.22→0.08、8角×12節）pineBark、葉 cyl r1.0〜1.6 h0.25 10角を4〜6枚、上面中央を+0.15持ち上げ、上面 pineNeedle・下面 pineNeedleUnder。高さ5〜8m | 500 | 統合 |
| boat 小舟 | 断面（U字）を長さ4.2mへ押し出し、両端を幅0へ細める、幅1.1 深0.45、12°傾けて砂に埋める、櫂 box 2.0×0.04×0.12 | 300 | 統合 |
| pavingStone 敷石 | 七角 cyl r0.35〜0.55（頂点±15%）h0.08、間隔0.9m、#cfc6b4。素材は groundCircles 付き | 28/個 | 区画で1 |
| grass 草叢 | 葉5枚（3節の帯、各2三角形）、高0.35〜0.6、根 #a39466→先 grassTip、頂点で風：`0.08·h²·sin(時間·1.7+位相)` | 30 | 1 |
| nogiku 野菊 | 花弁8枚の板＋中心円、径0.12、nogikuPetal/Center。浄化円内に `round(半径²·0.8)` 本（区画で最大40、全体プール200）、0.6sで拡大 | 18 | 1 |
| shimenawa | CatmullRom（2点間は懸垂のたるみ0.15·距離、閉曲線可）に沿う tube 3本を120°ずらしてねじる（1mあたり3回転、中心から0.07m）、太さ `基準·(0.6+0.4·sin(πu))`、溝 shimenawaGroove、房 cone ×n | 区間で変動 | 統合 |
| shide 紙垂 | 4折りのジグザグ ShapeGeometry 幅0.08 長0.35、DoubleSide、頂点で揺れ `8°·sin(時間·2.1+位相)·y01` | 8 | 全体で1 |
| bossFloor | 円板 r17（64分割）＋側面 cyl r17/17.4 h1.2。フラグメント：bossStone にノイズ±6%、放射状の割れ目12本（ノイズで曲げ、ink 50%）、五芒星の彫り（円 r8.5 幅0.18、星の5線 幅0.22、溝は bossCarve、光側の縁に +10% の明るい線）、groundCircles 付き | 260 | 1 |
| bossRock | rock の variant 1/4/5 を ×2.5〜3.5、半径18.5mの円上に8個 | 320/個 | 統合 |
| bossRope | 8個の岩の頂点＋中間（−0.8m たるみ）を通る閉じた shimenawa、紙垂24 | 2,000 | 統合 |
| kanameishi 要石 | 六角柱 r0.6 h2.2（上を丸める）＋縄の輪、第2段階で kegareRim の亀裂（`uCorrupt`）。2基 | 200 | 1＋輪郭1 |
| eseki 穢石 | 八面体 r0.25〜0.7、y×1.8 を5〜9個、中心から外へ15〜40°傾ける。面の色＝mix(kegareCore, 縁色, (1−N·V)^1.5)（暗い芯＋明るい縁）。縁色 esekiAka/Ki/Ao。被弾で白3f・0.05m揺れ。高所の石（05指定）は光柱 | 8/個 | 全体で1＋輪郭1 |
| eikaku 穢核 | 八面体 r0.45 y×1.4、kegareCore、縁 kegareRim の割れ目（脈動1.2Hz） | 8 | eseki と同じ |

---

## 8. VFX

### 8.1 共通の器（起動時に作るプール）
| 器 | 中身 | 合成 | 上限 | 描画 |
|---|---|---|---|---|
| motes | 板の InstancedMesh。生成時に属性（発生tick・原点・速度・色・大きさ・寿命・種類）を書き、位置は頂点シェーダーで `o+v·t+½g·t²`。種類：0墨滴 1金箔（回りながら上昇・裏面 goldLeafEdge） 2砂・岩片（落下） 3穢粒（上昇） 4紅葉（ひらひら落下） 5魂片の雫 | 通常＋alphaTest 0.5 | particleCount | 1 |
| flashes | 板32。星形・輪・十字の閃光（1〜3f）、暗い面の上の光 | 加算 | 32 | 1 |
| trails | 帯の BufferGeometry（16点、`DynamicDrawUsage`、`setDrawRange`）。刃の根元と先端を毎tick記録 | 通常＋discard | 4 | 使用中のみ |
| rings | 地面・空中の輪（RingGeometry の板、uProgress） | 通常 | 16 | 1 |
| groundMarks | 地面の板（予兆の範囲・奥義の円陣・醒の五芒星）。種類ごとに SDF：円・扇・帯・五芒星 | 通常、polygonOffset | 24 | 1 |
| glyphs | 漢字の板（字アトラス）。常にカメラへ向ける | 通常 | 24 | 1 |
| projectiles | 味方の矢・一穴（明るい芯＋属性縁＋墨の外周） | 通常 | 32 | 1 |
| enemyBullets | 穢弾（kegareCore の芯 r<0.55、kegareRim 0.55〜0.8、kegareHalo 0.8〜1.0） | 通常 | 48 | 1 |
| kekkai | 正十二面体（非インデックス＋重心座標属性） | 通常、両面、深度書込なし | 8 | 1 |
| shards | 五角形の破片 | 通常 | 36 | 1 |
| waves | 浮世絵の波頭の形の帯（衝撃波） | 通常 | 8 | 1 |
| beams | 光柱（上下の開いた円柱、縦の透明度、白銀の芯＋墨の縁の線） | 通常 | 6 | 1 |
| ghosts | 見切りの残像（主人公の SkinnedMesh の複製3つ、骨行列の写し） | 通常 | 3 | 使用中のみ |

- プールが尽きたら最も古いものを再利用。使用数0の器は `visible=false`（描画命令0）。
- 加算の粒子・結界はカメラから2m以内で不透明度を `smoothstep(0.5,2.0,距離)` 倍。

### 8.2 イベント→VFX 対応表（イベント名と中身は 09 3.1 が正本。08 も同じ名前を使う）
| イベント（ペイロード） | VFX | 寿命 | 粒子 |
|---|---|---|---|
| swing {moveId, heavy, element} | trails：墨の芯（幅は技の刃長、重い技×1.6）、ノイズで縁をかすれさせ、内側に属性Coreの細線。白雪は矢の尾 | 0.15s | — |
| hit {heavy, hitstopF, element, affinity, pos} | 墨滴4/5/6（軽/中/重。段の境は09 3.1：heavy または hitstopF≥12＝重、8〜11＝中、他＝軽）、flashes：shuInfo の星形2f、被弾者の uHitFlash 3f、属性の形の記号（木：縦線3 / 火：上向き舌 / 土：砂8 / 金：菱形きらめき / 水：輪）、相克有利は星を1.3倍 | 0.4s | 4〜14 |
| projectileSpawn {defId} / fuCast {kind:'ikketsu'} | projectiles（defId で見た目を引く）。一穴は発射点に glyphs「穴」0.3s | 飛翔中 | — |
| dodge {kind} | 神通足：足元に墨の擦れ（trails を地面に沿って）、宙返り：金の弧 | 0.2s | 6 |
| mikiri {pos} | ghosts 3体（4fずつ過去、ink 色 不透明度0.5→0）、uInk 0.6、朱印「見切」（DOM, 8章） | 0.35s／1.5s | — |
| ougiCharge {stage}（0＝溜め開始、1〜3＝段） | groundMarks 円陣：0で描き始め、1段＝墨の輪が描かれていく、2段＝shuInfo の内輪、3段＝金箔が上がる（motes 1、毎秒20）＋uInk 0.8 | 溜め中 | 20/s |
| ougiCancel {reason}（short＝不発を含む） | 円陣が灰 inkGray で崩れて消える | 0.2s | — |
| ougiRelease {stage} | RingGeometry 270°を掃く筆の一閃（groundMarks の一種、uProgress 0→1 を8f）、墨滴12、3段は uInvert 1f＋漢字の朱印（DOM） | 0.5s | 12 |
| kekkaiPlace {targetId, trap} | kekkai：半径＝対象の高さ×0.6（最小0.9m）、辺は重心座標で ink の太線（0.06）、面は paper 15%、回る「封」の文様、頂点に shuInfo の点。残り時間は辺を縦軸周りの角度で時計回りに inkGray へ燃やす。罠は r0.6 を高さ0.3mで上下0.05m | 封印中 | — |
| fuhou {pos} | shards 12（面の数）、rings：shuInfo の衝撃波（0→4mを10f）、朱印「破」、uInvert 2f | 0.6s | — |
| fuStart / fuCancel | uDesat 0→0.8（0.15s）、uInk 0.5。五芒星と筆線は01の2D Canvas層 | 構え中 | — |
| fuStroke {index, element} | 01の筆線の先に属性Coreの点。3D側なし | — | — |
| fuCast {strokes:2} 浄 | rings：金箔の波 0→6m（0.6s）、motes 金箔30、浄化（下記） | 0.8s | 30 |
| fuCast {strokes:3} 守 | 札8枚（glyphs のアトラス「符」セル、alphaTest）半径1.2mを回る、揺れ | 8s | — |
| fuCast {strokes:4} 滅 | DOM の大きな墨「滅」を0.3sで書く、各敵へ空から墨の線（trails を直線で） | 0.6s | 6/敵 |
| fuCast {strokes:5} 醒 / buff {kind:'sei', on:false} | groundMarks 五芒星を押し、0.4sで体へ昇る。効果中は rim を goldLeaf、鉢巻・紐を shuInfo 寄りに | 15s | — |
| telegraph {moveId, glyph, durF, offscreen} | glyphs：頭上1.0mに漢字（ink の字＋shuInfo の後光）を判定0.4s前から。groundMarks（範囲の形は moveId の EnemyAttackDef.marker（04）から引く）：ink の輪郭0.08m＋shuInfo の塗り（不透明度0.35→0.55）が中心から縁へ、縁に届いた瞬間が判定。画面外は01の矢印 | 予兆長 | — |
| eikiSpawn {id} | 円配列の出現進行0→1（1.2s）、motes 穢粒（毎秒6、上昇） | 継続 | 6/s |
| eikiPurify {id} / ekakuBreak {eikiId} | 円配列の浄化進行0→1（1.0s）、境に金箔、跡に nogiku | 1.0s | 20 |
| ryuketsuEnter / ryuketsuDeplete | 円配列＋龍穴メッシュ（回る属性の字の輪＋淡い光柱）。休止は色を inkGray へ | 継続 | — |
| esekiHit {id, color} / esekiBreak {id, color} | 白3f＋揺れ／shards 8（縁色）、motes 砂12、魂片の雫を放出 | 0.6s | 20 |
| tamakakePickup {chain} | motes 種類5：白と金の雫（尾つき）がベジェで0.6sかけて体へ | 0.6s | 1/個 |
| gaugeStage {stage}（1〜4＝25/50/75/100）／bossGateOpen | uPurity を段へ。50：beams で鳥居の光柱。100：uWaveCenter＝主人公の画面位置、波2s、紅葉 motes 毎秒8（カメラ周り） | 段階 | 8/s |
| kill {id, pos} | uDissolve 0→1（0.5s、ノイズしきい値で discard、縁0.05を paperWhite）、墨粒16 | 0.5s | 16 |
| kuzushi {id, on:true} | 面鬼：面の骨が跳ね上がる（ポーズ）＋shards 4。ボス：鏡の uCrack を1へ | 0.4s | — |
| playerHurt {kind} | 主人公 uHitFlash 3f、墨滴6、画面揺れ（量は03 5.4、適用は02 6.6） | 0.3s | 6 |
| （イベントなし）低HP：`player.hp/hpMax` < 0.25 で開始、≥0.28 で停止（09 3.1） | uInk を0.35へ（周辺の墨のにじみ）。心音と同じ周期で ±0.08 脈打つ（08） | 継続 | — |
| telegraph／swing {moveId:'boss.slam'}（予兆／発動） | 予兆：地面に ink の線を引き shuInfo で塗り進める。発動：waves の波頭が線に沿って進む、砂20 | 1.2s | 20 |
| telegraph／swing {moveId:'boss.fan'}（予兆／発動） | 予兆：groundMarks 淡い扇の線。発動：enemyBullets 5発 | — | — |
| telegraph／swing {moveId:'boss.eiki'}（予兆／発動） | glyphs「穢」＋円が広がる。核に shuInfo の割れ目（潰せる合図） | — | — |
| telegraph／swing {moveId:'boss.kekkai'}（予兆／発動） | プレイヤーの足元に十二面体の針金の幻が1.0sで組み上がる（kekkai の線のみ表示） | 1.0s | — |
| telegraph／swing {moveId:'boss.jibashiri'}（予兆／発動） | 予兆：groundMarks 帯が地を走る。発動：岩柱（shards を縦に）が帯に沿って順に突き出る、砂 | 1.0s | 24 |
| telegraph／swing {moveId:'boss.shiko'}（予兆／発動） | 予兆：groundMarks 円 r5。発動：rings 墨の衝撃輪、砂16 | 0.5s | 16 |
| bossPhase {phase:2} | 縄が切れる（骨 scale 0）、uCorrupt 0→1（2s）、要石の亀裂 | 2s | — |
| bossDefeat | uInvert 2f、浄化の波（gaugeStage 4 と同じ波）、金箔60 | 3s | 60 |
| hit（ダメージ数字。合算は03 5.5） | DOM（8章） | 0.8s | — |

※ ボス技の ID は04 4.2 で確定（`boss.slam`・`boss.fan`・`boss.eiki`・`boss.kekkai`・`boss.jibashiri`・`boss.shiko`）。予兆中の見た目は `telegraph.moveId`、発動の見た目は `swing.moveId` で引く（09 3.1。`bossMove` というイベントは無い）。地面の印の形と寸法は 04 4.2 の印（EnemyAttackDef.marker）に従う。

---

## 9. UIの見た目（配置は01）

| 要素 | 見た目 |
|---|---|
| 文字 | `font-family:"Hiragino Mincho ProN","Yu Mincho","YuMincho","Noto Serif JP","Noto Serif CJK JP",serif;` 太字。外部フォント不可。12px以上、数字14px以上。`paint-order:stroke` で ink の縁2px。コントラスト比4.5以上 |
| 墨の地 | ink、不透明度0.75、角を筆で塗ったような形（`clip-path` の多角形12点、端を±3pxずらす）。HUDの要素は必ずこの上 |
| HP | 筆の一画（`clip-path` で両端を細く）。中身 paperWhite、減った分は shuInfo で残し0.4s後に縮む。更新は `transform:scaleX` のみ |
| ボタン | 円相（SVG の円弧、一部が切れた筆の円、太さ6px、ink）に漢字（文字は01の定義）。回復中は円が時計回りに満ちる（`stroke-dashoffset`）。奥義の溜めは円の色 ink→shuInfo→goldLeaf。使えない時は inkGray |
| 札・勾玉・結界の残数 | 札＝縦長の札の絵、勾玉＝弧に並ぶ勾玉、結界＝五角形。消費すると ink が抜けて輪郭だけ |
| 地脈ゲージ | 縦の掛軸（軸の上下に ink の棒）。中身は下から kegareCore→elemMetalUi のグラデーション、50に鳥居の印、100に「清」の印。段階が上がると朱印 |
| 朱印 | shuInfo の角丸四角に白抜きの字。1.6→1.0倍を120ms（`cubic-bezier(.2,1.6,.4,1)`）、−4°。保持と消え方（0.8s 表示後0.2s）は01 4.3・4.4 が正 |
| かすれ | SVG フィルタ `feTurbulence baseFrequency=0.8 numOctaves=2` → `feDisplacementMap scale=3`。題字と朱印の静的な要素だけに付ける（毎フレームの再計算をしない） |
| ダメージ数字 | DOM 16個を使い回す。明朝の算用数字＋ink の縁。相克有利は shuInfo で1.3倍、不利は inkGray で0.8倍。動き（0.6sで上へ24px、最後の0.2sで消える）は01 4.3・4.4 が正 |
| 表示の動き | `clip-path` の筆のワイプ（左→右180ms）。更新は `transform`/`opacity` のみ、毎フレームの再レイアウト禁止 |

---

## 10. 性能予算

### 10.1 描画命令（戦闘中・敵8体・品質高）
| 区分 | 通常 | 最大 |
|---|---|---|
| 空・夕日・島影3・霞・海 | 7 | 7 |
| 地形の塊（4のうち見えるもの） | 3 | 4 |
| 区画の統合チャンク（本体＋輪郭）×見える区画2 | 4 | 6 |
| senbonTorii・grass・shide・nogiku・eseki（＋輪郭）・kanameishi（＋輪郭）・pavingStone・bossFloor | 6 | 10 |
| 主人公＋武器（輪郭込み） | 4 | 4 |
| 敵8体（輪郭込み） | 16 | 16 |
| VFX の器（使用中のみ） | 8 | 22 |
| 龍穴メッシュ | 1 | 2 |
| 紙墨パス | 1 | 1 |
| **合計** | **50** | **72**（上限110） |

ボス戦：敵8体の代わりにボス2＋要石2、合計は通常40前後。

### 10.2 その他
| configキー | 値 | 単位 | 説明 |
|---|---|---|---|
| budgetDrawCallsMaxCount | 110 | 回 | テストの上限（00_core） |
| budgetDrawCallsTargetCount | 80 | 回 | 目標 |
| budgetTrianglesMaxCount | 200000 | 個 | 輪郭込み。見積もり約13万 |
| texGlyphAtlasPx | 1024 | px | 字アトラス RGBA（予兆の字・朱印の字・属性字・符・札）約4MB |
| texFaceAtlasPx | 512 | px | 顔 |
| texInkAtlasPx | 512 | px | 墨滴4種・金箔・紅葉・草の形 |
| texNoisePx | 256 | px | R8、紙墨パスと fbm |

- 後処理：読み出し 高8回（色2・深度5・ノイズ1）、中3回、低2回。iPhone 12 で 1〜2ms の見積もり（M1で実測）。
- テクスチャはすべて起動時に Canvas／DataTexture で生成。合計 GPU 8MB 未満。
- シェーダープログラム（起動時 compile）：toonSkinned、outlineSkinned、toonStatic、outlineStatic、terrain、sea、sky、flat（夕日・島影・霞）、motes、flashes、trail、groundMarks、glyphs、projectile、kekkai、paperInk ほか。

---

## 11. 受け入れ基準（自動）

1. 起動〜戦闘〜ボス撃破の e2e → コンソールエラー0件。
2. 固定3視点（浜・千本鳥居・ボス第2段階）で `renderer.info.render.calls`（シーン＋後処理の合計） → ≤110。
3. 同じ3視点で敵8体＋VFXを全種1回発火 → 描画命令 ≤90。
4. 同じ3視点の三角形数 → ≤200,000。
5. 全キャラ・敵の SkinnedMesh について → 1体の描画命令＝2（武器持ちは4）。
6. 全キャラの `skinWeight` → すべて (1,0,0,0)。
7. ポーズデータの関節名 → すべて6.3の「ポーズ対象」または `weapon`（データ検証で不一致0）。
8. パレットの全キーを `THREE.Color` で読む → 例外0、`src/config/`・`src/data/` 以外のソースに `#` の色の直書き0（grep。09 2章11と同じ。部品表の色は data に書く）。
9. `lumaProbe`：S1の穢狗3体 → |芯−周囲| ≥0.25。
10. `lumaProbe`：S3の穢弾 → 芯 ≤0.35、外縁 ≥0.65。
11. 地脈ゲージを 0/25/50/75/100 に設定して1.5s後 → `uPurity` が 0/0.25/0.5/0.75/1.0（±0.01）。
12. 符の構えに入って0.15s後 → `uDesat` 0.8±0.02。取消後0.15s → 0±0.02。
13. 穢域を20個置く → 円配列の使用数 ≤16、穢域は最大6、主人公の丸影は常に含まれる。
14. 封破の発生 → `uInvert`＝1 がちょうど2描画tick、設定 `flashInvert`=false では0。
15. 品質を高→中→低に強制 → 深度輪郭（`uEdgeOn`）1→0→0、にじみ 1→1→0、DPR 1.5→1.25→1.0。
16. 18ms超のフレーム時間を2s与える → 品質が1段下がる。その後4sは下がらない。12ms を与え続けても上がらない。
17. 全VFXの器を上限まで使い、さらに1つ発火 → 例外0、使用数は上限のまま（最古を再利用）。
18. 器の使用数0 → その器は `visible=false`。
19. motes の生成数 → 品質ごとの `particleCount` を超えない。
20. 見切りの発火 → ghosts が品質高で3体表示、0.35s後に0体。
21. 敵撃破 → 0.5s後に `uDissolve`＝1、敵メッシュは非表示。
22. 千本鳥居：カメラから2mの鳥居 → その画素の約50%が抜ける（ディザ）。
23. 夕日の方位 → `bossGate`→ボス舞台中心の方位と±0.5°。
24. 空・夕日・島影 → 霧の影響0（同じ視点を霧の量の最小と最大で2回描き、空・夕日・島影の画素の差が ±2/255 以内。紙墨パスの粒は両方に同じに乗るので差で測る）。
25. 起動から最初の描画まで → `renderer.compile` が呼ばれ、戦闘開始後に新しいシェーダープログラムの生成0（`renderer.info.programs.length` が不変）。

## 12. 依頼者が実機で確かめること
1. 浜・丘・千本鳥居・ボス舞台で、敵と弾がひと目で見分けられるか（明るい背景に暗い体）。
2. 夕日がどこからでも見え、ボス舞台の方向が分かるか。
3. 3人と4種の敵が、遠くからでも形で誰か分かるか。袖や髪が揺れているか。
4. 封破・奥義3段の白黒反転がまぶしすぎないか（設定で切れるか）。
5. 戦闘中にカクつかないか（`?bench=1` の表示をスクショで送る）。

## 13. coreへの変更提案
> 処理済み（core v0.3）：1・2 は core 1.2 に採用、3 は本書の造形表に反映済み（core 10章は色を持たないため変更なし）。D64。
1. **1.2-3 に夕日の例外を追記**：「環境の朱は #a3412e 以下（例外：夕日 #d9502e、空にあり方位の目印）」。理由：r1で採用済みの夕日の色が規則と矛盾しているため。
2. **1.2-2 の明度に測り方を追記**：「明度＝sRGB の Y。背景の陰面は0.55以上かつ30%以下、地上2.5m以上の物と鳥居の柱は例外」。理由：岩の陰面や松が規則を常に破るため、検査できる形にする。
3. **10の敵の色**：唐笠は木属性になったため傘を藍から暗緑 #2e4a34 に変更（藍は水属性の色）。穢狗の目も火の橙から水の芯色へ。理由：D13 の属性変更に色を合わせる。
