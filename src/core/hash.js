// 状態ハッシュ（FNV-1a 32bit）。リプレイの一致検査に使う（09 11.2）。
// world の形は sim/world.js が決める。ここは渡された値を読むだけで、import はしない。

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const POS_SCALE = 1000; // 位置・速度・角度は ×1000 して丸めた整数で入れる
const LOCAL_F_SCALE = 4096; // 局所時間は 1/4096 単位

/** 逐次に値を足していくハッシュ器。 */
export function createHasher() {
  let h = FNV_OFFSET;
  const byte = (b) => {
    h ^= b & 0xff;
    h = Math.imul(h, FNV_PRIME) >>> 0;
  };
  const api = {
    /** 32bit 整数（符号なしに畳む）。 */
    u32(n) {
      const v = n >>> 0;
      byte(v);
      byte(v >>> 8);
      byte(v >>> 16);
      byte(v >>> 24);
      return api;
    },
    /** 実数を ×1000 して丸めた整数として入れる。 */
    milli(x) {
      return api.u32(Math.round(x * POS_SCALE));
    },
    /** 文字列（UTF-16 の符号単位を2バイトずつ）。長さも入れる。 */
    str(s) {
      api.u32(s.length);
      for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i);
        byte(c);
        byte(c >>> 8);
      }
      return api;
    },
    bool(b) {
      byte(b ? 1 : 0);
      return api;
    },
    value() {
      return h >>> 0;
    },
    hex() {
      return (h >>> 0).toString(16).padStart(8, '0');
    },
  };
  return api;
}

/** 種とラベルから別の種を作る（乱数の流れを分ける。09 4.4）。 */
export function hash32(seed, label) {
  return createHasher().u32(seed).str(label).value();
}

/** 文字列のハッシュ（8桁16進）。 */
export function hashString(s) {
  return createHasher().str(s).hex();
}

/**
 * ワールドの状態ハッシュ（8桁16進）。
 * 入れるもの：tick、乱数の内部状態、全エンティティ（ID順）、カメラ。
 * 弾・地脈・穢域・穢石は、その機能を作るMでここに足す。
 */
export function hashWorld(world) {
  const h = createHasher();
  h.u32(world.tick);
  for (const r of world.rngs) {
    for (let i = 0; i < r.s.length; i++) h.u32(r.s[i]);
  }
  h.milli(world.time.worldMul).milli(world.time.worldMulNext);
  h.u32(world.entities.length);
  for (const e of world.entities) {
    h.u32(e.id).str(e.kind);
    h.milli(e.pos[0]).milli(e.pos[1]).milli(e.pos[2]);
    h.milli(e.vel[0]).milli(e.vel[1]).milli(e.vel[2]);
    h.milli(e.yawDeg);
    h.u32(e.hp).str(e.state).str(e.moveId ?? '');
    h.u32(Math.round(e.localF * LOCAL_F_SCALE));
    h.u32(e.hitstopUntil).u32(e.slowUntil).bool(e.grounded);
    h.u32(e.fu).u32(e.magatama).u32(e.kekkai);
  }
  const c = world.camera;
  h.milli(c.pos[0]).milli(c.pos[1]).milli(c.pos[2]);
  h.milli(c.yawDeg).milli(c.pitchDeg).milli(c.distM).milli(c.fovYDeg);
  h.str(c.mode).u32(c.lockId ?? 0);
  return h.hex();
}
