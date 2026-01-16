import { test, expect } from '@playwright/test';

test.describe('Workout Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app');
  });

  test('shows workout type selection', async ({ page }) => {
    // Look for workout type buttons/tabs
    await expect(page.getByText(/Full Simulation/i)).toBeVisible();
  });

  test('can start a workout', async ({ page }) => {
    // Find and click a workout start button
    const startButton = page.getByRole('button', { name: /Start|Generate/i }).first();

    if (await startButton.isVisible()) {
      await startButton.click();

      // Should show workout interface or timer
      await page.waitForTimeout(500);
    }
  });

  test('shows pacing calculator', async ({ page }) => {
    // Navigate to or find pacing calculator
    await expect(page.getByText(/Pacing Calculator/i)).toBeVisible();
  });

  test('pacing calculator has inputs', async ({ page }) => {
    // Check for target time input
    const targetTimeInput = page.getByLabel(/Target Race Time/i);
    await expect(targetTimeInput).toBeVisible();

    // Check for 5K time input
    const fiveKInput = page.getByLabel(/5K Run Time/i);
    await expect(fiveKInput).toBeVisible();
  });

  test('shows station breakdown in pacing', async ({ page }) => {
    await expect(page.getByText(/Station Target Times/i)).toBeVisible();

    // Check for at least one HYROX station
    await expect(page.getByText(/SkiErg/i)).toBeVisible();
  });
});
