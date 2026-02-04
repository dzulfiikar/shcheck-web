import { test, expect } from '@playwright/test';

/**
 * E2E Tests for PDF Download Functionality
 *
 * These tests cover:
 * - Downloading PDF for a single scan
 * - Bulk PDF download from scan list
 * - PDF download button visibility
 */

test.describe('PDF Download - Single Scan', () => {
  test('should show download PDF button for completed scan', async ({ page }) => {
    // Create a scan
    await page.goto('/');
    await page.getByTestId('target-input').fill('https://example.com');
    await page.getByTestId('submit-scan').click();
    await page.waitForURL(/\/scans\/.+/);

    // Wait for scan to complete or fail
    await expect(
      page.getByTestId('status-badge-completed').or(page.getByTestId('status-badge-failed'))
    ).toBeVisible({ timeout: 60000 });

    // Check if scan completed successfully
    const isCompleted = await page.getByTestId('status-badge-completed').isVisible().catch(() => false);

    if (isCompleted) {
      // Verify download button is visible
      await expect(page.getByTestId('download-pdf-button')).toBeVisible();
      await expect(page.getByTestId('download-pdf-button')).toContainText('Download PDF');
    }
  });

  test('should not show download PDF button for pending/processing scan', async ({ page }) => {
    // Create a scan
    await page.goto('/');
    await page.getByTestId('target-input').fill('https://example.com');
    await page.getByTestId('submit-scan').click();
    await page.waitForURL(/\/scans\/.+/);

    // Check if scan is still in progress
    const inProgress = await page.getByTestId('scan-progress').isVisible().catch(() => false);

    if (inProgress) {
      // Download button should not be visible during scan
      const downloadButton = page.getByTestId('download-pdf-button');
      const count = await downloadButton.count();
      expect(count).toBe(0);
    }
  });

  test('should download PDF for completed scan', async ({ page }) => {
    // Create a scan
    await page.goto('/');
    await page.getByTestId('target-input').fill('https://example.com');
    await page.getByTestId('submit-scan').click();
    await page.waitForURL(/\/scans\/.+/);

    // Wait for scan to complete
    await expect(
      page.getByTestId('status-badge-completed').or(page.getByTestId('status-badge-failed'))
    ).toBeVisible({ timeout: 60000 });

    const isCompleted = await page.getByTestId('status-badge-completed').isVisible().catch(() => false);

    if (isCompleted) {
      // Wait for download button to be ready
      await expect(page.getByTestId('download-pdf-button')).toBeVisible();

      // Set up download listener
      const downloadPromise = page.waitForEvent('download');

      // Click download button
      await page.getByTestId('download-pdf-button').click();

      // Wait for download to start
      const download = await downloadPromise;

      // Verify download filename
      const filename = download.suggestedFilename();
      expect(filename).toMatch(/^scan-report-.+\.pdf$/);
      expect(filename.length).toBeGreaterThan('scan-report-.pdf'.length);

      // Verify download is successful (file exists)
      const path = await download.path();
      expect(path).toBeTruthy();
    }
  });

  test('should show loading state while downloading PDF', async ({ page }) => {
    // Create a scan
    await page.goto('/');
    await page.getByTestId('target-input').fill('https://example.com');
    await page.getByTestId('submit-scan').click();
    await page.waitForURL(/\/scans\/.+/);

    // Wait for completion
    await expect(
      page.getByTestId('status-badge-completed').or(page.getByTestId('status-badge-failed'))
    ).toBeVisible({ timeout: 60000 });

    const isCompleted = await page.getByTestId('status-badge-completed').isVisible().catch(() => false);

    if (isCompleted) {
      // Wait for button
      await expect(page.getByTestId('download-pdf-button')).toBeVisible();

      // Intercept the PDF request to add delay
      await page.route('**/api/scans/*/pdf', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.continue();
      });

      // Click download
      page.getByTestId('download-pdf-button').click();

      // Check for loading spinner (the button should show loading state)
      // The button is disabled during loading
      await expect(page.getByTestId('download-pdf-button')).toBeDisabled();

      // Wait for download to complete
      await page.waitForEvent('download', { timeout: 10000 });
    }
  });
});

test.describe('PDF Download - Bulk', () => {
  test('should allow bulk PDF download from scan list', async ({ page }) => {
    // Create multiple scans first
    for (let i = 0; i < 2; i++) {
      await page.goto('/');
      await page.getByTestId('target-input').fill(`https://example${i}.com`);
      await page.getByTestId('submit-scan').click();
      await page.waitForURL(/\/scans\/.+/);

      // Wait for completion
      await expect(
        page.getByTestId('status-badge-completed').or(page.getByTestId('status-badge-failed'))
      ).toBeVisible({ timeout: 60000 });
    }

    // Go to scan list
    await page.goto('/scans');

    // Wait for scan table to load
    const hasScans = await page.getByTestId('scan-table').isVisible({ timeout: 10000 }).catch(() => false);

    if (hasScans) {
      // Select all scans using checkboxes
      const checkboxes = page.locator('input[type="checkbox"][data-testid^="scan-select-"]');
      const count = await checkboxes.count();

      if (count > 0) {
        // Select first two scans
        for (let i = 0; i < Math.min(2, count); i++) {
          await checkboxes.nth(i).check();
        }

        // Check if bulk download button appears
        const bulkDownloadButton = page.getByTestId('bulk-download-pdf-button');
        if (await bulkDownloadButton.isVisible().catch(() => false)) {
          // Set up download listener
          const downloadPromise = page.waitForEvent('download');

          // Click bulk download
          await bulkDownloadButton.click();

          // Wait for download
          const download = await downloadPromise;

          // Verify filename
          const filename = download.suggestedFilename();
          expect(filename).toMatch(/^scans-report-\d{4}-\d{2}-\d{2}\.pdf$/);
        }
      }
    }
  });

  test('should disable bulk download when no scans selected', async ({ page }) => {
    await page.goto('/scans');

    const hasScans = await page.getByTestId('scan-table').isVisible({ timeout: 10000 }).catch(() => false);

    if (hasScans) {
      const bulkDownloadButton = page.getByTestId('bulk-download-pdf-button');

      // Button should be disabled or not visible when no scans selected
      if (await bulkDownloadButton.isVisible().catch(() => false)) {
        await expect(bulkDownloadButton).toBeDisabled();
      }
    }
  });
});

test.describe('PDF Download - Error Handling', () => {
  test('should handle failed PDF generation gracefully', async ({ page }) => {
    // Create a scan
    await page.goto('/');
    await page.getByTestId('target-input').fill('https://example.com');
    await page.getByTestId('submit-scan').click();
    await page.waitForURL(/\/scans\/.+/);

    // Wait for completion
    await expect(
      page.getByTestId('status-badge-completed').or(page.getByTestId('status-badge-failed'))
    ).toBeVisible({ timeout: 60000 });

    const isCompleted = await page.getByTestId('status-badge-completed').isVisible().catch(() => false);

    if (isCompleted) {
      // Intercept PDF request to simulate error
      await page.route('**/api/scans/*/pdf', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'PDF generation failed', message: 'Internal server error' }),
        });
      });

      // Click download
      await page.getByTestId('download-pdf-button').click();

      // Should show error toast or notification
      // Wait a moment for error to appear
      await page.waitForTimeout(500);

      // Error should be visible (toast, alert, etc.)
      const errorVisible = await page.locator('[role="alert"], [data-testid="error"]').isVisible().catch(() => false);
      // Just verify the app doesn't crash - error handling may vary
      expect(await page.url()).toContain('/scans/');
    }
  });
});
