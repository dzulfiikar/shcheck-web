import { test, expect } from '@playwright/test';

test.describe('cURL Scan Feature', () => {
  test.beforeEach(async ({ page }) =>> {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should toggle between URL and cURL input modes', async ({ page }) => {
    // Default should be URL mode
    await expect(page.getByTestId('target-input')).toBeVisible();

    // Switch to cURL mode
    await page.getByTestId('curl-mode-button').click();

    // cURL textarea should be visible
    await expect(page.getByTestId('curl-input')).toBeVisible();
    await expect(page.getByTestId('target-input')).not.toBeVisible();

    // Switch back to URL mode
    await page.getByTestId('url-mode-button').click();

    // Target input should be visible again
    await expect(page.getByTestId('target-input')).toBeVisible();
    await expect(page.getByTestId('curl-input')).not.toBeVisible();
  });

  test('should parse simple curl command', async ({ page }) => {
    // Switch to cURL mode
    await page.getByTestId('curl-mode-button').click();

    // Enter a curl command
    await page.getByTestId('curl-input').fill('curl https://example.com');

    // Should show success message with extracted URL
    await expect(page.getByTestId('curl-success')).toBeVisible();
    await expect(page.getByText('✓ URL extracted: https://example.com')).toBeVisible();
  });

  test('should parse curl command with method', async ({ page }) => {
    // Switch to cURL mode
    await page.getByTestId('curl-mode-button').click();

    // Enter a curl command with POST method
    await page.getByTestId('curl-input').fill('curl -X POST https://api.example.com/users');

    // Should show success message with method
    await expect(page.getByTestId('curl-success')).toBeVisible();
    await expect(page.getByText('https://api.example.com/users')).toBeVisible();
  });

  test('should parse curl command with headers', async ({ page }) => {
    // Switch to cURL mode
    await page.getByTestId('curl-mode-button').click();

    // Enter a curl command with headers
    await page.getByTestId('curl-input').fill(
      'curl -H "Authorization: Bearer token123" https://example.com'
    );

    // Should show success message with header count
    await expect(page.getByTestId('curl-success')).toBeVisible();
    await expect(page.getByText('1 header(s)')).toBeVisible();
  });

  test('should show error for invalid curl command', async ({ page }) => {
    // Switch to cURL mode
    await page.getByTestId('curl-mode-button').click();

    // Enter an invalid command
    await page.getByTestId('curl-input').fill('wget https://example.com');

    // Should show error
    await expect(page.getByTestId('curl-error')).toBeVisible();
    await expect(page.getByText('Command must start with curl')).toBeVisible();
  });

  test('should create scan from curl command', async ({ page }) => {
    // Switch to cURL mode
    await page.getByTestId('curl-mode-button').click();

    // Enter a curl command
    await page.getByTestId('curl-input').fill('curl https://httpbin.org/get');

    // Wait for parsing
    await expect(page.getByTestId('curl-success')).toBeVisible();

    // Submit the form
    await page.getByTestId('submit-scan').click();

    // Should redirect to scan detail page
    await page.waitForURL(/\/scans\/.+/);
    await expect(page.getByTestId('scan-detail-page')).toBeVisible();
  });

  test('should show custom headers in advanced options', async ({ page }) => {
    // Switch to cURL mode
    await page.getByTestId('curl-mode-button').click();

    // Enter a curl command with headers
    await page.getByTestId('curl-input').fill(
      'curl -H "Authorization: Bearer token" -H "X-Custom: value" https://example.com'
    );

    // Wait for parsing
    await expect(page.getByTestId('curl-success')).toBeVisible();

    // Open advanced options
    await page.getByTestId('advanced-options-trigger').click();

    // Should show custom headers section
    await expect(page.getByTestId('custom-headers-field')).toBeVisible();
    await expect(page.getByText('Authorization')).toBeVisible();
    await expect(page.getByText('X-Custom')).toBeVisible();
  });

  test('should parse curl command with cookies', async ({ page }) => {
    // Switch to cURL mode
    await page.getByTestId('curl-mode-button').click();

    // Enter a curl command with cookies
    await page.getByTestId('curl-input').fill('curl -b "sessionId=abc123" https://example.com');

    // Should show success message with cookies indicator
    await expect(page.getByTestId('curl-success')).toBeVisible();
    await expect(page.getByText('cookies')).toBeVisible();
  });
});
