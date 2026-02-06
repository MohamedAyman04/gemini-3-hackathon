import { test, expect } from '@playwright/test';

test('reproduce filter button bug on sessions page', async ({ page }) => {
  // Navigate to the starting URL
  await page.goto('http://localhost:3000/live');

  // Navigate to the Dashboard as per DOM events (ID 32)
  await page.getByRole('link', { name: 'Dashboard' }).click();

  // Navigate to the Sessions page as per DOM events (ID 39)
  await page.getByRole('link', { name: 'Sessions' }).click();

  // Verify we are on the Sessions page and the table has loaded
  await expect(page.getByRole('heading', { name: 'Session History' })).toBeVisible();

  // Locate the Filter button (ID 415 in DOM events)
  const filterButton = page.getByRole('button', { name: /Filter/i });
  await expect(filterButton).toBeVisible();

  // The user reported: "I 'm trying to fil ter but it's not working."
  // Perform the click action that is failing to trigger the expected behavior
  await filterButton.click();

  /**
   * BUG REPRODUCTION ASSERTION:
   * When a user clicks a "Filter" button, a menu, popover, or input field is expected to appear.
   * Based on the user transcript, the filter functionality is unresponsive.
   * We assert that no filter-related UI (like a dialog or search input) becomes visible after the click.
   */
  const filterPopover = page.locator('[role="dialog"], [role="menu"], input[placeholder*="Filter"]');
  
  // If the bug exists, this assertion will pass (confirming nothing happened) 
  // or we can assert that it SHOULD be visible to make the test fail when the bug is present.
  // To strictly reproduce the "not working" state:
  const isFilterUIVisible = await filterPopover.isVisible();
  expect(isFilterUIVisible).toBe(false);
});