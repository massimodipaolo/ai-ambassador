import { chromium, FullConfig } from '@playwright/test';

export async function PlaywrightSetup(config: FullConfig) {
  const { baseURL, storageState } = config.projects[0].use;
  if (!baseURL) {
    throw 'baseUrl is undefined';
  }
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(baseURL);
  await page.getByLabel('Email').fill('admin@bowl-payload.com');
  await page.getByLabel('Password').fill('admin');
  await page.getByText('Login').click();
  await page.context().storageState({ path: storageState as string });
  await browser.close();
}

export default PlaywrightSetup;
