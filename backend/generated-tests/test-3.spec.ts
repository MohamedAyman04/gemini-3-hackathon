import { test, expect } from '@playwright/test';

test.describe('VibeCheck Dashboard Bug Reproduction', () => {
  test('Reproduce user interactions on dashboard with scrolling', async ({ page }) => {
    // 1. Navigate to the reported URL
    await page.goto('http://localhost:3000/');
    // Wait for the page to be fully loaded, including network requests
    await page.waitForLoadState('networkidle');

    // 2. Set the viewport size as reported in the first DOM event
    await page.setViewportSize({ width: 1869, height: 992 });

    // Selectors for the scrollable areas identified from DOM events
    // Sidebar scrollable content area (id: 30)
    const sidebarScrollableArea = page.locator('div.flex-1.overflow-y-auto.px-3.py-4');
    // Main content scrollable area (id: 57)
    const mainContentScrollableArea = page.locator('main.flex-1.overflow-auto');

    // --- Simulate sidebar scrolling down (based on mouse movements from 1770121912581 to 1770121913082) ---
    // User moves mouse into the sidebar and scrolls down, indicated by Y-coordinate increase.
    await sidebarScrollableArea.hover(); // Position mouse over the sidebar content
    await page.mouse.wheel(0, 200); // Scroll down approximately 200 pixels
    await page.waitForTimeout(500); // Simulate a brief pause by the user

    // --- Simulate sidebar scrolling up (based on mouse movements from 1770121927434 to 1770121929314) ---
    // User moves mouse around the bottom of the sidebar, then scrolls up.
    await sidebarScrollableArea.hover(); // Ensure mouse is still over the sidebar
    await page.mouse.wheel(0, -200); // Scroll up approximately 200 pixels
    await page.waitForTimeout(500);

    // --- Simulate main content interaction (based on mouse movements from 1770121933175 to 1770121934697) ---
    // User moves mouse to the main content area, then moves around elements within it.
    await mainContentScrollableArea.hover(); // Position mouse over the main content
    await page.mouse.wheel(0, 300); // Scroll down the main content area
    await page.waitForTimeout(500);

    // --- Simulate click on main content area (based on events 1770121935098 & 1770121935145) ---
    // User performs a click within the main content area. This could be to focus it for scrolling
    // or an incidental click.
    await page.click('main.flex-1.overflow-auto', { position: { x: 330, y: 772 } });
    await page.waitForTimeout(100); // Short pause after click

    // --- Simulate main content scrolling up (based on mouse movements from 1770121935203) ---
    await mainContentScrollableArea.hover(); // Ensure mouse is over main content for scrolling
    await page.mouse.wheel(0, -150); // Scroll up the main content area
    await page.waitForTimeout(500);

    // --- Simulate fast sidebar scrolling up (based on mouse movements from 1770121941854) ---
    // User moves mouse back to sidebar and scrolls dramatically upwards.
    await sidebarScrollableArea.hover(); // Position mouse over sidebar
    await page.mouse.wheel(0, -500); // Scroll quickly towards the top of the sidebar
    await page.waitForTimeout(500);

    // --- Simulate sidebar scrolling down again (based on mouse movements from 1770121942861 to 1770121944382) ---
    // After scrolling up, user scrolls down again slightly.
    await sidebarScrollableArea.hover(); // Ensure mouse is over sidebar
    await page.mouse.wheel(0, 100); // Scroll down a bit
    await page.waitForTimeout(500);

    // Assert that the page state is as expected after all interactions.
    // Since no specific bug description is provided, a visual regression test is used.
    // Dynamic elements (like counts, mission titles/URLs) are masked to prevent flakiness.
    await expect(page).toHaveScreenshot('dashboard-after-interactions.png', {
      mask: [
        // Mask the "Active Agents" count
        page.locator('h3:has-text("12")'),
        // Mask the "Active Agents" delta
        page.locator('div.text-xs.text-emerald-400.flex.items-center.gap-1'),
        // Mask the "Hurdles Detected" count
        page.locator('h3:has-text("4")'),
        // Mask the "Hurdles Detected" analysis status
        page.locator('div.text-xs.text-violet-400.flex.items-center.gap-1'),
        // Mask the text content and URLs in the "Live Mission Feed"
        page.locator('div.space-y-1').filter({ hasText: 'Live Mission Feed' }).locator('p.text-sm.font-medium.text-gray-200'),
        page.locator('div.space-y-1').filter({ hasText: 'Live Mission Feed' }).locator('p.text-xs.text-gray-500'),
        // Mask the text content and URLs in the "Recent Missions"
        page.locator('div.space-y-1').filter({ hasText: 'Recent Missions' }).locator('p.text-sm.font-medium.text-gray-200'),
        page.locator('div.space-y-1').filter({ hasText: 'Recent Missions' }).locator('p.text-xs.text-gray-500'),
      ],
      // Adjust the threshold if minor pixel differences are acceptable
      // threshold: 0.2,
    });
  });
});