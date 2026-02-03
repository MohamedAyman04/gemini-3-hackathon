import { test, expect } from '@playwright/test';

test('reproduce reported bug', async ({ page }) => {
  await page.goto('http://localhost:3000/');

  // Initial state check - verify the "Mission Control" title is visible
  await expect(page.getByRole('heading', { name: 'Mission Control' })).toBeVisible();
  
  // No user interactions provided in the DOM events beyond the initial load.
  // The provided DOM events data only contains the initial page load and snapshot.
  // Therefore, the test will simply assert the initial page load and the presence of key elements.
  // If there's an implicit bug related to the initial display, it should be covered here.

  // Assert that "Active Agents" card is visible and has a value
  const activeAgentsCard = page.locator('.rounded-2xl.border.backdrop-blur-xl.text-card-foreground.shadow-xl.border-white\\/5.bg-slate-900\\/40').filter({ hasText: 'Active Agents' });
  await expect(activeAgentsCard).toBeVisible();
  await expect(activeAgentsCard.getByRole('heading', { name: '12' })).toBeVisible(); // Asserting the number 12

  // Assert that "Hurdles Detected" card is visible and has a value
  const hurdlesDetectedCard = page.locator('.rounded-2xl.border.backdrop-blur-xl.text-card-foreground.shadow-xl.border-white\\/5.bg-slate-900\\/40').filter({ hasText: 'Hurdles Detected' });
  await expect(hurdlesDetectedCard).toBeVisible();
  await expect(hurdlesDetectedCard.getByRole('heading', { name: '4' })).toBeVisible(); // Asserting the number 4

  // Assert that "Live Mission Feed" section is visible
  await expect(page.getByRole('heading', { name: 'Live Mission Feed' })).toBeVisible();

  // Assert that at least one live mission entry is visible (e.g., "I'm trying")
  await expect(page.locator('div.flex.items-center.justify-between.px-6.py-4.hover\\:bg-white\\/5').filter({ hasText: 'I\'m trying' })).toBeVisible();
  await expect(page.locator('div.flex.items-center.justify-between.px-6.py-4.hover\\:bg-white\\/5').filter({ hasText: 'Monitoring' })).toBeVisible();
  await expect(page.locator('div.flex.items-center.justify-between.px-6.py-4.hover\\:bg-white\\/5').filter({ hasText: 'View Live' })).toBeVisible();

  // Assert "System Status" card is visible and operational
  const systemStatusCard = page.locator('.rounded-2xl.border.border-white\\/5.bg-slate-900\\/50').filter({ hasText: 'System Status' });
  await expect(systemStatusCard).toBeVisible();
  await expect(systemStatusCard.getByText('System Operational')).toBeVisible();
  await expect(systemStatusCard.getByRole('button', { name: 'Online' })).toBeVisible();

  // Assert "Recent Missions" section is visible
  await expect(page.getByRole('heading', { name: 'Recent Missions' })).toBeVisible();
  // Assert at least one recent mission entry is visible (e.g., "I'm trying")
  await expect(page.locator('div.flex.items-center.justify-between.px-6.py-3.hover\\:bg-white\\/5').filter({ hasText: 'I\'m trying' })).toBeVisible();
  await expect(page.locator('div.flex.items-center.justify-between.px-6.py-3.hover\\:bg-white\\/5').filter({ hasText: 'Active' })).toBeVisible();

  // Since no specific bug or user interaction was provided, this test assumes the bug relates
  // to the initial loading or display of the dashboard content.
  // All listed elements from the DOM events are expected to be visible upon page load.
});