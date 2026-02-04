import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 *
 * This configuration supports:
 * - Local development testing (against localhost)
 * - Docker-based testing (against containerized services)
 * - CI/CD pipeline testing
 */

// Determine base URL from environment or default to localhost
const baseURL = process.env.FRONTEND_URL || 'http://localhost:3000';
const apiURL = process.env.API_URL || 'http://localhost:3001';

export default defineConfig({
  testDir: './tests',

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI for stability
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],

  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL,

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video recording for debugging
    video: 'on-first-retry',

    // Action timeout
    actionTimeout: 10000,

    // Navigation timeout
    navigationTimeout: 30000,

    // Viewport size
    viewport: { width: 1280, height: 720 },
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Uncomment to test in other browsers
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Run local dev server before starting the tests
  webServer: process.env.CI
    ? [
        // In CI, services are managed by docker-compose
        // No need to start local servers
      ]
    : [
        // For local development, you can optionally start services
        // Uncomment if you want Playwright to manage the servers
        // {
        //   command: 'cd ../backend && bun dev',
        //   url: apiURL + '/health',
        //   reuseExistingServer: true,
        //   timeout: 120000,
        // },
        // {
        //   command: 'cd ../frontend && bun dev',
        //   url: baseURL,
        //   reuseExistingServer: true,
        //   timeout: 120000,
        // },
      ],

  // Output directory for test artifacts
  outputDir: 'test-results/',

  // Global setup/teardown (if needed)
  // globalSetup: require.resolve('./global-setup'),
  // globalTeardown: require.resolve('./global-teardown'),
});
