import { test, expect } from '@playwright/test';

test('reproduce reported bug from user session', async ({ page }) => {
  // CONTEXT: User testing session
  // URL: http://localhost:3000

  // 1. Capture console errors throughout the test for a general bug check
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // 2. Navigate to the reported URL
  await page.goto('http://localhost:3000');

  // 3. Assert initial page load and expected content
  // Verify the page title is as expected
  await expect(page).toHaveTitle(/VibeCheck/);

  // Verify the main heading "Mission Control" is visible, indicating the dashboard loaded correctly
  const missionControlHeading = page.getByRole('heading', { name: 'Mission Control' });
  await expect(missionControlHeading).toBeVisible();

  // DOM EVENTS DATA analysis:
  // The user's interaction consists of two mousemove events:
  // - First mousemove over element with id 50 (a div containing "Dev Team" and "Free Plan").
  // - Second mousemove over element with id 49 (the parent div of id 50).
  // These events suggest the user was hovering over the user profile section in the sidebar footer.

  // 4. Locate the "Dev Team" profile card
  // This locator targets the div with specific classes that also contains the text "Dev Team".
  // This corresponds to the element with id 50 in the DOM events data.
  const devTeamProfileCard = page.locator('div.flex.items-center.gap-3.rounded-xl').filter({ hasText: 'Dev Team' });
  
  // Assert that the profile card is visible before interaction
  await expect(devTeamProfileCard).toBeVisible();

  // 5. Simulate the mouse movement by hovering over the "Dev Team" profile card.
  // The `.hover()` action moves the mouse to the center of the element, effectively
  // covering the recorded mousemove over element id 50, and implicitly over its parent (id 49).
  await devTeamProfileCard.hover();

  // Add a small pause to allow any potential hover effects or UI updates to complete.
  // This is good practice when dealing with UI interactions that might trigger animations or state changes.
  await page.waitForTimeout(200);

  // 6. ASSERTION: Verify the application state after the mouse interaction.
  // Since no specific bug was reported, we'll assert for general UI stability:
  // - The profile card should still be visible.
  // - Its textual content should remain intact.
  // - No unexpected console errors should have occurred.

  await expect(devTeamProfileCard).toBeVisible();
  await expect(devTeamProfileCard.getByText('Dev Team')).toBeVisible();
  await expect(devTeamProfileCard.getByText('Free Plan')).toBeVisible();

  // Assert that no console errors were logged during the entire test session.
  // If consoleErrors array contains any messages, the test will fail, indicating a client-side error.
  expect(consoleErrors).toEqual([]);
});