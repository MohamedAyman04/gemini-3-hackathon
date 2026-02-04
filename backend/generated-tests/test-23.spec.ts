import { test, expect, Page } from '@playwright/test';

test.describe('Bug Reproduction for VibeCheck', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('http://localhost:3000');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('User input is not fully displayed in "Live Mission Feed"', async () => {
    // Navigate to the dashboard (already done in beforeEach, but good to explicitly state for clarity)
    await expect(page).toHaveURL('http://localhost:3000/');
    await expect(page.getByRole('heading', { name: 'Mission Control' })).toBeVisible();

    // Verify the initial text in the live mission feed entries
    // The user transcript shows "Hello there!\n How can\n I help\n you today?",
    // but the DOM data for 'Live Mission Feed' entries only shows fragmented parts like
    // "I'm trying", "work please", "work", "asdf", "please", "another", "Mission", "Bones", "Testing", "helloo"
    // This suggests that the full user input is not being captured or displayed correctly in the feed.

    // Let's check a few of the reported text fragments and assert that they are displayed.
    // The bug implies that the *full* transcript might be expected, but only fragmented parts appear.
    // Since we don't know the exact expected full string in each entry based on the current data,
    // we'll assert that the observed fragments are visible, and then note the discrepancy with the full transcript.

    // Given the user transcript "Hello there! How can I help you today?",
    // and the DOM showing textContent like "I'm trying", "work please", etc.,
    // the bug is likely that these short strings *are* the representation of the user's intent
    // but they don't combine to form the *full* "Hello there! How can I help you today?" in any single entry.
    // The prompt asks to reproduce the bug, which is the user seeing these short phrases instead of the full input.

    // Find the 'Live Mission Feed' section
    const liveMissionFeedSection = page.locator('div.rounded-2xl.border.backdrop-blur-xl.text-card-foreground.shadow-xl.border-white\\/5.bg-slate-900\\/40 >> text=Live Mission Feed').first().locator('xpath=ancestor::div[contains(@class, "rounded-2xl")]');

    // Assert that the listed fragments from the DOM events data are visible as separate entries.
    // These entries are children of a div with class "space-y-1" within the "Live Mission Feed" card.
    const missionEntryLocator = liveMissionFeedSection.locator('div.space-y-1 > div.flex.items-center.justify-between');

    // Expected fragments based on DOM events:
    const expectedFragments = [
      "I'm trying",
      "work please",
      "work",
      "asdf",
      "please",
      "another",
      "Mission",
      "Bones",
      "Testing",
      "helloo"
    ];

    for (const fragment of expectedFragments) {
      await expect(missionEntryLocator.filter({ hasText: fragment }).first()).toBeVisible();
      // Additional check to ensure the URL is also present for each fragment
      await expect(missionEntryLocator.filter({ hasText: fragment }).first()).toContainText('http://localhost:3000/');
    }

    // Now, assert the *absence* of the full user transcript in any single entry
    // to highlight the bug. The bug is that the system breaks down the user's
    // single coherent message into multiple, unrelated or partially related entries.
    const fullUserTranscript = "Hello there! How can I help you today?";
    await expect(page.locator(`p.text-sm.font-medium.text-gray-200:has-text("${fullUserTranscript}")`)).not.toBeVisible();

    // The bug report is based on the user transcript versus what's displayed.
    // The system is logging *fragments* of user input as separate events rather than the full user query as a single, coherent mission.
    // This is reproduced by verifying that these fragments are present and the full transcript is not.
  });
});