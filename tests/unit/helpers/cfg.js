// テスト用の設定（既定値）。
import { buildConfig } from '../../../src/core/config.js';
import { configTables } from '../../../src/config/index.js';

export { configTables };

export function makeCfg() {
  return buildConfig(configTables);
}
