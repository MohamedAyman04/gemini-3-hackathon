import { test, expect } from '@playwright/test';

test('reproduce reported bug: Verify initial dashboard state on page load', async ({ page }) => {
  // Navigate to the application URL
  await page.goto('http://localhost:3000');

  // Assert page title
  await expect(page).toHaveTitle('VibeCheck | Autonomous User Testing');

  // Assert the main heading of the dashboard
  await expect(page.getByRole('heading', { name: 'Mission Control' })).toBeVisible();

  // Assert the "Active Agents" card details
  const activeAgentsCard = page.locator('div.rounded-2xl.border.backdrop-blur-xl.text-card-foreground.shadow-xl.border-white\\/5.bg-slate-900\\/40').filter({ hasText: 'Active Agents' });
  await expect(activeAgentsCard).toBeVisible();
  await expect(activeAgentsCard.getByText('Active Agents')).toBeVisible();
  await expect(activeAgentsCard.getByRole('heading', { name: '12' })).toBeVisible();
  await expect(activeAgentsCard.getByText('+2 from last hour')).toBeVisible();

  // Assert the "Hurdles Detected" card details
  const hurdlesDetectedCard = page.locator('div.rounded-2xl.border.backdrop-blur-xl.text-card-foreground.shadow-xl.border-white\\/5.bg-slate-900\\/40').filter({ hasText: 'Hurdles Detected' });
  await expect(hurdlesDetectedCard).toBeVisible();
  await expect(hurdlesDetectedCard.getByText('Hurdles Detected')).toBeVisible();
  await expect(hurdlesDetectedCard.getByRole('heading', { name: '4' })).toBeVisible();
  await expect(hurdlesDetectedCard.getByText('Running AI Analysis')).toBeVisible();

  // Assert "Live Mission Feed" section heading
  await expect(page.getByRole('heading', { name: 'Live Mission Feed' })).toBeVisible();
  await expect(page.getByText('Real-time activity from autonomous agents started via browser extension.')).toBeVisible();

  // Assert the first entry in "Live Mission Feed"
  const firstLiveMissionFeedEntry = page.locator('div.space-y-1 > div.flex.items-center.justify-between.px-6.py-4.hover\\:bg-white\\/5.transition-colors.cursor-pointer.border-l-2.border-transparent.hover\\:border-violet-500').first();
  await expect(firstLiveMissionFeedEntry).toBeVisible();
  await expect(firstLiveMissionFeedEntry.getByText("I'm trying")).toBeVisible();
  await expect(firstLiveMissionFeedEntry.getByText('http://localhost:3000/')).toBeVisible();
  await expect(firstLiveMissionFeedEntry.getByText('Monitoring')).toBeVisible();
  await expect(firstLiveMissionFeedEntry.getByRole('button', { name: 'View Live' })).toBeVisible();

  // Assert "System Status" card details
  const systemStatusCard = page.locator('div.rounded-2xl.border.border-white\\/5.bg-slate-900\\/50.backdrop-blur-xl.text-card-foreground.shadow-xl').filter({ hasText: 'System Status' });
  await expect(systemStatusCard).toBeVisible();
  await expect(systemStatusCard.getByRole('heading', { name: 'System Status' })).toBeVisible();
  await expect(systemStatusCard.getByText('System Operational')).toBeVisible();
  await expect(systemStatusCard.getByText('Online')).toBeVisible();

  // Assert "Daily Quota" within System Status card
  await expect(systemStatusCard.getByText('Daily Quota')).toBeVisible();
  await expect(systemStatusCard.getByText('10/10 Sessions')).toBeVisible();

  // Assert "Recent Missions" section heading
  const recentMissionsCard = page.locator('div.rounded-2xl.border.border-white\\/5.bg-slate-900\\/50.backdrop-blur-xl.text-card-foreground.shadow-xl.flex-1');
  await expect(recentMissionsCard.getByRole('heading', { name: 'Recent Missions' })).toBeVisible();

  // Assert the first entry in "Recent Missions"
  const firstRecentMissionEntry = recentMissionsCard.locator('div.space-y-1 > div.flex.items-center.justify-between.px-6.py-3.hover\\:bg-white\\/5.transition-colors.cursor-pointer.border-l-2.border-transparent.hover\\:border-violet-500').first();
  await expect(firstRecentMissionEntry).toBeVisible();
  await expect(firstRecentMissionEntry.getByText("I'm trying")).toBeVisible();
  await expect(firstRecentMissionEntry.getByText('http://localhost:3000/')).toBeVisible();
  await expect(firstRecentMissionEntry.getByText('Active')).toBeVisible();
});