// 楓真（木・1.72m）の造形（07 6.3 の骨、6.4 の部品表、6.5 のばね）。特徴形＝斜めの長柄と鉢巻の尾2本。
// 正面は +Z、左は +X。骨の位置は親からの相対（m）。部品の置き方（offsetM・rotDeg）・髪束の向き・
// 待機の姿勢・ばねの釣り合いの角度は設計書に無いので M1a で決めた（PROGRESS に記録）。
/** @import {BoneDef, RigDef, RigPartDef, SpringDef, V3} from '../types.js' */

const SKIN = '#c99a78';
const HAORI = '#2f5a3e';
const HAORI_LINING = '#24452f';
const DARK = '#26262b';
const OBI = '#3a2e28';
const WHITE = '#f2ecdf';
const TABI = '#e8e0cc';
const HAIR_BAND = '#4a5a8a';
const SHAFT = '#2a2622';
const BLADE = '#c9ccd0';
const BLADE_SPINE = '#5d636b';

/** 頭の球の中心（head の骨から上へ） */
const HEAD_UP_M = 0.13;
/** 頭の縦の伸び（07 6.4：sphere r0.135 (1,1.12,1)） */
const HEAD_SY = 1.12;

/** @type {BoneDef[]} 07 6.3 の表（人型）と、ばね専用の骨 */
const bones = [
  { name: 'root', parent: null, posM: [0, 0, 0] },
  { name: 'hips', parent: 'root', posM: [0, 0.95, 0] },
  { name: 'spine', parent: 'hips', posM: [0, 0.1, 0] },
  { name: 'chest', parent: 'spine', posM: [0, 0.18, 0] },
  { name: 'neck', parent: 'chest', posM: [0, 0.22, 0] },
  { name: 'head', parent: 'neck', posM: [0, 0.08, 0] },
  { name: 'armL', parent: 'chest', posM: [0.19, 0.17, 0] },
  { name: 'forearmL', parent: 'armL', posM: [0, -0.28, 0] },
  { name: 'handL', parent: 'forearmL', posM: [0, -0.25, 0] },
  { name: 'armR', parent: 'chest', posM: [-0.19, 0.17, 0] },
  { name: 'forearmR', parent: 'armR', posM: [0, -0.28, 0] },
  { name: 'handR', parent: 'forearmR', posM: [0, -0.25, 0] },
  { name: 'weapon', parent: 'handR', posM: [0, -0.06, 0.02] },
  { name: 'thighL', parent: 'hips', posM: [0.1, -0.04, 0] },
  { name: 'shinL', parent: 'thighL', posM: [0, -0.44, 0] },
  { name: 'footL', parent: 'shinL', posM: [0, -0.4, 0] },
  { name: 'thighR', parent: 'hips', posM: [-0.1, -0.04, 0] },
  { name: 'shinR', parent: 'thighR', posM: [0, -0.44, 0] },
  { name: 'footR', parent: 'shinR', posM: [0, -0.4, 0] },
  // ---- 二次（ばね専用。ポーズで指定しない） ----
  { name: 'sleeveL', parent: 'armL', posM: [0.02, -0.02, 0] },
  { name: 'sleeveR', parent: 'armR', posM: [-0.02, -0.02, 0] },
  { name: 'hakamaL', parent: 'hips', posM: [0.1, -0.04, 0] },
  { name: 'hakamaR', parent: 'hips', posM: [-0.1, -0.04, 0] },
  { name: 'hemB', parent: 'hips', posM: [0, -0.02, -0.1] },
  { name: 'hair1', parent: 'head', posM: [0, -0.02, -0.11] },
  { name: 'hair2', parent: 'hair1', posM: [0, -0.08, 0] },
  { name: 'hair3', parent: 'hair2', posM: [0, -0.08, 0] },
  { name: 'hair4', parent: 'hair3', posM: [0, -0.08, 0] },
  { name: 'hachiA1', parent: 'head', posM: [0.03, 0.06, -0.13] },
  { name: 'hachiA2', parent: 'hachiA1', posM: [0, -0.2, 0] },
  { name: 'hachiA3', parent: 'hachiA2', posM: [0, -0.2, 0] },
  { name: 'hachiB1', parent: 'head', posM: [-0.03, 0.06, -0.13] },
  { name: 'hachiB2', parent: 'hachiB1', posM: [0, -0.2, 0] },
  { name: 'hachiB3', parent: 'hachiB2', posM: [0, -0.2, 0] },
];

/**
 * 髪束：頭頂から向き yawDeg（0＝前、90＝左）へ、頭の丸みに沿って垂れる。
 * @param {string} name @param {number} yawDeg @param {number} lenM @param {number} tiltDeg 真下から外へ起こす角度
 * @param {number} widthM @param {number} bowM 反り（頭の丸みに沿う膨らみ） @param {string} color
 * @returns {RigPartDef}
 */
function tuft(name, yawDeg, lenM, tiltDeg, widthM, bowM, color) {
  const rad = (yawDeg * Math.PI) / 180;
  const startM = 0.012; // 頭頂から少し外へずらして、5束が1点に重ならないようにする
  return {
    name,
    shape: 'extrude',
    dims: ['tuft', lenM, 0.2, widthM, bowM],
    bone: 'head',
    offsetM: [Math.sin(rad) * startM, HEAD_UP_M + 0.135 * HEAD_SY - 0.022, Math.cos(rad) * startM],
    rotDeg: [-tiltDeg, yawDeg, 0],
    color,
  };
}

/** @param {'L'|'R'} side @returns {RigPartDef[]} 腕・大袖・手・袴・すね・足 */
function limbs(side) {
  const s = side === 'L' ? 1 : -1;
  /** @type {V3} */
  const none = [0, 0, 0];
  return [
    { name: `armUpper${side}`, shape: 'cyl', dims: [0.055, 0.045, 0.28], bone: `arm${side}`, offsetM: none, rotDeg: none, color: DARK },
    { name: `armFore${side}`, shape: 'cyl', dims: [0.045, 0.035, 0.25], bone: `forearm${side}`, offsetM: none, rotDeg: none, color: DARK },
    // 大袖：腕の外側に垂れる板（後ろの端を少し外へ開く）。裏は暗い色の薄い板を重ねる
    { name: `sleeve${side}`, shape: 'box', dims: [0.3, 0.4, 0.035], bone: `sleeve${side}`, offsetM: [s * 0.058, -0.19, -0.02], rotDeg: [0, s * 84, 0], color: HAORI },
    { name: `sleeveLining${side}`, shape: 'box', dims: [0.28, 0.38, 0.016], bone: `sleeve${side}`, offsetM: [s * 0.036, -0.19, -0.022], rotDeg: [0, s * 84, 0], color: HAORI_LINING },
    { name: `hand${side}`, shape: 'box', dims: [0.08, 0.1, 0.04], bone: `hand${side}`, offsetM: [0, -0.05, 0], rotDeg: [0, 90, 0], color: SKIN },
    { name: `hakama${side}`, shape: 'cone', dims: [0.2, 0.62], bone: `hakama${side}`, offsetM: [0, 0.1, 0], rotDeg: none, color: DARK },
    { name: `shin${side}`, shape: 'cyl', dims: [0.05, 0.045, 0.4], bone: `shin${side}`, offsetM: none, rotDeg: none, color: DARK },
    { name: `foot${side}`, shape: 'box', dims: [0.1, 0.07, 0.24], bone: `foot${side}`, offsetM: [0, -0.035, 0.05], rotDeg: none, color: TABI },
  ];
}

/** @type {RigPartDef[]} 07 6.4 の部品表 */
const parts = [
  { name: 'head', shape: 'sphere', dims: [0.135, 1, HEAD_SY, 1], bone: 'head', offsetM: [0, HEAD_UP_M, 0], rotDeg: [0, 0, 0], color: SKIN },
  { name: 'face', shape: 'cap', dims: [0.137, 70, 1, HEAD_SY, 1], bone: 'head', offsetM: [0, HEAD_UP_M, 0], rotDeg: [0, 0, 0], color: SKIN, faceCell: 0 },
  // 髪の地：頭頂から後ろ頭・うなじを覆う墨色の球冠（部品表に無い追加。髪束だけでは後ろから頭皮が見えるため）
  { name: 'hairBase', shape: 'cap', dims: [0.1375, 104, 1, HEAD_SY, 1], bone: 'head', offsetM: [0, HEAD_UP_M, 0], rotDeg: [-116, 0, 0], color: 'ink' },
  // 髪束×5（長 0.16〜0.22、細り 0.2）。前髪2束（細い1束が藍の帯）と、後ろへ跳ねる3束
  tuft('tuftFrontL', 26, 0.16, 60, 0.07, 0.026, HAIR_BAND),
  tuft('tuftFrontR', -22, 0.17, 58, 0.17, 0.03, 'ink'),
  tuft('tuftBackL', 112, 0.21, 56, 0.16, 0.03, 'ink'),
  tuft('tuftBackR', -112, 0.21, 56, 0.16, 0.03, 'ink'),
  tuft('tuftBack', 180, 0.22, 57, 0.17, 0.03, 'ink'),
  // 後ろ髪（4節の鎖）
  { name: 'hairBack1', shape: 'box', dims: [0.08, 0.1, 0.03], bone: 'hair1', offsetM: [0, -0.04, 0], rotDeg: [0, 0, 0], color: 'ink' },
  { name: 'hairBack2', shape: 'box', dims: [0.08, 0.1, 0.03], bone: 'hair2', offsetM: [0, -0.04, 0], rotDeg: [0, 0, 0], color: 'ink' },
  { name: 'hairBack3', shape: 'box', dims: [0.08, 0.1, 0.03], bone: 'hair3', offsetM: [0, -0.04, 0], rotDeg: [0, 0, 0], color: 'ink' },
  { name: 'hairBack4', shape: 'box', dims: [0.08, 0.1, 0.03], bone: 'hair4', offsetM: [0, -0.04, 0], rotDeg: [0, 0, 0], color: 'ink' },
  // 鉢巻（前を上げて締める。半径は部品表の 0.142 より少し大きい 0.147：髪の地と、縦に伸ばした頭が突き抜けないため）と尾（3節×2本）
  { name: 'hachimaki', shape: 'cyl', dims: [0.147, 0.147, 0.04], bone: 'head', offsetM: [0, HEAD_UP_M + 0.012, 0], rotDeg: [-24, 0, 0], color: WHITE },
  ...['A', 'B'].flatMap((ab) =>
    [1, 2, 3].map((i) => /** @type {RigPartDef} */ ({
      name: `hachiTail${ab}${i}`,
      shape: 'box',
      dims: [0.05, 0.2, 0.01],
      bone: `hachi${ab}${i}`,
      offsetM: [0, -0.1, 0],
      rotDeg: [0, 0, 0],
      color: WHITE,
    })),
  ),
  { name: 'neck', shape: 'cyl', dims: [0.05, 0.06, 0.1], bone: 'neck', offsetM: [0, 0.1, 0], rotDeg: [0, 0, 0], color: SKIN },
  // 胴（羽織）。分割は 10（config/anim.js の rigTorsoSegCount。部品名 torso）
  { name: 'torso', shape: 'lathe', dims: [[0.16, 0], [0.19, 0.18], [0.17, 0.38], [0.13, 0.46]], bone: 'spine', offsetM: [0, 0, 0], rotDeg: [0, 0, 0], color: HAORI },
  { name: 'obi', shape: 'cyl', dims: [0.155, 0.155, 0.07], bone: 'spine', offsetM: [0, 0, 0], rotDeg: [0, 0, 0], color: OBI },
  // 羽織の裾：末広がり r0.17→0.24、高 0.28（腰の後ろの hemB から垂れる）
  { name: 'haoriHem', shape: 'lathe', dims: [[0.17, 0], [0.24, -0.28]], bone: 'hemB', offsetM: [0, 0.05, 0.1], rotDeg: [0, 0, 0], color: HAORI },
  ...limbs('L'),
  ...limbs('R'),
];

/** 長巻：握りの位置が原点。+Z が刃、−Z が石突 */
const GRIP_TO_GUARD_M = 0.35;
const SHAFT_LEN_M = 1.2;
const BLADE_LEN_M = 0.9;
const BLADE_SORI_M = 0.04;
const WRAP_PITCH_M = 0.12; // 柄紐の縞：0.06m の朱と 0.06m の地を交互に

/** @type {RigPartDef[]} */
const weaponParts = [
  { name: 'shaft', shape: 'cyl', dims: [0.022, 0.022, SHAFT_LEN_M], bone: 'weapon', offsetM: [0, 0, GRIP_TO_GUARD_M - SHAFT_LEN_M], rotDeg: [-90, 0, 0], color: SHAFT },
  ...Array.from({ length: Math.round(SHAFT_LEN_M / WRAP_PITCH_M) }, (_, i) => /** @type {RigPartDef} */ ({
    name: `wrap${i}`,
    shape: 'cyl',
    dims: [0.025, 0.025, WRAP_PITCH_M / 2],
    bone: 'weapon',
    offsetM: [0, 0, GRIP_TO_GUARD_M - SHAFT_LEN_M + WRAP_PITCH_M * (i + 0.25)],
    rotDeg: [-90, 0, 0],
    color: 'shuEnv',
  })),
  { name: 'guard', shape: 'cyl', dims: [0.05, 0.05, 0.012], bone: 'weapon', offsetM: [0, 0, GRIP_TO_GUARD_M], rotDeg: [-90, 0, 0], color: BLADE_SPINE },
  // 刃：幅 0.035、反り 0.04。峰（+Y）を上、刃先を下にして +Z へ伸ばす
  { name: 'blade', shape: 'extrude', dims: ['curvedBlade', BLADE_LEN_M, 0.1, 0.035, BLADE_SORI_M], bone: 'weapon', offsetM: [0, 0, GRIP_TO_GUARD_M + 0.012], rotDeg: [0, -90, 90], color: BLADE },
  { name: 'bladeSpine', shape: 'extrude', dims: ['bladeSpine', BLADE_LEN_M, 0.1, 0.012, BLADE_SORI_M], bone: 'weapon', offsetM: [0, 0.0125, GRIP_TO_GUARD_M + 0.012], rotDeg: [0, -90, 90], color: BLADE_SPINE },
];

/** @type {SpringDef[]} 07 6.5 の gainMul と limitDeg。restDeg は釣り合いの角度 [x, z] */
const springs = [
  { bone: 'sleeveL', axes: 'xz', gainMul: 0.06, limitDeg: 70 },
  { bone: 'sleeveR', axes: 'xz', gainMul: 0.06, limitDeg: 70 },
  { bone: 'hakamaL', axes: 'x', gainMul: 0.03, limitDeg: 25 },
  { bone: 'hakamaR', axes: 'x', gainMul: 0.03, limitDeg: 25 },
  { bone: 'hemB', axes: 'xz', gainMul: 0.04, limitDeg: 70 },
  { bone: 'hair1', axes: 'xz', gainMul: 0.08, limitDeg: 70, restDeg: [34, 0] },
  { bone: 'hair2', axes: 'xz', gainMul: 0.08, limitDeg: 70, restDeg: [-10, 0] },
  { bone: 'hair3', axes: 'xz', gainMul: 0.08, limitDeg: 70, restDeg: [-10, 0] },
  { bone: 'hair4', axes: 'xz', gainMul: 0.08, limitDeg: 70, restDeg: [-8, 0] },
  { bone: 'hachiA1', axes: 'xz', gainMul: 0.1, limitDeg: 70, restDeg: [46, 12] },
  { bone: 'hachiA2', axes: 'xz', gainMul: 0.1, limitDeg: 70, restDeg: [-14, 4] },
  { bone: 'hachiA3', axes: 'xz', gainMul: 0.1, limitDeg: 70, restDeg: [-12, 0] },
  { bone: 'hachiB1', axes: 'xz', gainMul: 0.1, limitDeg: 70, restDeg: [36, -14] },
  { bone: 'hachiB2', axes: 'xz', gainMul: 0.1, limitDeg: 70, restDeg: [-10, -4] },
  { bone: 'hachiB3', axes: 'xz', gainMul: 0.1, limitDeg: 70, restDeg: [-14, 0] },
];

/** @type {Record<string, V3>} 待機の基本姿勢：半身に構え、右手の長巻を斜めに提げる（刃は前下、石突は後ろ上） */
const stance = {
  spine: [0, -5, 0],
  chest: [3, -9, 0],
  head: [-2, 12, 0],
  armL: [6, 0, 8],
  forearmL: [-28, 0, 0],
  armR: [16, 0, -12],
  forearmR: [-34, 0, 0],
  handR: [0, 0, 0],
  weapon: [50, -24, 0],
  thighL: [-12, 8, 5],
  shinL: [14, 0, 0],
  footL: [-2, 0, 0],
  thighR: [6, -24, -6],
  shinR: [4, 0, 0],
  footR: [-10, 0, 0],
};

/** @type {RigDef} */
export const fumaRig = {
  scaleMul: 1,
  bones,
  parts,
  springs,
  weapon: { socket: 'weapon', bones: [{ name: 'weapon', parent: null, posM: [0, 0, 0] }], parts: weaponParts },
  stance,
};
