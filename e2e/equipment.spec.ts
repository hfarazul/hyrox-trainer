import { test, expect } from '@playwright/test';

test.describe('Equipment Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app');
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
  });

  test('app page loads successfully', async ({ page }) => {
    // Just verify the page loaded
    await expect(page.locator('body')).toBeVisible();
  });

  test('page has interactive elements', async ({ page }) => {
    // Check for any buttons on the page
    const buttons = page.locator('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  });
});
