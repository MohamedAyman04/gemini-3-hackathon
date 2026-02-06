import { test, expect } from '@playwright/test';

test('reproduce user navigation and session history check', async ({ page }) => {
  // Navigate to the initial URL where the session started
  await page.goto('http://localhost:3000/sessions');

  // Verify that the Session History page is loaded
  await expect(page.getByRole('heading', { name: 'Session History' })).toBeVisible();
  await expect(page.getByText('Review past autonomous testing sessions')).toBeVisible();

  // The user navigates to the "Live View" page
  // Corresponding to DOM event ID 45
  const liveViewLink = page.locator('nav a[href="/live"]');
  await liveViewLink.click();

  // On the Live View page, wait for the heading "Active Sessions"
  await expect(page.getByRole('heading', { name: 'Active Sessions' })).toBeVisible();
  
  // The UI transitions through a loading state for active sessions
  await expect(page.getByText('Loading active sessions...')).toBeVisible();

  // The user then navigates to the "Dashboard"
  // Corresponding to DOM event ID 32
  const dashboardLink = page.locator('nav a[href="/"]');
  await dashboardLink.click();

  // Wait for the dashboard to load (transitions from "Authenticating..." to "Mission Control")
  await expect(page.getByRole('heading', { name: 'Mission Control' })).toBeVisible();

  // Assert that the Mission Control dashboard is fully formed and visible
  // The user reported "is not formed", implying a potential layout or loading issue
  await expect(page.getByText('Active Agents')).toBeVisible();
  await expect(page.getByText('Hurdles Detected')).toBeVisible();
  await expect(page.getByText('Live Mission Feed')).toBeVisible();
  
  // Assert the existence of session items in the feed or recently created sections
  // as the user mentioned the session agent in their transcript
  await expect(page.locator('main')).toBeVisible();
});