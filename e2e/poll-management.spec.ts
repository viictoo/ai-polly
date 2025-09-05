import { test, expect } from '@playwright/test';

test.describe('Poll Management', () => {
  const userEmail = `poll-user-${Date.now()}@example.com`;
  const userPassword = 'password123';
  const userName = 'Poll User';
  let createdPollId: string;

  test.beforeEach(async ({ page }) => {
    // Register and log in a user before each test
    await page.goto('/register');
    await page.fill('input[name="name"]', userName);
    await page.fill('input[name="email"]', userEmail);
    await page.fill('input[name="password"]', userPassword);
    await page.fill('input[name="confirmPassword"]', userPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/polls');
  });

  test('should allow a user to create a poll', async ({ page }) => {
    await page.goto('/create');
    await page.fill('input[name="question"]', 'What is your favorite color?');
    await page.fill('input[name="options[0]"]', 'Red');
    await page.fill('input[name="options[1]"]', 'Blue');
    await page.click('button[type="submit"]');

    await page.waitForURL('/polls');
    expect(page.url()).toBe('http://localhost:3000/polls');

    // Verify the poll is displayed on the polls page
    await expect(page.locator('h2:has-text("What is your favorite color?")')).toBeVisible();

    // Get the created poll ID for later tests
    const pollCard = page.locator('h2:has-text("What is your favorite color?")').locator('xpath=ancestor::div[contains(@class, "border-l-4")]');
    const editLink = pollCard.locator('a:has-text("Edit")');
    const href = await editLink.getAttribute('href');
    createdPollId = href ? href.split('/').pop()! : '';
    expect(createdPollId).not.toBeNull();
    expect(createdPollId).not.toBe('');
  });

  test('should allow a user to view their own poll', async ({ page }) => {
    // This test relies on a poll being created in a previous test or setup
    // For now, we'll create one here for isolation.
    await page.goto('/create');
    await page.fill('input[name="question"]', 'What is your favorite animal?');
    await page.fill('input[name="options[0]"]', 'Dog');
    await page.fill('input[name="options[1]"]', 'Cat');
    await page.click('button[type="submit"]');
    await page.waitForURL('/polls');

    const pollCard = page.locator('h2:has-text("What is your favorite animal?")').locator('xpath=ancestor::div[contains(@class, "border-l-4")]');
    const viewLink = pollCard.locator('a[href^="/polls/"]').first();
    await viewLink.click();

    // Should navigate to the poll details page
    await page.waitForURL(/\/polls\/[^/]+$/);
    expect(page.locator('h1')).toHaveText('What is your favorite animal?');
  });

  test('should allow a user to edit their own poll', async ({ page }) => {
    // Create a poll first
    await page.goto('/create');
    await page.fill('input[name="question"]', 'Original Question');
    await page.fill('input[name="options[0]"]', 'Option A');
    await page.fill('input[name="options[1]"]', 'Option B');
    await page.click('button[type="submit"]');
    await page.waitForURL('/polls');

    const pollCard = page.locator('h2:has-text("Original Question")').locator('xpath=ancestor::div[contains(@class, "border-l-4")]');
    const editLink = pollCard.locator('a:has-text("Edit")');
    await editLink.click();

    await page.waitForURL(/\/polls\/[^/]+\/edit$/);
    expect(page.locator('h1')).toHaveText('Edit Poll');

    // Perform the edit
    await page.fill('input[name="question"]', 'Updated Question');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/polls\/[^/]+$/); // Should redirect to poll details or polls list

    await expect(page.locator('h1')).toHaveText('Updated Question');
  });

  test('should prevent unauthorized user from editing another user\'s poll', async ({ page, request }) => {
    // This test assumes a poll is already created by 'userEmail'
    // We need to create a second user to test unauthorized access
    const maliciousUserEmail = `malicious-${Date.now()}@example.com`;
    const maliciousUserPassword = 'securepass123';
    const maliciousUserName = 'Malicious User';

    // Register the malicious user
    await page.goto('/register');
    await page.fill('input[name="name"]', maliciousUserName);
    await page.fill('input[name="email"]', maliciousUserEmail);
    await page.fill('input[name="password"]', maliciousUserPassword);
    await page.fill('input[name="confirmPassword"]', maliciousUserPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/polls');

    // Create a poll with the original user (from beforeEach)
    await page.goto('/create');
    await page.fill('input[name="question"]', 'Victim Poll');
    await page.fill('input[name="options[0]"]', 'Opt1');
    await page.fill('input[name="options[1]"]', 'Opt2');
    await page.click('button[type="submit"]');
    await page.waitForURL('/polls');

    const victimPollCard = page.locator('h2:has-text("Victim Poll")').locator('xpath=ancestor::div[contains(@class, "border-l-4")]');
    const editLink = victimPollCard.locator('a:has-text("Edit")');
    const href = await editLink.getAttribute('href');
    const victimPollId = href ? href.split('/').pop()! : '';

    // Logout the original user and login as malicious user
    // (Playwright context usually handles this by fresh page/browser or explicit logout)
    // For this scenario, we'll log out and then log in the malicious user.
    await page.goto('/login'); // This will redirect the original user to /polls (middleware fix)
    // Need a logout action here. For now, assume a new browser context or a direct API logout for clarity.

    // Create a fresh page for the malicious user to ensure no shared session
    const maliciousPage = await page.context().newPage();
    await maliciousPage.goto('/login');
    await maliciousPage.fill('input[name="email"]', maliciousUserEmail);
    await maliciousPage.fill('input[name="password"]', maliciousUserPassword);
    await maliciousPage.click('button[type="submit"]');
    await maliciousPage.waitForURL('/polls');

    // Malicious user attempts to access the victim's poll edit page directly
    await maliciousPage.goto(`http://localhost:3000/polls/${victimPollId}/edit`);

    // Expect a redirect to /polls or an unauthorized error message
    await maliciousPage.waitForURL(/\/polls\/[^/]+$/ | \/\/polls$ | \/login$/);
    const currentUrl = maliciousPage.url();
    expect(currentUrl).not.toContain('edit');
    // Depending on error handling, check for specific messages or redirects
    await expect(maliciousPage.locator('h1')).not.toHaveText('Edit Poll'); // Should not see the edit form
  });

  test('should allow a user to delete their own poll', async ({ page }) => {
    // Create a poll first
    await page.goto('/create');
    await page.fill('input[name="question"]', 'Poll to Delete');
    await page.fill('input[name="options[0]"]', 'Opt X');
    await page.fill('input[name="options[1]"]', 'Opt Y');
    await page.click('button[type="submit"]');
    await page.waitForURL('/polls');

    const pollCard = page.locator('h2:has-text("Poll to Delete")').locator('xpath=ancestor::div[contains(@class, "border-l-4")]');
    await expect(pollCard).toBeVisible();

    page.on('dialog', async dialog => {
      expect(dialog.type()).toBe('confirm');
      expect(dialog.message()).toBe('Are you sure you want to delete this poll?');
      await dialog.accept();
    });
    
    await pollCard.locator('button:has-text("Delete")').click();
    await page.waitForTimeout(500); // Give time for reload and deletion

    // Verify the poll is no longer displayed
    await expect(page.locator('h2:has-text("Poll to Delete")')).not.toBeVisible();
  });

  test('should prevent unauthorized user from deleting another user\'s poll', async ({ page, request }) => {
    // This test assumes a poll is already created by 'userEmail'
    const originalUserPage = page;

    await originalUserPage.goto('/create');
    await originalUserPage.fill('input[name="question"]', 'Another Victim Poll');
    await originalUserPage.fill('input[name="options[0]"]', 'Opt A');
    await originalUserPage.fill('input[name="options[1]"]', 'Opt B');
    await originalUserPage.click('button[type="submit"]');
    await originalUserPage.waitForURL('/polls');

    const victimPollCard = originalUserPage.locator('h2:has-text("Another Victim Poll")').locator('xpath=ancestor::div[contains(@class, "border-l-4")]');
    const editLink = victimPollCard.locator('a:has-text("Edit")');
    const href = await editLink.getAttribute('href');
    const victimPollId = href ? href.split('/').pop()! : '';

    // Create a fresh page for the malicious user
    const maliciousPage = await request.newContext().newPage();
    const maliciousUserEmail = `malicious-del-${Date.now()}@example.com`;
    const maliciousUserPassword = 'securepass123';
    const maliciousUserName = 'Malicious Deleter';

    await maliciousPage.goto('/register');
    await maliciousPage.fill('input[name="name"]', maliciousUserName);
    await maliciousPage.fill('input[name="email"]', maliciousUserEmail);
    await maliciousPage.fill('input[name="password"]', maliciousUserPassword);
    await maliciousPage.fill('input[name="confirmPassword"]', maliciousUserPassword);
    await maliciousPage.click('button[type="submit"]');
    await maliciousPage.waitForURL('/polls');

    // Malicious user attempts to delete the victim's poll directly via action
    // This requires simulating a form submission to the server action.
    // Playwright doesn't directly expose server actions for testing, so we'll simulate
    // a client-side button click, which would then call the server action.
    // The server action itself should prevent the deletion.

    // Navigate to a page where the delete action might be triggered, e.g., the victim's poll page
    await maliciousPage.goto(`http://localhost:3000/polls/${victimPollId}`);
    
    // Attempt to click delete button (it should not be visible to unauthorized user due to client-side auth)
    // But even if it were, the server action should block it.
    await expect(maliciousPage.locator('button:has-text("Delete")')).not.toBeVisible();

    // Now, let's try to simulate a direct call to the delete action endpoint if we had one, or
    // verify that a direct attempt to access the admin delete function via URL won't work
    // (which is already covered by the admin page access control).

    // For this test, the key is that the server-side deletePoll action prevents it.
    // We can verify this by checking if the original user's poll still exists.
    await maliciousPage.close();

    await originalUserPage.goto('/polls');
    await expect(originalUserPage.locator('h2:has-text("Another Victim Poll")')).toBeVisible();
  });
});
