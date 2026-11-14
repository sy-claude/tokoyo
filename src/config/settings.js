// 設定の既定値（01 6.1 の表）。保存は SaveDataV1.settings（09 9章）。設定画面は M10a。
// 「選択肢」の欄は choices に書く（設定画面と保存の検証が使う）。
/** @import {ConfigTable} from '../data/types.js' */

/** @satisfies {ConfigTable} */
export const settings = {
  btnLayout: { v: {}, desc: '配置編集の上書き BtnId→{dxPx,dyPx,scalePct}（6.2。M10a）' },
  btnScalePct: { v: 100, min: 70, max: 150, step: 5, desc: 'ボタン全体の大きさ（%）' },
  btnOpacityPct: { v: 80, min: 20, max: 100, step: 10, desc: 'ボタンとスティックの透明度（%）' },
  leftHanded: { v: false, desc: '左利き反転（01 1.8）' },
  stickMode: { v: 'hybrid', choices: ['hybrid', 'fixed'], desc: 'スティックの方式（01 1.5）' },
  stickSize: { v: 'M', choices: ['S', 'M', 'L'], desc: 'スティックの大きさ（小/中/大）' },
  attackDragCam: { v: true, desc: '攻撃ボタンでカメラ（01 2.7）' },
  camSensPct: { v: 100, min: 50, max: 200, step: 10, desc: 'カメラ感度（%）' },
  camInvertY: { v: false, desc: 'カメラの上下反転' },
  camInvertX: { v: false, desc: 'カメラの左右反転' },
  camAutoTurn: { v: 'normal', choices: ['off', 'weak', 'normal'], desc: '自動回り込みの強さ（02）' },
  camFovOffsetDeg: { v: 0, min: -5, max: 5, step: 1, desc: '縦の視野角に足す（deg）' },
  lockPriority: { v: 'nearest', choices: ['nearest', 'center', 'lowHp'], desc: '注目の優先（02）' },
  ougiInput: { v: 'hold', choices: ['hold', 'tap2'], desc: '奥義の入力（01 2.8）' },
  fuMode: { v: 'assist', choices: ['assist', 'draw', 'simple'], desc: '符の描き方（01 3.4）' },
  shakePct: { v: 100, min: 0, max: 100, step: 10, desc: '画面揺れ（%）' },
  flashInvert: { v: true, desc: '封破などの白黒反転（07）' },
  damageNumbers: { v: true, desc: 'ダメージ数字' },
  vibration: { v: true, desc: '振動（navigator.vibrate が無い端末では項目を隠す）' },
  difficulty: { v: 'normal', choices: ['easy', 'normal', 'hard'], desc: '難易度（03/04）' },
  soundOn: { v: true, desc: '音を出す（タイトルの選択で決まる）' },
  volMasterPct: { v: 100, min: 0, max: 100, step: 5, desc: '主音量（%）' },
  volSfxPct: { v: 100, min: 0, max: 100, step: 5, desc: '効果音の音量（%）' },
  volBgmPct: { v: 100, min: 0, max: 100, step: 5, desc: 'BGM の音量（%）' },
  volAmbPct: { v: 100, min: 0, max: 100, step: 5, desc: '環境音の音量（%）' },
  followMuteSwitch: { v: false, desc: '消音スイッチに従う（iOS のみ表示。08 2.2）' },
  homePromptShown: { v: false, desc: 'ホーム画面追加の案内を出したか（01 5.9）' },
};
