// npm run verify：verify:fast（型検査＋単体テスト＋ビルド）→ e2e 全部 → スクリーンショットの縮小一覧（09 11.4）。
// ブラウザが起動できない環境では verify:fast だけを行い、E2E SKIPPED と表示する（終了コード0）。
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';

const ARTIFACTS = 'tests/artifacts';
const SKIP_FILE = `${ARTIFACTS}/E2E_SKIPPED`;
const t0 = Date.now();

function run(label, cmd, args) {
  const started = Date.now();
  console.log(`\n=== ${label} ===`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  console.log(`--- ${label}：${((Date.now() - started) / 1000).toFixed(1)}s`);
  if (r.status !== 0) {
    console.error(`\nverify 失敗：${label}`);
    process.exit(r.status ?? 1);
  }
}

/** ブラウザを実際に起動して確かめる（ファイルの有無では判定しない）。 */
async function canLaunchBrowser() {
  try {
    const { chromium } = await import('@playwright/test');
    const browser = await chromium.launch();
    await browser.close();
    return true;
  } catch {
    return false;
  }
}

run('verify:fast', 'npm', ['run', 'verify:fast']);

mkdirSync(ARTIFACTS, { recursive: true });
if (!(await canLaunchBrowser())) {
  writeFileSync(SKIP_FILE, 'ブラウザを起動できなかったため、e2e とスクリーンショットを省略しました。\n');
  console.log('\nE2E SKIPPED: ブラウザなし');
  console.log('PROGRESS.md の既知の問題に書き、push 後に CI の結果を確かめてください。');
  process.exit(0);
}
rmSync(SKIP_FILE, { force: true });
rmSync(`${ARTIFACTS}/shots`, { recursive: true, force: true });

run('e2e（スクリーンショットを含む）', 'npx', ['playwright', 'test', '--trace', 'off']);
run('縮小一覧', 'node', ['scripts/contact-sheet.mjs']);

console.log(`\nverify 成功：合計 ${((Date.now() - t0) / 1000).toFixed(1)}s`);
console.log(`${ARTIFACTS}/sheet.png と sheet_gray.png を見て確認してください。`);
