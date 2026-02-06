import { test, expect } from '@playwright/test';

test('reproduce user navigation to sessions history and list verification', async ({ page }) => {
  // 1. Navigate to the dashboard
  await page.goto('http://localhost:3000/');

  // Initial check to ensure dashboard is loaded
  await expect(page.getByRole('heading', { name: 'Mission Control' })).toBeVisible();
  await expect(page.getByText('Active Agents')).toBeVisible();

  // 2. Click on the "Sessions" link in the navigation sidebar
  // Selector based on the provided DOM data: ID 39 is a link to /sessions
  const sessionsLink = page.getByRole('link', { name: 'Sessions' });
  await sessionsLink.click();

  // 3. Verify navigation to the sessions page
  await expect(page).toHaveURL('http://localhost:3000/sessions');

  // 4. Verify the "Session History" heading appears
  const historyHeading = page.getByRole('heading', { name: 'Session History' });
  await expect(historyHeading).toBeVisible();

  // 5. Verify the loading state transitions to the session list
  // The user events show a list populating with specific mission names
  const firstSessionName = page.getByText("I'm trying").first();
  const secondSessionName = page.getByText("work please").first();
  const thirdSessionName = page.getByText("Bones").first();

  // Assert that session records are visible in the history table
  await expect(firstSessionName).toBeVisible();
  await expect(secondSessionName).toBeVisible();
  await expect(thirdSessionName).toBeVisible();

  // 6. Verify status indicators are present (e.g., 'completed')
  // The DOM data adds several 'completed' badges (id 424, 455, etc.)
  const completedBadge = page.getByText('completed').first();
  await expect(completedBadge).toBeVisible();

  // 7. Verify interaction elements like 'View Recording' or 'Download' exist for sessions
  const viewRecordingButton = page.getByTitle('View Recording').first();
  await expect(viewRecordingButton).toBeVisible();
  
  const exportButton = page.getByRole('button', { name: 'Export All CSV' });
  await expect(exportButton).toBeVisible();
});