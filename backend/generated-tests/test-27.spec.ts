import { test, expect, Page } from '@playwright/test';

test.describe('Dashboard and Session History Bugs', () => {
  const BASE_URL = 'http://localhost:3000';

  test('Dashboard "View Live" button not working and Session History table spacing issue', async ({ page }) => {
    await page.goto(BASE_URL);

    // Assert initial state on Dashboard
    await expect(page.locator('h1.text-3xl.font-bold:has-text("Mission Control")')).toBeVisible();

    // Reproduce: "Dashboard View Live button not working"
    // User transcript indicates an attempt to click a "View Live" button on the dashboard.
    // DOM events show mouse movements over element with id 115 (a "View Live" button),
    // but no click event registered for it, suggesting it was unresponsive or ineffective.
    // The user subsequently navigates via the sidebar, reinforcing this.

    // Locate the first "View Live" button in the "Live Mission Feed" section
    const viewLiveButton = page.locator('div.space-y-1').filter({ hasText: 'Live Mission Feed' }).locator('div.inline-flex:has-text("View Live")').first();
    await expect(viewLiveButton).toBeVisible();

    // Store current URL and content to verify no navigation or change happens
    const initialUrl = page.url();
    const dashboardTitle = page.locator('h1.text-3xl.font-bold:has-text("Mission Control")');

    // Simulate clicking the "View Live" button
    await viewLiveButton.click();

    // Assert that the page did NOT navigate away from the dashboard.
    // This confirms the user's report that the "button is not working".
    await expect(page).toHaveURL(initialUrl);
    await expect(dashboardTitle).toBeVisible();
    console.log('BUG CONFIRMED: Dashboard "View Live" button did not trigger navigation as expected.');

    // Reproduce: "Session History Session table spacing hurdle"
    // The user proceeds to navigate to "Live View" and then "Sessions" via the sidebar.

    // Navigate to Live View via sidebar (following user's recorded navigation)
    const liveViewSidebarLink = page.locator('a[href="/live"]');
    await expect(liveViewSidebarLink).toBeVisible();
    await liveViewSidebarLink.click();
    await expect(page).toHaveURL(`${BASE_URL}/live`);
    await expect(page.locator('h1.text-3xl.font-bold:has-text("Active Sessions")')).toBeVisible(); // Heading for Live View page

    // Navigate to Sessions via sidebar (following user's recorded navigation)
    const sessionsSidebarLink = page.locator('a[href="/sessions"]');
    await expect(sessionsSidebarLink).toBeVisible();
    await sessionsSidebarLink.click();
    await expect(page).toHaveURL(`${BASE_URL}/sessions`);

    // Assert the presence of the Session History table
    await expect(page.locator('h1.text-3xl.font-bold:has-text("Session History")')).toBeVisible();

    // Verify key elements of the table are present
    const tableContainer = page.locator('div.rounded-2xl.border.backdrop-blur-xl:has-text("Recent Missions")');
    await expect(tableContainer).toBeVisible();

    const tableHeader = tableContainer.locator('div.flex.items-center.border-b.border-white\\/5');
    await expect(tableHeader).toBeVisible();
    await expect(tableHeader.locator('text="Mission Name"')).toBeVisible();
    await expect(tableHeader.locator('text="Status"')).toBeVisible();
    await expect(tableHeader.locator('text="Target URL"')).toBeVisible();
    await expect(tableHeader.locator('text="Issues"')).toBeVisible();
    await expect(tableHeader.locator('text="Actions"')).toBeVisible();

    // Verify at least one table row is visible
    const firstTableRow = tableContainer.locator('div.flex.items-center.px-6.py-4.hover\\:bg-white\\/5').first();
    await expect(firstTableRow).toBeVisible();

    console.log('BUG OBSERVED: Session History table is displayed. User reported visual spacing issue needing it to be more compact.');
    // Automated assertion of "compactness" would require specific CSS property checks
    // or visual regression testing, which is beyond the scope of this functional reproduction.
    // The presence of the table and the console log note serves to reproduce the context of the bug.
  });
});