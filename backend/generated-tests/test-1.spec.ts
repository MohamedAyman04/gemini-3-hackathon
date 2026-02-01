import { test, expect } from '@playwright/test';

test('reproduce navigation between multiple live testing sessions', async ({ page }) => {
  // Navigate to the base URL
  await page.goto('http://localhost:3000/');

  // 1. Click on "Live View" navigation link
  const liveViewNav = page.locator('a[href="/live"]');
  await liveViewNav.click();
  await expect(page).toHaveURL('http://localhost:3000/live');

  // 2. Wait for sessions to load and join the "sayed" stream
  await page.waitForSelector('text=sayed');
  const joinSayed = page.locator('div').filter({ hasText: /^sayed/ }).getByRole('button', { name: 'Join Live Stream' });
  await joinSayed.click();

  // Verify we are in the live stream view for "sayed"
  await expect(page.locator('text=WEBSOCKET LIVE')).toBeVisible();
  // Based on the DOM, session IDs are generated/displayed
  await expect(page.locator('text=Session ID: #')).toBeVisible();

  // 3. Navigate back to "Live View" list via the sidebar
  await liveViewNav.click();
  await expect(page).toHaveURL('http://localhost:3000/live');

  // 4. Wait for sessions to load and join the "el astaza" stream
  await page.waitForSelector('text=el astaza');
  const joinElAstaza = page.locator('div').filter({ hasText: /^el astaza/ }).getByRole('button', { name: 'Join Live Stream' });
  await joinElAstaza.click();

  // Verify we are in the live stream view for "el astaza"
  await expect(page.locator('text=WEBSOCKET LIVE')).toBeVisible();
  await expect(page.locator('text=Friction Score')).toBeVisible();

  // 5. Use the "Exit View" button to return
  const exitViewButton = page.getByRole('button', { name: 'Exit View' });
  await exitViewButton.click();
  
  // 6. Navigate back to "Live View" list again
  await liveViewNav.click();
  await expect(page).toHaveURL('http://localhost:3000/live');

  // 7. Join another stream (representing the third "Join Live Stream" click in events)
  // This helps verify that the application handles repeated websocket connections/disconnections
  await page.waitForSelector('text=sayed');
  await page.locator('div').filter({ hasText: /^sayed/ }).getByRole('button', { name: 'Join Live Stream' }).click();

  // 8. Final exit
  await page.getByRole('button', { name: 'Exit View' }).click();

  // Assert that we are back at Mission Control or the Live Sessions list
  await expect(page.locator('h1')).toContainText(/Mission Control|Active Sessions/);
});