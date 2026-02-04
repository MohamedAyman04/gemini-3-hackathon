import { test, expect, Page } from '@playwright/test';

test.describe('Dashboard and Sessions page navigation and "View Live" button bug', () => {

  test('should navigate to Sessions and verify "View Live" button functionality', async ({ page }) => {
    await page.goto('http://localhost:3000/');

    // User is on the Dashboard page initially (current URL: http://localhost:3000/)
    // AI: "Hello, I'm ready to observe your testing."
    // AI: "Noted. I've recorded the hurdle that the "View Live" button is not functioning."

    // Navigate to the "Sessions" page by clicking the corresponding link in the sidebar
    await page.getByRole('link', { name: 'Sessions' }).click();
    await expect(page).toHaveURL('http://localhost:3000/sessions');
    
    // AI: "Understood, the table needs to be more compact."
    // AI: "The table is "Session History"."

    // The user mentions "View Live" button is not functioning.
    // The previous DOM events show multiple "View Live" buttons on the dashboard,
    // and the user explicitly clicked the "Sessions" link.
    // The sessions page displays a table of past sessions.
    // Assuming the bug report refers to the "View Live" buttons on the *dashboard*
    // which led the AI to say "View Live" button is not functioning.
    // Since we are now on the sessions page, we should confirm the table elements.

    // Check for the presence of the "Session History" heading
    await expect(page.getByRole('heading', { name: 'Session History' })).toBeVisible();

    // Verify the table header columns are present
    await expect(page.getByText('Mission Name')).toBeVisible();
    await expect(page.getByText('Status', { exact: true })).toBeVisible();
    await expect(page.getByText('Target URL')).toBeVisible();
    await expect(page.getByText('Issues')).toBeVisible();
    await expect(page.getByText('Actions')).toBeVisible();

    // Since the bug was reported on the "View Live" button not functioning,
    // and the context shifted to the "Sessions" page, we need to make an assertion
    // about the state of the "View Live" buttons on the original dashboard or their absence on the current page.
    // Given the instructions are to reproduce the bug, and the user's focus shifted,
    // we assume the "View Live" button bug was observed on the dashboard *before* navigating to sessions.
    // However, the DOM events show mouse movements over "View Live" buttons *on the dashboard*
    // but no click event for them. The only click event is for the "Sessions" link.

    // Re-evaluating based on the AI transcript: "Noted. I've recorded the hurdle that the "View Live" button is not functioning."
    // This statement happens *before* the user navigates to the sessions page,
    // and is a direct observation of the AI. The DOM events show mouse activity over these buttons on the dashboard.
    // While the user did not click them in the provided events, the AI's statement implies a non-functional state.
    // To reproduce this, we should attempt to click one of these buttons.
    // Then, since the user then moved to the sessions page, we follow that flow too.

    // Let's go back to the dashboard or simulate clicking from there,
    // if the intention is to reproduce the "View Live" bug.

    // We can infer that the bug is that clicking "View Live" does not redirect to /live or show a live view.
    // The current page is /sessions. There are no "View Live" buttons on the /sessions page itself directly.
    // The earlier DOM snapshot (ID 116, 132, 148, 164, 180, 196, 212, 228, 244, 260) shows multiple "View Live" buttons on the dashboard.
    // Let's click the first "View Live" button on the dashboard.

    await page.goBack(); // Navigate back to the dashboard to interact with the "View Live" buttons if they were there.
    await expect(page).toHaveURL('http://localhost:3000/');

    // Locate and click the first "View Live" button on the dashboard.
    // The textContent for the button is 'View Live'.
    // Looking at DOM events, element ID 116 (a div acting as a button) is at x:1169, y:449.
    // Its parent is a div with class "flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors cursor-pointer border-l-2 border-transparent hover:border-violet-500"
    // This suggests it's a clickable item in a list of live missions.
    const firstViewLiveButton = page.locator('div.inline-flex.items-center.rounded-full.border.px-2\.5.py-0\.5.text-xs.font-semibold.transition-colors:has-text("View Live")').first();
    await expect(firstViewLiveButton).toBeVisible();

    // Click the "View Live" button.
    await firstViewLiveButton.click();

    // BUG: The "View Live" button is not functioning.
    // This implies that after clicking, the expected action (e.g., navigating to a live view page,
    // opening a modal for live view, etc.) does not occur.
    // Based on common UI patterns, clicking "View Live" should likely navigate to a /live or /sessions/{id}/live route,
    // or display a live feed. Since the AI reported it as "not functioning", we'll assert that
    // the URL does not change to an expected live view page.
    // Assuming the expected behavior is a navigation to `/live/{session_id}` or `/live`.
    // The current state is that the page stays on the dashboard or redirects unexpectedly.

    // Since the AI states "the 'View Live' button is not functioning", we expect that
    // the page *does not* navigate to a live view. The most common alternative
    // for a non-functional button is that it simply does nothing or stays on the same page.
    // We expect the URL to remain at the dashboard or the page to show no change.
    // Given the original application structure, it's likely meant to go to a live view page,
    // possibly `http://localhost:3000/live/{session_id}` or similar.
    // If it stays on the dashboard, that's the bug.
    
    // We need to capture the current URL *before* clicking for a robust check.
    const initialUrl = page.url();
    await firstViewLiveButton.click();
    await page.waitForTimeout(1000); // Give some time for a potential navigation that fails silently.

    // Assert that the URL has NOT changed, indicating the button did not function as expected.
    // Or, if there is a known error page for non-functional links, check for that.
    // Given the phrasing "not functioning", staying on the same page is a strong indicator of the bug.
    expect(page.url()).toBe(initialUrl);

    // AI: "Goodbye. I've recorded all your feedback."
  });
});