import { test, expect } from '@playwright/test';

test('Session History Filter button is unresponsive and Live Mission Feed table layout', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Navigate to Sessions History as per initial URL and user transcript
  await page.click('a[href="http://localhost:3000/sessions"]');
  await expect(page.locator('h1:has-text("Session History")')).toBeVisible();

  // Bug 1: Filter button unresponsive
  // The user transcript states "Session History, Filter button: Unresponsive."
  // Based on the DOM events, the user hovers over the button (id 66) multiple times
  // but there are no click events associated with it, nor any subsequent DOM changes
  // that would indicate a filter modal/dropdown appearing.
  // We will assert that clicking the button does NOT result in any visible change
  // that would suggest interactivity (e.g., a new element appearing).
  const filterButton = page.locator('button:has-text("Filter")');
  await expect(filterButton).toBeVisible();

  // Capture current state before clicking
  const initialDomState = await page.content();
  await filterButton.click();

  // Wait a short period to allow any *potential* UI change if it were responsive
  await page.waitForTimeout(500); // Small wait to ensure any async UI updates are captured.

  // Assert that the DOM has not visibly changed in a way that implies a filter dialog opened.
  // This is a common way to assert unresponsiveness if no specific error message appears.
  // We check for absence of common modal/popover/dialog selectors or a significant DOM alteration.
  // Since the DOM events don't show any adds/removes related to a click on this button,
  // we can infer that clicking it did not trigger any expected UI behavior.
  // Let's check for the absence of a common modal pattern: a new element with role="dialog" or similar.
  await expect(page.locator('[role="dialog"], [aria-modal="true"], .modal, .dialog')).not.toBeVisible();
  // Optionally, we could compare the DOM snapshot, but checking for specific interaction results is more direct.
  // For this bug, the lack of *any* change is the unresponsiveness.

  // Navigate to Dashboard from the sidebar for the second bug.
  // DOM events show a hover and click on the 'Live View' (id 44) link, then a navigation to dashboard.
  // The transcript states "Dashboard, Live Mission Feed table: Layout could be more compact."
  // This implies the user navigated to Live View (which is described as 'Live Mission Feed') and observed the layout.
  await page.click('a[href="http://localhost:3000/live"]');
  await expect(page.locator('h1:has-text("Mission Control")')).toBeVisible();

  // Bug 2: Live Mission Feed table layout could be more compact.
  // The user observes the 'Live Mission Feed' table layout.
  // This is a subjective UI/UX feedback. To reproduce this, we need to locate the table
  // and potentially check its visual structure.
  // The transcript explicitly mentions "Live Mission Feed table", and the DOM event after navigating to /live
  // shows elements like `id=495` with text "Live Mission Feed".
  // The layout issue refers to the visual presentation. We can assert that the specific
  // layout elements described in the DOM (e.g., wide padding, explicit widths on columns)
  // are present, which visually indicates the "less compact" layout.

  const liveMissionFeedTable = page.locator('h3:has-text("Live Mission Feed")').locator('..').locator('..');
  await expect(liveMissionFeedTable).toBeVisible();

  // Assertions for "less compact" layout:
  // - The overall table or container having generous padding.
  // - Individual items having explicit large gaps or padding.
  // From DOM, we see:
  // - `id=532` (and similar divs) for each row, with `px-6 py-4` for padding.
  // - `id=533` (inner div) with `gap-6`.
  // - `id=549` (inner div within row) with `gap-4`.

  // We can assert on the presence of these styles to confirm the current layout configuration.
  await expect(liveMissionFeedTable.locator('div.flex.items-center.justify-between').first()).toHaveClass(/px-6/);
  await expect(liveMissionFeedTable.locator('div.flex.items-center.justify-between').first()).toHaveClass(/py-4/);
  await expect(liveMissionFeedTable.locator('div.flex.items-center.gap-6').first()).toHaveClass(/gap-6/);
  await expect(liveMissionFeedTable.locator('div.flex.items-center.gap-4').first()).toHaveClass(/gap-4/);

  // Take a screenshot to visually document the perceived "non-compact" layout.
  await page.screenshot({ path: 'live-mission-feed-layout.png', fullPage: true });

  // No specific functional failure for this bug, just a visual observation.
  // The test verifies the elements contributing to the reported layout are present.
});