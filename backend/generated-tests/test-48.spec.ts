import { test, expect } from '@playwright/test';

test('reproduce mission creation and details viewing bug', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // USER: Hallo.
  // Assuming a standard chat or input field exists for interaction
  const chatInput = page.locator('input, [role="textbox"]').first();
  await chatInput.fill('Hallo');
  await chatInput.press('Enter');

  // AI: Hello. I am here to observe you today. The mission is to create a mission and then view the details.
  // We follow the mission steps described in the transcript.

  // Step 1: Create a mission
  // Locating the create mission trigger
  const createButton = page.getByRole('button', { name: /create mission|add mission/i });
  await createButton.click();

  // Filling in the mission details
  const missionNameInput = page.getByRole('textbox').last();
  const missionName = 'Test Reproduce Mission';
  await missionNameInput.fill(missionName);
  
  // Saving the mission
  const saveButton = page.getByRole('button', { name: /save|submit|create/i });
  await saveButton.click();

  // Step 2: View the details
  // Clicking on the newly created mission to view its details
  await page.getByText(missionName).first().click();

  // Assertion: Verify that the mission details are visible
  // This is where the bug would be caught if the details view fails to load
  const detailsHeading = page.getByRole('heading', { name: /details/i }).or(page.getByText(/mission details/i));
  await expect(detailsHeading).toBeVisible();
  await expect(page.getByText(missionName)).toBeVisible();
});