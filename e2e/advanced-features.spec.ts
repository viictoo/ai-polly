import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for direct database interaction (for admin setup/teardown)
// This is generally not recommended for E2E tests, but for setting up admin users easily.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SECRET_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

test.describe('Advanced Features (Voting & Admin)', () => {
  const normalUserEmail = `normal-voter-${Date.now()}@example.com`;
  const normalUserPassword = 'password123';
  const normalUserName = 'Normal Voter';

  const adminUserEmail = `admin-${Date.now()}@example.com`;
  const adminUserPassword = 'adminpass123';
  const adminUserName = 'Admin User';
  let adminUserId: string;

  let createdPollId: string;

  test.beforeAll(async () => {
    // Register and make a user an admin for testing admin functionality
    const { data: adminAuthData, error: adminAuthError } = await supabaseAdmin.auth.signUp({
      email: adminUserEmail,
      password: adminUserPassword,
      options: { data: { name: adminUserName } },
    });
    if (adminAuthError) console.error('Admin user registration error:', adminAuthError);
    expect(adminAuthError).toBeNull();
    adminUserId = adminAuthData?.user?.id!;

    // Set the ADMIN_USER_ID environment variable for the test run
    process.env.ADMIN_USER_ID = adminUserId; // This affects the server actions during tests
  });

  test.beforeEach(async ({ page }) => {
    // Register and log in a normal user for poll creation and voting
    await page.goto('/register');
    await page.fill('input[name="name"]', normalUserName);
    await page.fill('input[name="email"]', normalUserEmail);
    await page.fill('input[name="password"]', normalUserPassword);
    await page.fill('input[name="confirmPassword"]', normalUserPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/polls');

    // Create a poll for voting and admin actions
    await page.goto('/create');
    await page.fill('input[name="question"]', 'Which fruit is best?');
    await page.fill('input[name="options[0]"]', 'Apple');
    await page.fill('input[name="options[1]"]', 'Banana');
    await page.click('button[type="submit"]');
    await page.waitForURL('/polls');

    const pollCard = page.locator('h2:has-text(\"Which fruit is best?\")').locator('xpath=ancestor::div[contains(@class, \'border-l-4\')]');
    const viewLink = pollCard.locator('a[href^=\"/polls/\"]').first();
    const href = await viewLink.getAttribute('href');
    createdPollId = href ? href.split('/').pop()! : '';
    expect(createdPollId).not.toBeNull();
    expect(createdPollId).not.toBe('');
  });

  test('should allow a user to vote on a poll', async ({ page }) => {
    await page.goto(`/polls/${createdPollId}`);

    // Click on the first option to vote
    await page.locator('button:has-text("Apple")').click();

    // Expect a success message or visual indication of vote (depends on UI implementation)
    // For this example, we'll just check if the page reloads or a toast appears.
    await expect(page.locator('div[role="status"]')).toContainText('Vote submitted'); // Assuming a toast message

    // Optionally verify vote count if displayed (requires specific selectors)
    // await expect(page.locator('p:has-text("Apple")').locator('span.vote-count')).toHaveText('1');
  });

  test('Admin should be able to view all polls in the admin panel', async ({ page }) => {
    // Log in as admin
    await page.goto('/login');
    await page.fill('input[name="email"]', adminUserEmail);
    await page.fill('input[name="password"]', adminUserPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/polls');

    await page.goto('/admin');
    await page.waitForURL('/admin');
    
    // Expect to see the poll created by the normal user
    await expect(page.locator('h2:has-text("Which fruit is best?")')).toBeVisible();
    // Also expect to see the admin's own user ID, confirming data visibility
    await expect(page.locator(`code:has-text('${normalUserEmail}')`)).not.toBeVisible(); // Not email, but user_id
  });

  test('Admin should be able to delete any poll', async ({ page }) => {
    // Log in as admin
    await page.goto('/login');
    await page.fill('input[name="email"]', adminUserEmail);
    await page.fill('input[name="password"]', adminUserPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/polls');

    await page.goto('/admin');
    await page.waitForURL('/admin');

    // Confirm the poll created by normal user is visible
    await expect(page.locator('h2:has-text("Which fruit is best?")')).toBeVisible();

    // Accept the confirmation dialog for deletion
    page.on('dialog', async dialog => {
      expect(dialog.type()).toBe('confirm');
      expect(dialog.message()).toBe('Are you sure you want to delete this poll?');
      await dialog.accept();
    });

    // Click delete button for the normal user's poll
    const pollCard = page.locator('h2:has-text(\"Which fruit is best?\")').locator('xpath=ancestor::div[contains(@class, \'border-l-4\')]');
    await pollCard.locator('button:has-text(\"Delete\")').click();
    await page.waitForTimeout(500); // Give time for reload and deletion

    // Verify the poll is no longer displayed
    await expect(page.locator('h2:has-text("Which fruit is best?")')).not.toBeVisible();
  });

  test('Non-admin user should be redirected from /admin page', async ({ page }) => {
    // Log in as normal user (already done in beforeEach)
    await page.goto('/admin');
    // Expect redirect to /login (because ADMIN_USER_ID check in Server Component will fail)
    await page.waitForURL('/login'); 
    expect(page.url()).toBe('http://localhost:3000/login');
  });
});
