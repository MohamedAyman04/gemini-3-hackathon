import { test, expect } from '@playwright/test';

test('reproduce reported bug based on initial page load', async ({ page }) => {
  // Navigate to the provided URL
  await page.goto('http://localhost:3000');

  // Since no user transcript or specific DOM events beyond initial load were provided,
  // we will assert that the page loads correctly and key elements are visible.
  // This simulates the user observing the initial state of the application.

  // 1. Assert the page title
  await expect(page).toHaveTitle(/VibeCheck | Autonomous User Testing/);

  // 2. Assert that the main heading "Mission Control" is visible
  await expect(page.getByRole('heading', { name: 'Mission Control' })).toBeVisible();

  // 3. Assert that the "Active Agents" card is visible and contains expected text
  const activeAgentsCard = page.locator('div').filter({ hasText: 'Active Agents12+2 from last hour' }).first();
  await expect(activeAgentsCard).toBeVisible();
  await expect(activeAgentsCard.getByText('Active Agents')).toBeVisible();
  await expect(activeAgentsCard.getByRole('heading', { name: '12' })).toBeVisible();

  // 4. Assert that the "Hurdles Detected" card is visible
  const hurdlesDetectedCard = page.locator('div').filter({ hasText: 'Hurdles Detected4Running AI Analysis' }).first();
  await expect(hurdlesDetectedCard).toBeVisible();
  await expect(hurdlesDetectedCard.getByText('Hurdles Detected')).toBeVisible();
  await expect(hurdlesDetectedCard.getByRole('heading', { name: '4' })).toBeVisible();

  // 5. Assert that the "Live Mission Feed" section heading is visible
  await expect(page.getByRole('heading', { name: 'Live Mission Feed' })).toBeVisible();

  // 6. Assert that at least one "View Live" button is present (indicating missions are listed)
  await expect(page.getByRole('button', { name: 'View Live' }).first()).toBeVisible();

  // 7. Assert that the "System Operational" status is visible
  const systemStatusCard = page.locator('div').filter({ hasText: 'System OperationalOnline' }).first();
  await expect(systemStatusCard).toBeVisible();
  await expect(systemStatusCard.getByText('System Operational')).toBeVisible();
  await expect(systemStatusCard.getByText('Online')).toBeVisible();

  // 8. Assert that the "Recent Missions" heading is visible
  await expect(page.getByRole('heading', { name: 'Recent Missions' })).toBeVisible();

  // 9. Assert that the "View All History" button is visible
  await expect(page.getByRole('button', { name: 'View All History' })).toBeVisible();
});