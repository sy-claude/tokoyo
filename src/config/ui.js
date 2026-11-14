// HUD とメニューの設定（01 4.2・4.4・5章、07 9章）。HUD の中身（HP・方位帯など）は M4a 以降で使う。
/** @import {ConfigTable} from '../data/types.js' */

const px = (v, desc, max = 600) => ({ v, min: 0, max, step: 1, desc });
const sec = (v, desc, max = 10) => ({ v, min: 0, max, step: 0.01, desc });

/** @satisfies {ConfigTable} */
export const ui = {
  // ---- 01 4.4 ----
  hudHpLagDelayS: sec(0.4, 'HP：朱の残りの時間（s）'),
  hudHpDrainS: sec(0.3, 'HP：朱が追いつく時間（s）'),
  hudHpLowPct: { v: 25, min: 0, max: 100, step: 1, desc: '低HP演出（%）' },
  hudCompassHalfDeg: { v: 60, min: 10, max: 180, step: 1, desc: '方位帯の片側（deg）' },
  hudCompassPxPerDeg: { v: 2, min: 0.5, max: 8, step: 0.1, desc: '方位帯の縮尺（px/deg）' },
  hudBossSwapS: sec(0.3, 'ボス戦の入れ替えのワイプ（s）'),
  hudDmgNumRisePx: px(24, 'ダメージ数字の上昇（px）'),
  hudDmgNumLifeS: sec(0.6, 'ダメージ数字の寿命（s）'),
  hudDmgNumFadeS: sec(0.2, 'ダメージ数字の消える時間（s）'),
  hudDmgNumAdvMul: { v: 1.3, min: 0.5, max: 3, step: 0.05, desc: '相克有利の大きさ（倍）' },
  hudDmgNumDisMul: { v: 0.8, min: 0.3, max: 2, step: 0.05, desc: '相克不利の大きさ（倍）' },
  hudDmgNumPoolCount: { v: 16, min: 1, max: 64, step: 1, desc: 'ダメージ数字の使い回し数（個）' },
  hudOffArrowRadiusPx: px(90, '予兆の矢印の円（px）'),
  hudOffArrowMarginPx: px(24, '画面外判定の余白（px）'),
  hudOffArrowMergeDeg: { v: 15, min: 0, max: 90, step: 1, desc: '矢印をまとめる角度（deg）' },
  hudOffArrowMaxCount: { v: 6, min: 1, max: 16, step: 1, desc: '矢印の上限（個）' },
  hudSealFromMul: { v: 1.6, min: 1, max: 3, step: 0.05, desc: '朱印：出始めの大きさ（倍）' },
  hudSealInS: sec(0.12, '朱印：縮む時間（s）'),
  hudSealHoldS: sec(0.8, '朱印：表示の時間（s）'),
  hudSealTiltDeg: { v: -4, min: -30, max: 30, step: 1, desc: '朱印の傾き（deg）' },
  hudBtnPressMul: { v: 0.92, min: 0.5, max: 1, step: 0.01, desc: 'ボタン押下の縮み（倍）' },
  hudBtnPressS: sec(0.08, 'ボタン押下の縮みの時間（s）'),
  hudOugiLongHintS: sec(0.8, '「長押し」の表示（s）'),
  hudLockPadPx: px(16, '注目の印の余白（px）'),
  hudLockMinPx: px(40, '注目の印の最小直径（px）'),
  hudLockStrokePx: px(3, '注目の印の太さ（px）'),
  hudLockFromMul: { v: 1.3, min: 1, max: 3, step: 0.05, desc: '注目の印の出始め（倍）' },
  hudLockInS: sec(0.12, '注目の印の出方（s）'),
  hudStickIdleOpacityMul: { v: 0.4, min: 0, max: 1, step: 0.05, desc: '待機スティックの不透明度（倍）' },
  // ---- 01 4.2：音の帯（音が止まったとき。x302〜542, y60〜88 ＝ 中央±120） ----
  hudSoundBandHalfWPx: px(120, '音の帯：中央からの片側の幅（px）'),
  hudSoundBandTopPx: px(60, '音の帯：上端（safeT から。px）'),
  hudSoundBandHPx: px(28, '音の帯：高さ（px）'),
  // ---- 01 4.2：教示（x262〜582, y40〜76 ＝ 中央±160） ----
  hudTeachHalfWPx: px(160, '教示：中央からの片側の幅（px）'),
  hudTeachTopPx: px(40, '教示：上端（safeT から。px）'),
  hudTeachHPx: px(36, '教示：高さ（px）'),
  hudLowHeightHintS: sec(3, '「ツールバーを隠すと遊びやすくなります」の表示（s。01 1.7）'),
  backExitArmS: sec(2, '「もう一度『戻る』で終了します」の表示と受付（s。01 8.3）'),
  // ---- 01 4.1・4.3・07 9：文字とボタンの見た目 ----
  uiFontPx: px(14, '本文の文字（px。12以上）', 40),
  uiBtnGlyphPx: px(20, 'ボタンの漢字（px）', 60),
  uiBtnAttackGlyphPx: px(24, '攻撃ボタンの漢字（px）', 60),
  uiBtnStrokePx: px(6, '円相の太さ（px）', 20),
  uiBtnGapDeg: { v: 20, min: 0, max: 90, step: 1, desc: '円相の切れ目（右上、deg）' },
  uiBtnGlyphFitRatio: { v: 0.8, min: 0.3, max: 1, step: 0.05, desc: '2文字のボタンの文字の幅：直径×この値に収める（創作）' },
  uiBtnFillOpacityRatio: { v: 0.55, min: 0, max: 1, step: 0.05, desc: 'ボタンの地：墨×この値×透明度設定' },
  uiInkGroundOpacityRatio: { v: 0.75, min: 0, max: 1, step: 0.05, desc: '墨の地の不透明度（07 9）' },
  uiInkEdgePx: px(2, '文字の墨縁（px。07 9）', 10),
  // ---- 01 5.1〜5.3・5.6：画面 ----
  sceneWipeS: sec(0.3, '画面切替の筆のワイプ（s）。切替中は入力層を無効', 2),
  titleGlyphPx: px(72, '題字「常世祓」の大きさ（px。創作）', 200),
  titleBtnWPx: px(220, 'タイトルのボタンの幅（px）'),
  titleBtnHPx: px(48, 'タイトルのボタンの高さ（px）'),
  titleBtnGapPx: px(24, 'タイトルのボタンの間（px）'),
  titleBtnCyRatio: { v: 0.72, min: 0.3, max: 0.95, step: 0.01, desc: 'タイトルのボタンの中心 y = H×この値' },
  menuItemWPx: px(260, '一時停止メニューの項目の幅（px）'),
  menuItemHPx: px(44, '一時停止メニューの項目の高さ（px）'),
  menuItemGapPx: px(8, '一時停止メニューの項目の間（px）'),
  devMenuItemWPx: px(200, '試験メニューの項目の幅（px。創作）'),
  devMenuItemHPx: px(48, '試験メニューの項目の高さ（px。指で押せる大きさ）'),
};
