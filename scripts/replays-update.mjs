// リプレイの JSON を src から作り直す（npm run replays:update）。
// 意図して挙動を変えたときだけ使い、PR の説明に「リプレイ更新：理由」を書く（09 11.2）。
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPLAY_DIR, buildReplayJson, listReplaySources } from '../tests/replays/runner.js';

/** frames の各行（[回数, 入力]）を1行ずつにして、差分を読みやすくする。 */
function format(json) {
  const { frames, ...rest } = json;
  const head = JSON.stringify(rest, null, 2).replace(/\n}$/, '');
  const rows = frames.map((f) => `    ${JSON.stringify(f)}`).join(',\n');
  return `${head},\n  "frames": [\n${rows}\n  ]\n}\n`;
}

const names = listReplaySources();
for (const name of names) {
  const json = await buildReplayJson(name);
  writeFileSync(join(REPLAY_DIR, `${name}.json`), format(json));
  console.log(`更新：tests/replays/${name}.json（${json.ticks} tick、final ${json.hashes.final}）`);
}
if (names.length === 0) console.log('tests/replays/src にスクリプトがありません');
