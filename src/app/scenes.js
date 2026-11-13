// 場面の切替（09 1.4）。M0a は試験場（sandbox）だけ。title・devMenu などは M0b 以降で足す。
import { createSceneWorld, hasSceneWorld } from '../sim/world.js';

/**
 * @param {Object} game  boot が作るゲーム全体の入れ物（world・cfg・frame・bus を持つ）
 */
export function createScenes(game) {
  return {
    /** その場面が今のMで使えるか。 */
    has(name) {
      return hasSceneWorld(name);
    },
    /**
     * 場面を読み込む。ワールドを作り直し、見た目を作り直す。
     * @param {string} name
     * @param {{char?:string, seed?:number}} [o]
     */
    async load(name, o = {}) {
      const seed = o.seed ?? game.seed;
      const charId = o.char ?? game.charId;
      const world = createSceneWorld(name, { seed, cfg: game.cfg, charId });
      game.world = world;
      game.scene = name;
      game.seed = seed;
      game.charId = charId;
      game.bus.clear();
      game.frame.setWorld(world);
      game.frame.render(world, 1);
    },
  };
}
