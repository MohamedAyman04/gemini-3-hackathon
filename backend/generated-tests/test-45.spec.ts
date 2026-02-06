import { test, expect } from '@playwright/test';

test('reproduce reported bug where button is not working', async ({ page }) => {
  // 1. Navigate to the application
  await page.goto('http://localhost:3000');

  // 2. User sends "الو" to the AI
  const chatInput = page.getByRole('textbox') || page.locator('input[type="text"]');
  await chatInput.fill('الو');
  await chatInput.press('Enter');

  // 3. Wait for the AI's specific response from the transcript
  await expect(page.getByText("Hello. I'm VibeCheck, your AI user researcher. What are you trying to achieve today?")).toBeVisible();

  // 4. Identify the button that the user reports as "not working"
  // Since the user says "this button", we look for the primary action button or the most recent button element
  const problematicButton = page.getByRole('button').last();
  
  // Verify the button exists and is visible
  await expect(problematicButton).toBeVisible();

  // Capture the current state to verify if the button click causes any changes
  const initialContent = await page.content();
  const initialUrl = page.url();

  // 5. Attempt to click the button
  await problematicButton.click();

  // 6. Assert that the button is not working
  // If a button is "not working", it usually means it doesn't trigger a navigation, 
  // a state change, or a visible UI response.
  await expect(page).toHaveURL(initialUrl);
  const postClickContent = await page.content();
  expect(postClickContent).toBe(initialContent);
});