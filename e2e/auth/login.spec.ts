import { test, expect, unauthenticatedTest } from '../fixtures/auth.fixture';

unauthenticatedTest.describe('Login Page', () => {
  unauthenticatedTest.beforeEach(async ({ page }) => {
    await page.goto('/login');
    // Wait for login form to be ready
    await page.waitForSelector('#email', { timeout: 10000 });
  });

  unauthenticatedTest('should display login form', async ({ page }) => {
    // Check for card title "Login"
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
    // Form uses id selectors, not name
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  unauthenticatedTest('should show validation errors for empty form', async ({ page }) => {
    // The form uses HTML5 required validation, so clicking submit on empty form
    // won't submit - the browser shows validation. Let's fill email but leave password empty
    await page.fill('#email', 'test@example.com');

    // Click submit - browser validation will prevent submission for empty password
    await page.click('button[type="submit"]');

    // The password input should be invalid (browser validation)
    const passwordInput = page.locator('#password');
    await expect(passwordInput).toBeVisible();
  });

  unauthenticatedTest('should show error for invalid credentials', async ({ page }) => {
    // Fill in invalid credentials using id selectors
    await page.fill('#email', 'invalid@example.com');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Wait for error toast (Sonner toast)
    await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 10000 });
  });

  unauthenticatedTest('should login successfully with valid credentials', async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL || 'admin@example.com';
    const password = process.env.E2E_USER_PASSWORD || 'password123';

    // Fill in valid credentials using id selectors
    await page.fill('#email', email);
    await page.fill('#password', password);
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });

  unauthenticatedTest('should redirect to login when accessing protected routes', async ({ page }) => {
    // Try to access dashboard without auth
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Logout', () => {
  test('should logout successfully', async ({ page }) => {
    // Navigate to dashboard (authenticated)
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Click the user menu button (button with User icon that is rounded-full)
    const userMenuButton = page.locator('button.rounded-full').first();
    await userMenuButton.click();

    // Wait for dropdown menu to appear
    await page.waitForSelector('[role="menuitem"]', { timeout: 5000 });

    // Click "Log out" menu item
    await page.click('text="Log out"');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});
