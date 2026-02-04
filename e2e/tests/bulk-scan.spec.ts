import { test, expect } from '@playwright/test';

test.describe('Bulk Scan Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to scan list page
    await page.goto('/scans');
    await page.waitForLoadState('networkidle');
  });

  test('should open bulk scan dialog', async ({ page }) => {
    // Click bulk scan button
    const bulkScanButton = page.getByTestId('bulk-scan-button');
    await expect(bulkScanButton).toBeVisible();
    await bulkScanButton.click();

    // Verify dialog is open
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Bulk Scan')).toBeVisible();
    await expect(page.getByText('Enter multiple URLs to scan, one per line')).toBeVisible();
  });

  test('should show URL count when entering targets', async ({ page }) => {
    // Open dialog
    await page.getByTestId('bulk-scan-button').click();

    // Enter URLs
    const textarea = page.getByTestId('bulk-scan-textarea');
    await textarea.fill('https://example.com\nhttps://test.com\nhttps://demo.com');

    // Verify count is shown
    await expect(page.getByText('3 URL(s) to scan')).toBeVisible();
  });

  test('should disable start button when textarea is empty', async ({ page }) => {
    // Open dialog
    await page.getByTestId('bulk-scan-button').click();

    // Verify start button is disabled
    const startButton = page.getByTestId('start-bulk-scan-button');
    await expect(startButton).toBeDisabled();
  });

  test('should create bulk scans and show them in list', async ({ page }) => {
    // Open dialog
    await page.getByTestId('bulk-scan-button').click();

    // Enter URLs
    const textarea = page.getByTestId('bulk-scan-textarea');
    await textarea.fill('https://example.com\nhttps://test.com');

    // Click start
    const startButton = page.getByTestId('start-bulk-scan-button');
    await startButton.click();

    // Wait for dialog to close (indicates success)
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Verify new scans appear in the list (may take a moment to refresh)
    await page.waitForTimeout(1000);

    // Check that we have scan rows
    const scanRows = page.getByTestId(/^scan-row-/);
    await expect(scanRows.first()).toBeVisible();
  });

  test('should close dialog on cancel', async ({ page }) => {
    // Open dialog
    await page.getByTestId('bulk-scan-button').click();

    // Enter some text
    const textarea = page.getByTestId('bulk-scan-textarea');
    await textarea.fill('https://example.com');

    // Click cancel
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Verify dialog is closed
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should handle invalid URLs gracefully', async ({ page }) => {
    // Open dialog
    await page.getByTestId('bulk-scan-button').click();

    // Enter mixed valid and invalid URLs
    const textarea = page.getByTestId('bulk-scan-textarea');
    await textarea.fill('https://example.com\nnot-a-valid-url\nhttps://test.com');

    // Click start
    const startButton = page.getByTestId('start-bulk-scan-button');
    await startButton.click();

    // Should still complete (backend handles invalid URLs)
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});
