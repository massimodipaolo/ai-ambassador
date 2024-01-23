// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

import { PlaywrightTestConfig } from '@playwright/test';

const serverURL = process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:4000';
const basePath = process.env.PAYLOAD_PUBLIC_BASE_PATH || '';

const config: PlaywrightTestConfig = {
  testDir: '.',
  testMatch: [
    'src/**/*e2e.test.{js,jsx,ts,tsx}',
  ],
  workers: 999,
  timeout: 600000,
  webServer: {
    command: 'npm run serve',
    url: serverURL,
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: serverURL + basePath,
    // headless: false,
    // viewport: { width: 1280, height: 720 },
    // ignoreHTTPSErrors: true,
    // video: 'on-first-retry',
  },
  globalSetup: './playwright.setup',
};

export default config;
