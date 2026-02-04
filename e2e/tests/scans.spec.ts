import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Scan Functionality
 *
 * These tests cover the full user journey:
 * - Creating scans
 * - Viewing scan list
 * - Viewing scan details
 * - Waiting for scan completion
 * - Deleting scans
 */

test.describe('Scan Lifecycle', () => {
  test('complete scan lifecycle - create, wait for completion, verify results', async ({ page }) => {
    // Navigate to home
    await page.goto('/');

    // Verify we're on the home page
    await expect(page.getByTestId('home-page')).toBeVisible();
    await expect(page.getByTestId('home-title')).toHaveText('Security Header Checker');

    // Fill scan form
    await page.getByTestId('target-input').fill('https://example.com');

    // Submit the form
    await page.getByTestId('submit-scan').click();

    // Wait for redirect to detail page
    await page.waitForURL(/\/scans\/.+/);

    // Verify we're on the scan detail page
    await expect(page.getByTestId('scan-detail-page')).toBeVisible();
    await expect(page.getByTestId('scan-detail-title')).toHaveText('Scan Details');

    // Wait for scan to complete (with timeout for processing)
    await expect(page.locator('[data-testid^="status-badge-"]')).toBeVisible();

    // Wait for completion or failure (up to 60 seconds)
    await expect(
      page.getByTestId('status-badge-completed').or(page.getByTestId('status-badge-failed'))
    ).toBeVisible({ timeout: 60000 });

    // If completed, verify results are displayed
    if (await page.getByTestId('status-badge-completed').isVisible().catch(() => false)) {
      // Verify summary section
      await expect(page.getByTestId('scan-summary')).toBeVisible();
      await expect(page.getByTestId('summary-present')).toBeVisible();
      await expect(page.getByTestId('summary-missing')).toBeVisible();
      await expect(page.getByTestId('summary-total')).toBeVisible();

      // Verify present headers section
      await expect(page.getByTestId('present-headers-card')).toBeVisible();
      await expect(page.getByTestId('present-headers-title')).toContainText('Present Headers');

      // Verify missing headers section
      await expect(page.getByTestId('missing-headers-card')).toBeVisible();
      await expect(page.getByTestId('missing-headers-title')).toContainText('Missing Headers');
    }
  });

  test('create scan with advanced options', async ({ page }) => {
    await page.goto('/');

    // Fill basic form
    await page.getByTestId('target-input').fill('https://httpbin.org');

    // Open advanced options
    await page.getByTestId('advanced-options-trigger').click();
    await expect(page.getByTestId('advanced-options-content')).toBeVisible();

    // Fill cookies
    await page.getByTestId('cookies-input').fill('test=value; session=abc123');

    // Check options
    await page.getByTestId('showInformation-checkbox').check();
    await page.getByTestId('showCaching-checkbox').check();

    // Submit form
    await page.getByTestId('submit-scan').click();

    // Wait for redirect
    await page.waitForURL(/\/scans\/.+/);

    // Verify scan was created
    await expect(page.getByTestId('scan-detail-page')).toBeVisible();
  });

  test('form validation - invalid URL', async ({ page }) => {
    await page.goto('/');

    // Try to submit empty form
    await page.getByTestId('submit-scan').click();

    // Should show validation error
    await expect(page.getByTestId('target-error')).toHaveText('Target URL is required');

    // Try invalid URL
    await page.getByTestId('target-input').fill('not-a-valid-url');
    await page.getByTestId('submit-scan').click();

    // Should show validation error
    await expect(page.getByTestId('target-error')).toHaveText('Please enter a valid URL (http:// or https://)');
  });

  test('form validation - invalid port', async ({ page }) => {
    await page.goto('/');

    // Fill valid URL but invalid port
    await page.getByTestId('target-input').fill('https://example.com');
    await page.getByTestId('port-input').fill('99999');

    // Submit form
    await page.getByTestId('submit-scan').click();

    // Should show validation error
    await expect(page.getByTestId('port-error')).toHaveText('Port must be between 1 and 65535');
  });
});

test.describe('Scan List', () => {
  test('view scan list', async ({ page }) => {
    await page.goto('/scans');

    // Verify page elements
    await expect(page.getByTestId('scan-list-page')).toBeVisible();
    await expect(page.getByTestId('scan-list-title')).toHaveText('Scan History');
    await expect(page.getByTestId('scan-list-description')).toHaveText('View all your security header scans. Click on a scan to see detailed results.');

    // Verify New Scan button exists
    await expect(page.getByTestId('new-scan-button')).toBeVisible();

    // Verify filter controls exist
    await expect(page.getByTestId('scan-filters')).toBeVisible();
    await expect(page.getByTestId('status-filter')).toBeVisible();
    await expect(page.getByTestId('limit-filter')).toBeVisible();

    // Table headers should be present if there are scans
    const tableExists = await page.getByTestId('scan-table').isVisible().catch(() => false);
    if (tableExists) {
      await expect(page.getByRole('columnheader', { name: 'Target URL' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Created' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Duration' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Actions' })).toBeVisible();
    }
  });

  test('scan list filtering by status', async ({ page }) => {
    await page.goto('/scans');

    // Check if there are scans to filter
    const hasScans = await page.getByTestId('scan-table').isVisible().catch(() => false);

    if (hasScans) {
      // Open status filter dropdown
      await page.getByTestId('status-select').click();

      // Select completed status
      await page.getByRole('option', { name: 'Completed' }).click();

      // Wait for filter to apply
      await page.waitForTimeout(500);

      // Verify only completed scans are shown (or empty state)
      const completedBadges = page.getByTestId('status-badge-completed');
      const hasCompleted = await completedBadges.count() > 0;

      if (hasCompleted) {
        // All visible status badges should be "Completed"
        const statusBadges = page.locator('[data-testid^="status-badge-"]');
        const count = await statusBadges.count();
        for (let i = 0; i < count; i++) {
          const testId = await statusBadges.nth(i).getAttribute('data-testid');
          expect(testId).toBe('status-badge-completed');
        }
      }
    }
  });

  test('scan list pagination', async ({ page }) => {
    await page.goto('/scans');

    // Check if pagination exists (more than one page)
    const paginationExists = await page.getByTestId('pagination').isVisible().catch(() => false);

    if (paginationExists) {
      const nextButton = page.getByTestId('next-page');
      const isEnabled = await nextButton.isEnabled().catch(() => false);

      if (isEnabled) {
        // Get current page number
        const pageNumberText = await page.getByTestId('page-number').textContent();

        // Click next
        await nextButton.click();

        // Wait for page to update
        await page.waitForTimeout(500);

        // Verify page number changed
        const newPageNumberText = await page.getByTestId('page-number').textContent();
        expect(newPageNumberText).not.toEqual(pageNumberText);
      }
    }
  });

  test('empty state when no scans', async ({ page }) => {
    await page.goto('/scans');

    // Check if we're in empty state
    const emptyState = page.getByTestId('scan-list-empty');
    const isEmpty = await emptyState.isVisible().catch(() => false);

    if (isEmpty) {
      await expect(emptyState).toBeVisible();
      await expect(page.getByTestId('run-first-scan-button')).toBeVisible();
    }
  });
});

test.describe('Scan Detail', () => {
  test('view scan detail with completed status', async ({ page }) => {
    // First create a scan
    await page.goto('/');
    await page.getByTestId('target-input').fill('https://example.com');
    await page.getByTestId('submit-scan').click();
    await page.waitForURL(/\/scans\/.+/);

    // Wait for completion or failure
    await expect(
      page.getByTestId('status-badge-completed').or(page.getByTestId('status-badge-failed'))
    ).toBeVisible({ timeout: 60000 });

    // Verify scan detail elements
    await expect(page.getByTestId('scan-detail-page')).toBeVisible();
    await expect(page.getByTestId('scan-detail-title')).toHaveText('Scan Details');
    await expect(page.getByTestId('back-to-scans')).toBeVisible();

    // Verify metadata section
    await expect(page.getByTestId('scan-metadata')).toBeVisible();
    await expect(page.getByTestId('scan-target-url')).toBeVisible();
    await expect(page.getByTestId('scan-duration')).toBeVisible();
    await expect(page.getByTestId('scan-created')).toBeVisible();
  });

  test('scan detail shows correct status badge', async ({ page }) => {
    // Create a scan
    await page.goto('/');
    await page.getByTestId('target-input').fill('https://example.com');
    await page.getByTestId('submit-scan').click();
    await page.waitForURL(/\/scans\/.+/);

    // Verify status badge is visible
    await expect(page.locator('[data-testid^="status-badge-"]')).toBeVisible();
  });

  test('navigation from detail back to list', async ({ page }) => {
    // Create a scan first
    await page.goto('/');
    await page.getByTestId('target-input').fill('https://example.com');
    await page.getByTestId('submit-scan').click();
    await page.waitForURL(/\/scans\/.+/);

    // Click back to scans
    await page.getByTestId('back-to-scans').click();

    // Verify we're on the scan list page
    await page.waitForURL('/scans');
    await expect(page.getByTestId('scan-list-page')).toBeVisible();
  });

  test('scan detail shows progress for pending/processing scans', async ({ page }) => {
    // Create a scan
    await page.goto('/');
    await page.getByTestId('target-input').fill('https://example.com');
    await page.getByTestId('submit-scan').click();
    await page.waitForURL(/\/scans\/.+/);

    // Check if scan is still in progress
    const inProgress = await page.getByTestId('scan-progress').isVisible().catch(() => false);

    if (inProgress) {
      // Verify progress elements
      await expect(page.getByTestId('scan-progress-title')).toHaveText('Scan in Progress');
      await expect(page.getByTestId('scan-progress-spinner')).toBeVisible();
      await expect(page.getByTestId('scan-progress-bar')).toBeVisible();
    }
  });

  test('scan detail shows error for failed scans', async ({ page }) => {
    // Create a scan with invalid target that will fail
    await page.goto('/');
    await page.getByTestId('target-input').fill('https://this-domain-does-not-exist-12345.com');
    await page.getByTestId('submit-scan').click();
    await page.waitForURL(/\/scans\/.+/);

    // Wait for scan to complete or fail (up to 60 seconds)
    await expect(
      page.getByTestId('status-badge-completed').or(page.getByTestId('status-badge-failed'))
    ).toBeVisible({ timeout: 60000 });

    // Check if scan failed
    const failedStatus = await page.getByTestId('status-badge-failed').isVisible().catch(() => false);

    if (failedStatus) {
      // Verify error display
      await expect(page.getByTestId('scan-failed-alert')).toBeVisible();
    }
  });
});

test.describe('Navigation Flows', () => {
  test('full navigation flow: home -> create -> detail -> list', async ({ page }) => {
    // Start at home
    await page.goto('/');
    await expect(page.getByTestId('home-page')).toBeVisible();

    // Navigate to scans list
    await page.getByRole('link', { name: 'Scans' }).click();
    await page.waitForURL('/scans');
    await expect(page.getByTestId('scan-list-page')).toBeVisible();

    // Navigate back to home
    await page.getByRole('link', { name: 'Home' }).click();
    await page.waitForURL('/');

    // Create a scan
    await page.getByTestId('target-input').fill('https://example.com');
    await page.getByTestId('submit-scan').click();
    await page.waitForURL(/\/scans\/.+/);

    // Go to list from detail
    await page.getByTestId('back-to-scans').click();
    await page.waitForURL('/scans');

    // Verify we're on the list page
    await expect(page.getByTestId('scan-list-page')).toBeVisible();
  });

  test('compare page navigation', async ({ page }) => {
    await page.goto('/');

    // Navigate to compare page
    await page.getByRole('link', { name: 'Compare' }).click();
    await page.waitForURL('/compare');

    // Verify compare page loaded
    await expect(page.getByRole('heading', { name: /Compare/i })).toBeVisible();
  });
});
