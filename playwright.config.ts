import { defineConfig, devices } from '@playwright/test';

const BASE = 'http://localhost:4321/cs-edu-site/';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  // 無限ループ系のテストがCPUを焼くので、並列数は控えめにする
  workers: 4,
  retries: process.env.CI ? 2 : 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // WebKitはWSL2/CIでシステムライブラリが揃わないことがあるため、モバイルはChromiumで検証する
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'pnpm build && pnpm preview',
    url: BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
