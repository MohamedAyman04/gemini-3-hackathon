import { test, expect } from '@playwright/test';

test.describe('Body overflow style bug reproduction', () => {
  test('should set body overflow-x and overflow-y to hidden via inline style', async ({ page }) => {
    // Navigate to the reported URL
    await page.goto('http://localhost:3000/');

    // The DOM events indicate that, after the initial load, the 'body' element's
    // inline style attribute is updated to set 'overflow-x' and 'overflow-y' to 'hidden'.
    // This could be a late-loading script or a dynamic style application.
    // We will assert that the 'body' element eventually has these specific inline styles.

    const bodyElement = page.locator('body');

    // Use toHaveJSProperty to check the inline style properties on the DOM element.
    // This precisely reflects the 'style' object changes from the DOM events data.
    await expect(bodyElement).toHaveJSProperty('style', expect.objectContaining({
      overflowX: 'hidden',
      overflowY: 'hidden',
    }), { timeout: 20000 }); // Increased timeout as the event occurred after ~18 seconds
  });
});