// readme https://playwright.dev/
import { expect, test } from '@playwright/test';

test.describe('Startup', () => {

  test('has title', async ({ page }) => {
    await page.goto('./admin/login');
    await expect(page).toHaveTitle(/Login - Payload/);
  });

});
