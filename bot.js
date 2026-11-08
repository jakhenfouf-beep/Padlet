const { chromium } = require('playwright');

const PADLET_URL = process.env.PADLET_URL;
const PADLET_PASSWORD = process.env.PADLET_PASSWORD;
const SEARCH_TEXT = process.env.SEARCH_TEXT || 'mario';
const REACTION = process.env.REACTION || 'like';

if (!PADLET_URL || !PADLET_PASSWORD) {
  throw new Error('PADLET_URL and PADLET_PASSWORD are required.');
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  try {
    await page.goto(PADLET_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Password-protected Padlet board.
    const password = page.locator('input[type="password"]').first();
    if (await password.isVisible({ timeout: 10000 }).catch(() => false)) {
      await password.fill(PADLET_PASSWORD);
      const submit = page.getByRole('button', { name: /submit|enter|continue|unlock|access/i }).first();
      if (await submit.isVisible().catch(() => false)) await submit.click();
      else await password.press('Enter');
      await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    }

    // Try Padlet's search control first.
    const searchButton = page.getByRole('button', { name: /search/i }).first();
    if (await searchButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchButton.click();
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
      if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await searchInput.fill(SEARCH_TEXT);
        await searchInput.press('Enter').catch(() => {});
        await page.waitForTimeout(1500);
      }
    }

    // Locate the post/card containing the requested text.
    const textHit = page.getByText(SEARCH_TEXT, { exact: false }).first();
    await textHit.waitFor({ state: 'visible', timeout: 30000 });
    const post = textHit.locator('xpath=ancestor::*[@role="article" or @data-testid or self::article][1]');
    const card = (await post.count()) ? post : textHit.locator('xpath=ancestor::*[self::article or self::section or self::div][1]');
    await card.scrollIntoViewIfNeeded();

    // Open reactions. The selectors are intentionally label-based to survive CSS changes.
    let reactionButton = card.getByRole('button', { name: new RegExp(REACTION, 'i') }).first();
    if (!(await reactionButton.isVisible().catch(() => false))) {
      reactionButton = card.getByRole('button', { name: /react|reaction|like|vote|heart|star/i }).first();
    }
    if (!(await reactionButton.isVisible().catch(() => false))) {
      throw new Error(`Found "${SEARCH_TEXT}", but no reaction control was visible.`);
    }
    await reactionButton.click();

    // If a reaction menu opened, choose the configured reaction.
    const menuChoice = page.getByRole('button', { name: new RegExp(REACTION, 'i') }).last();
    if (await menuChoice.isVisible({ timeout: 2000 }).catch(() => false)) {
      await menuChoice.click().catch(() => {});
    }

    await page.waitForTimeout(1000);
    console.log(`Reaction "${REACTION}" applied to the first post matching "${SEARCH_TEXT}".`);
  } catch (err) {
    await page.screenshot({ path: 'failure.png', fullPage: true }).catch(() => {});
    throw err;
  } finally {
    await browser.close();
  }
})();
