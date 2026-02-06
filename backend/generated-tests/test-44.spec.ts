import { test, expect } from '@playwright/test';

test('reproduce user confusion bug on landing page', async ({ page }) => {
  // Navigate to the reported URL
  await page.goto('http://localhost:3000');

  // USER: هلو
  // Locating the chat input field and sending the greeting in Arabic
  const chatInput = page.locator('textarea, input[role="textbox"], [placeholder*="type" i]').first();
  await chatInput.fill('هلو');
  await chatInput.press('Enter');

  // AI: Hello. I'm your researcher. Ready when you are.
  // Asserting that the AI responds as described in the transcript
  const aiResponse = page.locator('text=Hello. I\'m your researcher. Ready when you are.');
  await expect(aiResponse).toBeVisible();

  // USER: I'm not sure what to do in this page.
  // The bug is a lack of clear call-to-action (CTA) or instructions following the AI's response.
  // We assert that there are no visible guidance elements or instructions, which causes the user confusion.
  const instructions = page.locator('text=Instructions, text=How to start, .help-section');
  const actionButtons = page.getByRole('button').filter({ hasNotText: /send|submit/i });
  
  await expect(instructions).not.toBeVisible();
  await expect(actionButtons).toHaveCount(0);
});