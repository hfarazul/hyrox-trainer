import { test, expect } from '@playwright/test';

test.describe('Equipment Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app');
  });

  test('displays equipment selector', async ({ page }) => {
    await expect(page.getByText('Your Equipment')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Select All' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear' })).toBeVisible();
  });

  test('shows equipment categories', async ({ page }) => {
    await expect(page.getByText('cardio')).toBeVisible();
    await expect(page.getByText('weights')).toBeVisible();
    await expect(page.getByText('bodyweight')).toBeVisible();
  });

  test('toggles equipment selection', async ({ page }) => {
    const dumbbellsButton = page.getByRole('button', { name: 'Dumbbells' });
    await expect(dumbbellsButton).toBeVisible();

    // Click to select
    await dumbbellsButton.click();

    // The button should change appearance (selected state)
    // Check it has the selected class color
    await expect(dumbbellsButton).toHaveClass(/bg-\[#ffed00\]/);
  });

  test('Select All marks all equipment', async ({ page }) => {
    await page.getByRole('button', { name: 'Select All' }).click();

    // Wait for state update
    await page.waitForTimeout(500);

    // Check that count shows all selected
    const countText = page.locator('text=/\\d+ of \\d+ items selected/');
    await expect(countText).toBeVisible();
  });

  test('Clear clears all equipment', async ({ page }) => {
    // First select all
    await page.getByRole('button', { name: 'Select All' }).click();
    await page.waitForTimeout(300);

    // Then clear
    await page.getByRole('button', { name: 'Clear' }).click();
    await page.waitForTimeout(300);

    // Check that count shows 0 selected
    await expect(page.getByText('0')).toBeVisible();
  });
});
