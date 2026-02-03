import { test, expect } from '@playwright/test';

test('verify dashboard elements after navigation', async ({ page }) => {
  // Navigate to the application URL
  await page.goto('http://localhost:3000/');

  // Assert that the main title "Mission Control" is visible
  await expect(page.getByRole('heading', { name: 'Mission Control' })).toBeVisible();

  // Assert that the "Active Agents" card is visible
  await expect(page.getByText('Active Agents')).toBeVisible();
  await expect(page.getByText('12', { exact: true })).toBeVisible();

  // Assert that the "Hurdles Detected" card is visible
  await expect(page.getByText('Hurdles Detected')).toBeVisible();
  await expect(page.getByText('4', { exact: true })).toBeVisible();

  // The user hovered near "Free Plan" in the sidebar. Assert it's visible.
  await expect(page.getByText('Free Plan')).toBeVisible();

  // The user then moved the mouse over the main content, which includes the "Live Mission Feed".
  // Assert the "Live Mission Feed" title is visible.
  await expect(page.getByRole('heading', { name: 'Live Mission Feed' })).toBeVisible();

  // There are multiple "View Live" buttons within the "Live Mission Feed".
  // Assert that at least one of them is visible.
  await expect(page.locator('div').filter({ hasText: 'View Live' }).first()).toBeVisible();

  // Assert that the "System Status" card and "System Operational" status are visible
  await expect(page.getByRole('heading', { name: 'System Status' })).toBeVisible();
  await expect(page.getByText('System Operational')).toBeVisible();
});