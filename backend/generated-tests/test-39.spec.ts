import { test, expect } from '@playwright/test';

test('reproduce user reported issues at localhost:3000', async ({ page }) => {
  // 1. User arrives at the page
  await page.goto('http://localhost:3000');

  // 2. USER: "I'm not sure what to do in this page."
  // Hurdle: Check if page content is present but potentially confusing/unclear
  await expect(page).toHaveURL('http://localhost:3000');
  await page.waitForLoadState('networkidle');

  // 3. USER: "this but ton n't seem to work."
  // Bug: The user identifies a button that is non-functional.
  // We locate the primary button on the page to reproduce the interaction.
  const targetButton = page.getByRole('button').first();
  await expect(targetButton).toBeVisible();
  
  // Attempt to click the button
  await targetButton.click();

  // Assertion: The button is reported as not working. 
  // We verify that no expected side effects occurred (e.g., no navigation, no success message).
  // This confirms the "not working" state.
  const successIndicator = page.locator('.success-message, .status-updated, #confirmation');
  await expect(successIndicator).not.toBeVisible();

  // 4. USER: "Okay boy."
  // AI logged this as a bug. This likely refers to unexpected text or an element on the screen.
  const bugElement = page.getByText('Okay boy');
  await expect(bugElement).toBeVisible();
});