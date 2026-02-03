import { test, expect, Page } from '@playwright/test';

test.describe('Dashboard navigation and content verification', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('http://localhost:3000/');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Should display "Mission Control" heading and a list of live missions with "View Live" buttons', async () => {
    // Assert that the user is on the Dashboard page by checking the active navigation link
    const dashboardLink = page.locator('a[href="http://localhost:3000/"]');
    await expect(dashboardLink).toHaveClass(/bg-violet-600\/10 text-violet-400/);
    await expect(dashboardLink).toHaveText('Dashboard');

    // Assert the presence of the "Mission Control" heading
    const missionControlHeading = page.getByRole('heading', { name: 'Mission Control' });
    await expect(missionControlHeading).toBeVisible();

    // Assert the descriptive paragraph under Mission Control
    await expect(page.getByText('Initialize new autonomous testing sessions and monitor active agents.')).toBeVisible();

    // Assert the "Active Agents" card
    await expect(page.getByText('Active Agents')).toBeVisible();
    await expect(page.locator('h3.text-4xl:has-text("12")')).toBeVisible();
    await expect(page.getByText('+2 from last hour')).toBeVisible();

    // Assert the "Hurdles Detected" card
    await expect(page.getByText('Hurdles Detected')).toBeVisible();
    await expect(page.locator('h3.text-4xl:has-text("4")')).toBeVisible();
    await expect(page.getByText('Running AI Analysis')).toBeVisible();

    // Assert the "Live Mission Feed" card heading and description
    await expect(page.getByRole('heading', { name: 'Live Mission Feed' })).toBeVisible();
    await expect(page.getByText('Real-time activity from autonomous agents started via browser extension.')).toBeVisible();

    // Verify at least one live mission entry is visible and contains expected elements
    const liveMissionEntries = page.locator('div.space-y-1 > div.flex.items-center.justify-between');
    await expect(liveMissionEntries).toBeGreaterThan(0); // Ensure at least one mission is displayed

    // Check the first live mission entry more specifically
    const firstMissionEntry = liveMissionEntries.first();
    await expect(firstMissionEntry.locator('div.w-2.h-2.rounded-full.bg-emerald-500.animate-pulse')).toBeVisible(); // Live indicator
    await expect(firstMissionEntry.locator('p.text-sm.font-medium.text-gray-200')).toBeVisible(); // Mission title
    await expect(firstMissionEntry.locator('p.text-xs.text-gray-500')).toBeVisible(); // URL
    await expect(firstMissionEntry.locator('p.text-xs.text-gray-400:has-text("Status")')).toBeVisible(); // Status label
    await expect(firstMissionEntry.locator('p.text-xs.text-emerald-400.font-medium:has-text("Monitoring")')).toBeVisible(); // Monitoring status
    await expect(firstMissionEntry.locator('div.inline-flex:has-text("View Live")')).toBeVisible(); // View Live button

    // Assert the "System Status" card
    await expect(page.getByRole('heading', { name: 'System Status' })).toBeVisible();
    await expect(page.getByText('System Operational')).toBeVisible();
    await expect(page.locator('div.inline-flex:has-text("Online")')).toBeVisible();
    await expect(page.getByText('Daily Quota')).toBeVisible();
    await expect(page.getByText('10/10 Sessions')).toBeVisible();

    // Assert the "Recent Missions" card
    await expect(page.getByRole('heading', { name: 'Recent Missions' })).toBeVisible();
    
    // Verify at least one recent mission entry is visible and contains expected elements
    const recentMissionEntries = page.locator('div.p-6.px-0.py-2 div.space-y-1 > div.flex.items-center.justify-between');
    await expect(recentMissionEntries).toBeGreaterThan(0); // Ensure at least one mission is displayed

    // Check the first recent mission entry more specifically
    const firstRecentMissionEntry = recentMissionEntries.first();
    await expect(firstRecentMissionEntry.locator('svg.lucide.lucide-circle-check')).toBeVisible(); // Success icon
    await expect(firstRecentMissionEntry.locator('p.text-sm.font-medium.text-gray-200')).toBeVisible(); // Mission title
    await expect(firstRecentMissionEntry.locator('p.text-xs.text-gray-500')).toBeVisible(); // URL
    await expect(firstRecentMissionEntry.locator('div.inline-flex:has-text("Active")')).toBeVisible(); // Status badge

    // Assert the "View All History" button
    await expect(page.getByRole('button', { name: 'View All History' })).toBeVisible();
  });
});