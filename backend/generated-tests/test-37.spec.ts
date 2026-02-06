import { test, expect } from '@playwright/test';

test('reproduce bug where button is not working and causes user hurdle', async ({ page }) => {
  // Step 1: Navigate to the application
  await page.goto('http://localhost:3000');

  // Step 2: User says "Hallo."
  // We assume there is an input field to interact with the AI or system.
  const input = page.locator('input, textarea, [role="textbox"]').first();
  await input.fill('Hallo.');
  await page.keyboard.press('Enter');

  // Step 3: AI responds "Hello. I'm ready when you are."
  // Assert the conversation flow is initialized.
  await expect(page.locator('text=Hello. I\'m ready when you are.')).toBeVisible();

  // Step 4: User attempts to click a button and reports "This button is not working."
  // We target the primary action button on the page.
  const actionButton = page.getByRole('button').first();
  await actionButton.click();

  // Step 5: Assert the bug occurs. 
  // The user says "I'm not sure what to do here," implying the UI did not transition or provide feedback.
  // We assert that the expected success state or navigation did NOT occur.
  const successIndicator = page.locator('.success, .next-step, #confirmation');
  await expect(successIndicator).not.toBeVisible();

  // Step 6: Verify the URL or state remains unchanged, confirming the "hurdle".
  await expect(page).toHaveURL('http://localhost:3000');
});