// 保存の読み書き（09 9章）。localStorage に触るのはこのファイルだけ（不変条件9）。
// キー：tokoyo:save（本体）／tokoyo:save.bak（壊れたデータの退避）／tokoyo:debug（調整パネルの値）。
/** @import {SaveDataV1} from '../data/types.js' */
import { parseSaveText, serializeSave } from '../core/saveSchema.js';

/** 使える localStorage を返す。使えない環境（プライベートモード・無効化）は null。 */
function defaultBackend() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * @param {{saveKeyPrefix:string}} saveCfg
 * @param {{getItem:(k:string)=>string|null, setItem:(k:string, v:string)=>void, removeItem:(k:string)=>void}|null} [backend]
 *   試験用に差し替えられる。省略時はブラウザの localStorage
 * @param {()=>number} [now] 保存時刻を返す関数（試験用に差し替えられる）
 */
export function createStorage(saveCfg, backend = defaultBackend(), now = () => Date.now()) {
  const keySave = `${saveCfg.saveKeyPrefix}save`;
  const keyBak = `${saveCfg.saveKeyPrefix}save.bak`;
  const keyDebug = `${saveCfg.saveKeyPrefix}debug`;
  const state = { saveFailed: false };

  function read(key) {
    try {
      return backend ? backend.getItem(key) : null;
    } catch {
      return null;
    }
  }
  function write(key, text) {
    try {
      if (!backend) return false;
      backend.setItem(key, text);
      return true;
    } catch {
      return false;
    }
  }

  function remove(key) {
    try {
      backend?.removeItem(key);
    } catch {
      // 消せなくても続ける
    }
  }

  return {
    keys: { save: keySave, bak: keyBak, debug: keyDebug },
    /** 書き込みに失敗したことがあるか（容量・プライベートモード）。HUD が1回だけ知らせる */
    get saveFailed() {
      return state.saveFailed;
    },
    /**
     * 保存を読む。壊れている・版が無い・未来の版は .bak に退避して既定値を返す（例外は出さない）。
     * @returns {{data:SaveDataV1, status:string, backedUp:boolean}}
     */
    loadSave() {
      const text = read(keySave);
      const r = parseSaveText(text);
      let backedUp = false;
      if (r.backup && text !== null) {
        backedUp = write(keyBak, text);
        if (backedUp) remove(keySave); // 退避できたら元を消す（次の起動でまた退避して .bak を上書きしないため）
      }
      return { data: r.data, status: r.status, backedUp };
    },
    /** 保存を書く。保存時刻はここで付ける。 @param {SaveDataV1} data @returns {boolean} 成功したか */
    writeSave(data) {
      data.updatedAt = now();
      const ok = write(keySave, serializeSave(data));
      if (!ok) state.saveFailed = true;
      return ok;
    },
    /** 調整パネルの値（既定から変えたキーだけ）。?debug=1 のときだけ読む。 @returns {Record<string, unknown>} */
    loadDebug() {
      const text = read(keyDebug);
      if (text === null) return {};
      try {
        const obj = JSON.parse(text);
        return typeof obj === 'object' && obj !== null && !Array.isArray(obj) ? obj : {};
      } catch {
        return {};
      }
    },
    /** @param {Record<string, unknown>} overrides */
    writeDebug(overrides) {
      return write(keyDebug, JSON.stringify(overrides));
    },
    clearDebug() {
      remove(keyDebug);
    },
  };
}
