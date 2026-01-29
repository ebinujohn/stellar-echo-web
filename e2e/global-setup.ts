import { chromium, type FullConfig } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '.auth/user.json');

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  const email = process.env.E2E_USER_EMAIL || 'admin@example.com';
  const password = process.env.E2E_USER_PASSWORD || 'password123';

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Navigate to login page
    await page.goto(`${baseURL}/login`);

    // Wait for login form to be ready
    await page.waitForSelector('#email', { timeout: 10000 });

    // Fill in credentials using id selectors
    await page.fill('#email', email);
    await page.fill('#password', password);

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard', { timeout: 30000 });

    // Save authentication state
    await page.context().storageState({ path: authFile });

    console.log('Authentication successful, state saved');
  } catch (error) {
    console.error('Authentication setup failed:', error);
    // Take screenshot on failure for debugging
    await page.screenshot({ path: path.join(__dirname, '.auth/setup-failure.png') });
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
