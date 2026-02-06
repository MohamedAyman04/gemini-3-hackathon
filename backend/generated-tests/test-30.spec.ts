import { test, expect } from '@playwright/test';

test('reproduce reported bug: Join Live Stream button is unresponsive', async ({ page }) => {
  // 1. Navigate to the application
  await page.goto('http://localhost:3000');

  // 2. Navigate to the "Active Sessions" page as seen in the DOM events (clicking sidebar item)
  const activeSessionsLink = page.locator('nav a, nav button').filter({ hasText: /Active Sessions|Activity/i });
  await activeSessionsLink.click();

  // 3. Verify the "Active Sessions" view has loaded
  await expect(page.getByText('Active Sessions')).toBeVisible();

  // 4. Locate the specific session card and the "Join Live Stream" button
  // In the DOM data, the card title is "I'm trying" (ID 778)
  const sessionCard = page.locator('div').filter({ hasText: "I'm trying" });
  const joinButton = sessionCard.getByRole('button', { name: 'Join Live Stream' });

  // 5. Ensure the button is visible and enabled before attempting interaction
  await expect(joinButton).toBeVisible();
  
  // 6. Attempt to click the button
  // The user transcript indicates: "I don't think this button is working."
  await joinButton.click();

  // 7. Assertion: Clicking the button should trigger navigation or a state change.
  // We assert that the URL should change to a session detail or live stream view.
  // If the bug exists, this assertion will fail as the page remains on the list view.
  const currentUrl = page.url();
  await expect(page).not.toHaveURL(currentUrl);
  await expect(page).toHaveURL(/.*\/sessions\/|.*\/live\//);
});