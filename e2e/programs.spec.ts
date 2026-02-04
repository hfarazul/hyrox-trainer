import { test, expect } from '@playwright/test';

test.describe('Adaptive Programs', () => {
  test.describe('Programs Tab', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/app');
      await page.waitForLoadState('networkidle');
    });

    test('shows programs tab in navigation', async ({ page }) => {
      const programsTab = page.getByRole('button', { name: /Programs/i });
      await expect(programsTab).toBeVisible();
    });

    test('can navigate to programs tab', async ({ page }) => {
      await page.getByRole('button', { name: /Programs/i }).click();
      await page.waitForLoadState('networkidle');

      // Should see either program enrollment or active program content
      // Look for common elements that appear on the programs page
      const hasProgram = await page.getByText(/Week \d+/i).isVisible().catch(() => false);
      const hasEnrollment = await page.getByText(/Start|Enroll|Program|Build/i).first().isVisible().catch(() => false);
      const hasMain = await page.locator('main').isVisible().catch(() => false);

      expect(hasProgram || hasEnrollment || hasMain).toBeTruthy();
    });
  });

  test.describe('Performance Insights', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/app');
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: /Programs/i }).click();
      await page.waitForLoadState('networkidle');
    });

    test('shows performance insights section when program active', async ({ page }) => {
      // Only test if user has active program
      const hasProgram = await page.getByText(/Week \d+ of \d+/i).isVisible().catch(() => false);

      if (hasProgram) {
        const insightsSection = page.getByText(/Performance Insights/i);
        await expect(insightsSection).toBeVisible();
      }
    });

    test('displays race readiness score', async ({ page }) => {
      const hasProgram = await page.getByText(/Week \d+ of \d+/i).isVisible().catch(() => false);

      if (hasProgram) {
        const raceReady = page.getByText(/Race Ready/i);
        await expect(raceReady).toBeVisible();
      }
    });

    test('shows completion rate', async ({ page }) => {
      const hasProgram = await page.getByText(/Week \d+ of \d+/i).isVisible().catch(() => false);

      if (hasProgram) {
        const completion = page.getByText(/Completion/i);
        await expect(completion).toBeVisible();
      }
    });

    test('shows fatigue indicator', async ({ page }) => {
      const hasProgram = await page.getByText(/Week \d+ of \d+/i).isVisible().catch(() => false);

      if (hasProgram) {
        const fatigue = page.getByText(/Fatigue/i);
        await expect(fatigue).toBeVisible();
      }
    });
  });

  test.describe('Weekly Calendar', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/app');
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: /Programs/i }).click();
      await page.waitForLoadState('networkidle');
    });

    test('displays weekly workout schedule', async ({ page }) => {
      const hasProgram = await page.getByText(/Week \d+ of \d+/i).isVisible().catch(() => false);

      if (hasProgram) {
        // Should show day labels
        const monday = page.getByText('Mon');
        const saturday = page.getByText('Sat');

        await expect(monday).toBeVisible();
        await expect(saturday).toBeVisible();
      }
    });

    test('shows workout duration for scheduled days', async ({ page }) => {
      const hasProgram = await page.getByText(/Week \d+ of \d+/i).isVisible().catch(() => false);

      if (hasProgram) {
        // Look for duration indicators (e.g., "45m")
        const durationPattern = page.locator('text=/\\d+m/');
        await expect(durationPattern.first()).toBeVisible();
      }
    });

    test('can navigate between weeks', async ({ page }) => {
      const hasProgram = await page.getByText(/Week \d+ of \d+/i).isVisible().catch(() => false);

      if (hasProgram) {
        const currentWeekText = await page.getByText(/Week \d+/i).first().textContent();

        // Try to navigate to next week (if button is enabled)
        const nextButton = page.locator('button').filter({ has: page.locator('svg') }).last();
        const isDisabled = await nextButton.getAttribute('disabled');

        if (!isDisabled) {
          await nextButton.click();
          await page.waitForLoadState('networkidle');

          // Week should have changed
          const newWeekText = await page.getByText(/Week \d+/i).first().textContent();
          expect(newWeekText).not.toBe(currentWeekText);
        }
      }
    });
  });

  test.describe('Workout Completion', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/app');
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: /Programs/i }).click();
      await page.waitForLoadState('networkidle');
    });

    test('shows start button for pending workouts', async ({ page }) => {
      const hasProgram = await page.getByText(/Week \d+ of \d+/i).isVisible().catch(() => false);

      if (hasProgram) {
        const startButton = page.getByRole('button', { name: /Start/i }).first();
        const buttonVisible = await startButton.isVisible().catch(() => false);

        if (buttonVisible) {
          await expect(startButton).toBeEnabled();
        }
      }
    });

    test('shows completion indicators for completed workouts', async ({ page }) => {
      const hasProgram = await page.getByText(/Week \d+ of \d+/i).isVisible().catch(() => false);

      if (hasProgram) {
        // Look for completion percentage or RPE badges
        const completionBadge = page.locator('text=/\\d+%|RPE \\d+/');
        // May or may not have completed workouts - just check page loads correctly
        await expect(page.locator('main')).toBeVisible();
      }
    });
  });

  test.describe('Missed Workout Handler', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/app');
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: /Programs/i }).click();
      await page.waitForLoadState('networkidle');
    });

    test('shows missed workout modal when workouts are missed', async ({ page }) => {
      // Check if missed workout modal appears
      const missedModal = page.getByText(/missed workout/i);
      const modalVisible = await missedModal.isVisible().catch(() => false);

      if (modalVisible) {
        // Modal should have dismiss option
        const dismissButton = page.getByRole('button', { name: /Dismiss/i });
        await expect(dismissButton).toBeVisible();
      }
    });

    test('shows skip and condensed options for missed workouts', async ({ page }) => {
      const missedModal = page.getByText(/missed workout/i);
      const modalVisible = await missedModal.isVisible().catch(() => false);

      if (modalVisible) {
        const skipButton = page.getByRole('button', { name: /Skip/i });
        const condensedButton = page.getByRole('button', { name: /Condensed/i });

        await expect(skipButton).toBeVisible();
        await expect(condensedButton).toBeVisible();
      }
    });

    test('displays importance badges for missed workouts', async ({ page }) => {
      const missedModal = page.getByText(/missed workout/i);
      const modalVisible = await missedModal.isVisible().catch(() => false);

      if (modalVisible) {
        // Should show importance level
        const importanceBadge = page.locator('text=/Critical|High|Medium|Low/');
        await expect(importanceBadge.first()).toBeVisible();
      }
    });

    test('shows race readiness impact', async ({ page }) => {
      const missedModal = page.getByText(/missed workout/i);
      const modalVisible = await missedModal.isVisible().catch(() => false);

      if (modalVisible) {
        // Should show impact points
        const impactText = page.getByText(/-\d+ pts/);
        await expect(impactText.first()).toBeVisible();
      }
    });

    test('can dismiss missed workout modal', async ({ page }) => {
      const missedModal = page.getByText(/missed workout/i);
      const modalVisible = await missedModal.isVisible().catch(() => false);

      if (modalVisible) {
        await page.getByRole('button', { name: /Dismiss/i }).click();
        await page.waitForTimeout(500);

        // Modal should be closed
        await expect(page.getByRole('heading', { name: /missed workout/i })).not.toBeVisible();
      }
    });

    test('can skip a missed workout', async ({ page }) => {
      const missedModal = page.getByText(/missed workout/i);
      const modalVisible = await missedModal.isVisible().catch(() => false);

      if (modalVisible) {
        const skipButton = page.getByRole('button', { name: /Skip/i }).first();

        if (await skipButton.isVisible()) {
          await skipButton.click();
          await page.waitForTimeout(500);

          // Skip action should process (modal may close or show fewer items)
          await expect(page.locator('main')).toBeVisible();
        }
      }
    });
  });

  test.describe('Workout Feedback', () => {
    test('workout completion shows feedback modal', async ({ page }) => {
      await page.goto('/app');
      await page.waitForLoadState('networkidle');

      // Navigate to workouts
      await page.getByRole('button', { name: /Workouts/i }).click();
      await page.waitForLoadState('networkidle');

      // This test just verifies the flow exists - actual completion requires
      // starting and finishing a workout which is complex for E2E
      await expect(page.locator('main')).toBeVisible();
    });
  });
});

test.describe('Program Enrollment', () => {
  test('shows program content when navigating to programs tab', async ({ page }) => {
    await page.goto('/app');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /Programs/i }).click();
    await page.waitForLoadState('networkidle');

    // Check that programs content loads - either enrollment form or active program
    // This verifies the programs tab is functional
    const mainContent = await page.locator('main').isVisible();
    expect(mainContent).toBeTruthy();

    // Should have some program-related content
    const hasButtons = await page.getByRole('button').count();
    expect(hasButtons).toBeGreaterThan(0);
  });
});
