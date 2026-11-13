// Playwright の設定（09 11.3）。スマホ横画面（844×390・DPR2・タッチ）でヘッドレス Chromium を動かす。
import { defineConfig } from '@playwright/test';
import { input } from './src/config/input.js';

const [width, height] = input.refViewPx.v;

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.spec.js',
  outputDir: 'test-results',
  workers: 2,
  retries: 0,
  timeout: 60000,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173/',
    viewport: { width, height },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
    trace: 'off',
    launchOptions: {
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
    },
  },
  webServer: {
    command: 'npx vite build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/',
    timeout: 120000,
    reuseExistingServer: true,
  },
});
