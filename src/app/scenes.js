// 場面の切替（09 1.4、01 5.1）。シムの場面（sandbox …）の読込と、画面（title・devMenu・play・pause）の流れ。
// M0b：title → 試験メニュー（devMenuOn）→ 試験場。一時停止は「続ける／タイトルへ」だけ。
// 縦向き・画面の高さ不足は重ねの案内（rotatePrompt）で、play なら一時停止を開く。
import { createSceneWorld, hasSceneWorld } from '../sim/world.js';

/** 遊ぶ場面（シムが動く場面）。 */
const PLAY_SCENES = new Set(['sandbox', 'stage', 'boss', 'fu-test']);

/**
 * @param {Object} game  boot が作るゲーム全体の入れ物（world・cfg・frame・bus・ui・router・loop を持つ）
 */
export function createScenes(game) {
  const isPlay = () => PLAY_SCENES.has(game.scene);

  /** 今の画面に合わせて、シムのループ・入力層・ボタンの表示を決める。 */
  function sync() {
    const blocked = game.blockMode !== null;
    const running = isPlay() && !game.paused && !blocked;
    game.loop?.setPaused(!running, game.paused ? 'menu' : 'screen');
    game.router?.setEnabled(running);
    game.ui?.buttons.setVisible(isPlay());
  }

  function hideMenus() {
    game.ui?.title.hide();
    game.ui?.devMenu.hide();
    game.ui?.pause.hide();
  }

  const api = {
    isPlay,
    /** その場面が今のMで使えるか（シムの場面）。 */
    has(name) {
      return hasSceneWorld(name);
    },
    /**
     * シムの場面を読み込む。ワールドを作り直し、見た目を作り直す（画面は変えない）。
     * @param {string} name
     * @param {{char?:string, seed?:number}} [o]
     */
    async load(name, o = {}) {
      const seed = o.seed ?? game.seed;
      const charId = o.char ?? game.charId;
      const world = createSceneWorld(name, { seed, cfg: game.cfg, charId });
      game.world = world;
      game.seed = seed;
      game.charId = charId;
      game.bus.clear();
      game.frame.setWorld(world);
      game.frame.render(world, 1);
    },
    /** シムの場面へ入って遊ぶ。 @param {string} name @param {{char?:string, seed?:number}} [o] */
    async startPlay(name, o = {}) {
      await api.load(name, o);
      game.scene = name;
      game.paused = false;
      game.collector?.reset();
      hideMenus();
      sync();
    },
    /** タイトル（背後のワールドはそのまま。シムは止める）。 */
    toTitle() {
      game.scene = 'title';
      game.paused = false;
      hideMenus();
      game.ui?.title.show();
      sync();
    },
    /** 試験メニュー（10 §4.4）。 */
    toDevMenu() {
      game.scene = 'devMenu';
      game.paused = false;
      hideMenus();
      game.ui?.devMenu.show();
      sync();
    },
    /** 一時停止メニューを開く（play の間だけ）。 */
    openPause() {
      if (!isPlay() || game.paused) return;
      game.paused = true;
      game.ui?.pause.show();
      sync();
    },
    closePause() {
      if (!game.paused) return;
      game.paused = false;
      game.ui?.pause.hide();
      sync();
    },
    togglePause() {
      if (game.paused) api.closePause();
      else api.openPause();
    },
    /**
     * 重ねの案内（縦向き・高さ不足）。出たら全指を解放し、play なら一時停止。消えても一時停止のまま（01 5.1）。
     * @param {'rotate'|'height'|null} mode
     */
    setBlock(mode) {
      if (mode === game.blockMode) return;
      game.blockMode = mode;
      game.ui?.rotate.show(mode);
      if (mode) {
        game.router?.releaseAll();
        api.openPause();
      }
      sync();
    },
    sync,
  };
  return api;
}
