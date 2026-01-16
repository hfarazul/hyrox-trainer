import { test, expect } from '@playwright/test';

test.describe('HYROX Trainer App', () => {
  test('loads the home page', async ({ page }) => {
    await page.goto('/');

    // Check the main title
    await expect(page).toHaveTitle(/HYTRAIN/i);
  });

  test('navigates to the app page', async ({ page }) => {
    await page.goto('/app');

    // Wait for page to load and check it renders
    await expect(page.locator('body')).toBeVisible();
  });
});
