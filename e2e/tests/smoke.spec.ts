import { test, expect } from '@playwright/test';

/**
 * Smoke Tests
 *
 * Basic health checks to ensure the application is running
 * and major pages are accessible.
 */

test.describe('Smoke Tests', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/');

    // Verify page structure
    await expect(page.getByTestId('home-page')).toBeVisible();
    await expect(page.getByTestId('home-title')).toHaveText('Security Header Checker');
    await expect(page.getByTestId('scan-form')).toBeVisible();
  });

  test('about page loads', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByRole('heading', { name: 'About shcheck' })).toBeVisible();
  });

  test('scans list page loads', async ({ page }) => {
    await page.goto('/scans');
    await expect(page.getByTestId('scan-list-page')).toBeVisible();
    await expect(page.getByTestId('scan-list-title')).toHaveText('Scan History');
  });

  test('navigation works', async ({ page }) => {
    await page.goto('/');

    // Navigate to scans
    await page.getByRole('link', { name: 'Scans' }).click();
    await page.waitForURL('/scans');
    await expect(page.getByTestId('scan-list-page')).toBeVisible();

    // Navigate to compare
    await page.getByRole('link', { name: 'Compare' }).click();
    await page.waitForURL('/compare');
    await expect(page.getByRole('heading', { name: /Compare/i })).toBeVisible();

    // Navigate back to home
    await page.getByRole('link', { name: 'Home' }).click();
    await page.waitForURL('/');
    await expect(page.getByTestId('home-page')).toBeVisible();
  });

  test('scan form is functional', async ({ page }) => {
    await page.goto('/');

    // Verify form elements
    await expect(page.getByTestId('target-input')).toBeVisible();
    await expect(page.getByTestId('port-input')).toBeVisible();
    await expect(page.getByTestId('method-select')).toBeVisible();
    await expect(page.getByTestId('submit-scan')).toBeVisible();

    // Verify advanced options
    await expect(page.getByTestId('advanced-options-trigger')).toBeVisible();
  });
});
