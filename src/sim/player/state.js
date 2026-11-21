// 状態の出入りと、状態に入ってからの局所f（02 §1）。fsm と stageLogic が共用する。

const TICK_EPS = 1e-6; // num-ok: 局所f の切り捨ての誤差よけ（1/4096 の和）

/** この tick の、状態に入ってからの局所f（入った tick が 1）。 @param {{localF:number, mv:{stateStart:number}}} p */
export function stateF(p) {
  return Math.floor(p.localF - p.mv.stateStart + TICK_EPS);
}

/** 状態を変える。now=true ならこの tick を f1 に（この tick に動く）、false なら次の tick を f1 に。 @param {{state:string, localF:number, scale:number, mv:{stateStart:number}}} p @param {string} state */
export function enterState(p, state, now = true) {
  p.state = state;
  p.mv.stateStart = now ? p.localF - p.scale : p.localF;
}

