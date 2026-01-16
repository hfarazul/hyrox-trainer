import { test, expect } from '@playwright/test';

test.describe('HYROX Trainer App', () => {
  test('loads the home page', async ({ page }) => {
    await page.goto('/');

    // Check the main title or logo exists
    await expect(page).toHaveTitle(/HYROX/i);
  });

  test('navigates to the app page', async ({ page }) => {
    await page.goto('/app');

    // Should see the main app components
    await expect(page.getByText(/Your Equipment/i)).toBeVisible();
  });
});
