// 音の設定（08 1.1・1.3・2.2・3.1 の表）。M0b は骨組み（ctx・主音量・バス）と確認音「りん」だけ。
// 効果音の数値（周波数・長さ・音量）は sfxRecipes の1つの表に入れる（08 9章。configKeys の接尾辞検査の対象外の data 的な表）。
/** @import {ConfigTable} from '../data/types.js' */

const db = (v, desc) => ({ v, min: -60, max: 12, step: 0.5, desc });

/** @satisfies {ConfigTable} */
export const audio = {
  // ---- 08 1.1：つなぎ方 ----
  busSfxDb: db(0, '効果音（基準）'),
  busUiDb: db(-6, 'UI'),
  busBgmDb: db(-8, 'BGM'),
  busAmbDb: db(-18, '環境音'),
  busReverbDb: db(-6, '残響の戻り'),
  masterDb: db(0, '主出力'),
  compThresholdDb: db(-18, 'コンプレッサーの閾値'),
  compKneeDb: { v: 12, min: 0, max: 40, step: 1, desc: 'コンプレッサーの膝（dB）' },
  compRatioMul: { v: 4, min: 1, max: 20, step: 0.5, desc: 'コンプレッサーの比（倍）' },
  compAttackS: { v: 0.003, min: 0, max: 1, step: 0.001, desc: 'コンプレッサーのアタック（s）' },
  compReleaseS: { v: 0.25, min: 0, max: 1, step: 0.01, desc: 'コンプレッサーのリリース（s）' },
  worldFxOpenHz: { v: 20000, min: 1000, max: 22000, step: 100, desc: 'worldFx（低域通過）の開いた状態（Hz。08 10受25）' },
  // ---- 08 1.3：声の管理（M3b で使う） ----
  voiceMaxCount: { v: 24, min: 1, max: 64, step: 1, desc: '同時に鳴らす声の上限' },
  sameSoundGapS: { v: 0.03, min: 0, max: 0.2, step: 0.005, desc: '同じ音IDを捨てる間隔（s）' },
  pitchJitterPct: { v: 5, min: 0, max: 20, step: 1, desc: '音程のばらつき（%）' },
  voiceStealFadeS: { v: 0.01, min: 0, max: 0.1, step: 0.005, desc: '声を奪うときの消え方（s）' },
  // ---- 08 2.2：中断と復帰 ----
  audioResumeCheckS: { v: 0.5, min: 0.1, max: 5, step: 0.1, desc: '復帰の確認待ち（s）' },
  silentWavRateHz: { v: 8000, min: 3000, max: 48000, step: 1000, desc: '無音WAV の標本化周波数（Hz）' },
  silentWavLenS: { v: 1.0, min: 0.1, max: 5, step: 0.1, desc: '無音WAV の長さ（s）' },
  silentLoopMode: { v: 'always', choices: ['always', 'fallback'], desc: "'always'＝audioSession があっても無音WAVを流す／'fallback'＝無いときだけ" },
  // ---- 08 3.1：部品の共通 ----
  envDecayDivRatio: { v: 6.9, min: 1, max: 20, step: 0.1, desc: 'E(a,d)：setTargetAtTime の時定数 = d ÷ この値（d 秒後に約−60dB）' },
  envStopPadS: { v: 0.05, min: 0, max: 1, step: 0.01, desc: 'E(a,d)：音源を止めるまでの余り（a+d+この値）' },
  sfxRecipes: {
    v: {
      // 部品「りん」rin(f, うなりHz, d)：正弦 f と f+うなり 各@−12 ＋ 正弦 2.76f @−24（減衰 d×0.4）、E(0.005, d)
      parts: {
        rin: {
          refDb: -12,
          attackS: 0.005,
          partials: [
            { fMul: 1, beatMul: 0, db: -12, decayMul: 1 },
            { fMul: 1, beatMul: 1, db: -12, decayMul: 1 },
            { fMul: 2.76, beatMul: 0, db: -24, decayMul: 0.4 },
          ],
        },
      },
      // 音ID → 部品と引数。uiRin はタイトルの確認音 rin(880, 1, 1.2)@−12 を busUi へ（10 §M0b）
      sounds: {
        uiRin: { part: 'rin', fHz: 880, beatHz: 1, decayS: 1.2, db: -12, bus: 'ui', priority: 0, fixedPitch: true },
      },
    },
    desc: '効果音の作り方の表（08 3章）',
  },
};
