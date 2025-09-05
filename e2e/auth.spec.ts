import { test, expect } from '@playwright/test';

test.describe('Authentication and Redirects', () => {
  const userEmail = `test-user-${Date.now()}@example.com`;
  const userPassword = 'password123';
  const userName = 'Test User';

  test('should allow a user to register and then log in', async ({ page }) => {
    await page.goto('/register');

    await page.fill('input[name="name"]', userName);
    await page.fill('input[name="email"]', userEmail);
    await page.fill('input[name="password"]', userPassword);
    await page.fill('input[name="confirmPassword"]', userPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL('/polls');
    expect(page.url()).toBe('http://localhost:3000/polls');

    // Log out to test login flow
    await page.goto('/login'); // Go to a page that will trigger middleware and redirect
    await page.waitForURL('/polls'); // Should be redirected to /polls after logout

    // Assuming there's a logout mechanism, which would typically be a button or action
    // For now, let's assume a direct logout action or a way to clear session
    // await page.click('button:has-text("Logout")'); // Placeholder if logout button exists

    // For testing purposes, we might need a direct way to clear the session or logout.
    // Since we don't have a logout button defined in the UI, we'll simulate re-logging in
    // and ensure the login page is accessible after a manual logout (if implemented later).
    // For now, let's focus on the registration -> polls redirect.

    // Attempt to login with the registered user
    await page.goto('/login');
    await page.fill('input[name="email"]', userEmail);
    await page.fill('input[name="password"]', userPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL('/polls');
    expect(page.url()).toBe('http://localhost:3000/polls');
  });

  test('should redirect authenticated users from /login to /polls', async ({ page }) => {
    // First, log in a user
    await page.goto('/login');
    await page.fill('input[name="email"]', userEmail);
    await page.fill('input[name="password"]', userPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/polls');
    expect(page.url()).toBe('http://localhost:3000/polls');

    // Attempt to navigate to /login while authenticated
    await page.goto('/login');
    await page.waitForURL('/polls');
    expect(page.url()).toBe('http://localhost:3000/polls');
  });

  test('should redirect authenticated users from /register to /polls', async ({ page }) => {
    // First, log in a user
    await page.goto('/login');
    await page.fill('input[name="email"]', userEmail);
    await page.fill('input[name="password"]', userPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/polls');
    expect(page.url()).toBe('http://localhost:3000/polls');

    // Attempt to navigate to /register while authenticated
    await page.goto('/register');
    await page.waitForURL('/polls');
    expect(page.url()).toBe('http://localhost:3000/polls');
  });

  test('should show error for invalid login credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'nonexistent@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    const errorMessage = page.locator('.text-red-500');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toHaveText('Invalid login credentials'); // Supabase error message example
    expect(page.url()).toBe('http://localhost:3000/login');
  });

  test('should show error for missing registration fields', async ({ page }) => {
    await page.goto('/register');
    await page.click('button[type="submit"]');

    const errorMessage = page.locator('.text-red-500');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toHaveText('All fields are required.');
    expect(page.url()).toBe('http://localhost:3000/register');
  });

  test('should show error for mismatched passwords during registration', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[name="name"]', userName);
    await page.fill('input[name="email"]', `another-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'password123');
    await page.fill('input[name="confirmPassword"]', 'differentpassword');
    await page.click('button[type="submit"]');

    const errorMessage = page.locator('.text-red-500');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toHaveText('Passwords do not match');
    expect(page.url()).toBe('http://localhost:3000/register');
  });

  test('should show error for invalid email format during registration', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[name="name"]', userName);
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', userPassword);
    await page.fill('input[name="confirmPassword"]', userPassword);
    await page.click('button[type="submit"]');

    const errorMessage = page.locator('.text-red-500');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toHaveText('Please enter a valid email address.');
    expect(page.url()).toBe('http://localhost:3000/register');
  });

  test('should show error for password less than 6 characters during registration', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[name="name"]', userName);
    await page.fill('input[name="email"]', `shortpass-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'short');
    await page.fill('input[name="confirmPassword"]', 'short');
    await page.click('button[type="submit"]');

    const errorMessage = page.locator('.text-red-500');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toHaveText('Password must be at least 6 characters long.');
    expect(page.url()).toBe('http://localhost:3000/register');
  });
});
