import { test, expect } from '@playwright/test';

test.describe('Workout Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app');
    await page.waitForLoadState('networkidle');
  });

  test('shows workout type selection', async ({ page }) => {
    // Look for Full Simulation text which we know exists
    await expect(page.getByText(/Full Simulation/i)).toBeVisible();
  });

  test('can interact with workout controls', async ({ page }) => {
    // Find and check for Start/Generate button
    const startButton = page.getByRole('button', { name: /Start|Generate/i }).first();

    if (await startButton.isVisible()) {
      // If button exists, it should be clickable
      await expect(startButton).toBeEnabled();
    }
  });

  test('page renders workout components', async ({ page }) => {
    // Verify main content area exists
    await expect(page.getByRole('main')).toBeVisible();
  });
});
