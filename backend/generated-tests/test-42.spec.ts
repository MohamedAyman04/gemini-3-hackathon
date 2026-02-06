import { test, expect } from '@playwright/test';

test('reproduce bug: create mission button is not working', async ({ page }) => {
  // 1. Navigate to the application
  await page.goto('http://localhost:3000');

  // 2. Locate the "Create mission" button as described in the transcript
  // The user mentions it's not clear where it is, then finds it and says it's not working.
  const createMissionButton = page.getByRole('button', { name: /create mission/i });

  // 3. Ensure the button is present in the DOM
  await expect(createMissionButton).toBeVisible();

  // 4. Click the button to trigger the creation flow
  await createMissionButton.click();

  // 5. Assert the expected state: 
  // Based on the AI's prompt "The mission is to create a mission and view the details",
  // clicking this button should either navigate to a new page or open a creation form.
  // Since the user reports it is "not working", we assert that the resulting UI state exists.
  // This test will fail if the button click does nothing (the bug reported).
  const formHeading = page.getByRole('heading', { name: /create/i });
  await expect(formHeading).toBeVisible();
  
  // Alternatively, check for URL change if it's a navigation
  // await expect(page).toHaveURL(/.*mission.*/);
});