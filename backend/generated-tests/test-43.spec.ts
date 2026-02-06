import { test, expect } from '@playwright/test';

test('reproduce bug from user transcript', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // USER: Hallo.
  // Locating a common chat input field (input, textarea, or ARIA textbox)
  const chatInput = page.locator('input, textarea, [role="textbox"], [contenteditable="true"]').first();
  await chatInput.fill('Hallo.');
  await page.keyboard.press('Enter');

  // AI: Hello. Are you ready to begin the mission?
  // Assert that the AI response appears on the screen
  const aiResponse = page.getByText('Hello. Are you ready to begin the mission?', { exact: false });
  await expect(aiResponse).toBeVisible();
});