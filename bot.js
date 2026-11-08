const { chromium } = require('playwright');

const PADLET_URL = process.env.PADLET_URL;
const PADLET_PASSWORD = process.env.PADLET_PASSWORD;
const SEARCH_TEXT = process.env.SEARCH_TEXT || 'mario';
const REACTION = process.env.REACTION || 'like';
const reactRe = new RegExp(`${REACTION}|react|like|vote|upvote|heart|star|clap`, 'i');

if (!PADLET_URL || !PADLET_PASSWORD) throw new Error('PADLET_URL and PADLET_PASSWORD are required.');

async function labelOf(el) {
  const aria = (await el.getAttribute('aria-label').catch(() => '')) || '';
  const title = (await el.getAttribute('title').catch(() => '')) || '';
  const text = (await el.innerText().catch(() => '')) || '';
  return `${aria} ${title} ${text}`.trim();
}

async function findReaction(textHit) {
  // Walk up from the "mario" text to the full post, hovering to reveal hidden buttons
  for (let level = 1; level <= 10; level++) {
    const box = textHit.locator(`xpath=ancestor::*[${level}]`);
    if (!(await box.count())) break;
    await box.hover({ force: true }).catch(() => {});
    await textHit.page().waitForTimeout(300);
    const buttons = box.locator('button, [role="button"]');
    const n = await buttons.count();
    for (let i = 0; i < n; i++) {
      const b = buttons.nth(i);
      if (reactRe.test(await labelOf(b)) && (await b.isVisible().catch(() => false))) return b;
    }
  }
  return null;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  try {
    await page.goto(PADLET_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

    const password = page.locator('input[type="password"]').first();
    if (await password.isVisible({ timeout: 10000 }).catch(() => false)) {
      await password.fill(PADLET_PASSWORD);
      await password.press('Enter');
      await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    }
    await page.waitForTimeout(3000);

    const textHit = page.getByText(SEARCH_TEXT, { exact: false }).first();
    await textHit.waitFor({ state: 'visible', timeout: 30000 });
    await textHit.scrollIntoViewIfNeeded();
    console.log(`Found "${SEARCH_TEXT}".`);

    const btn = await findReaction(textHit);
    if (!btn) {
      // Debug: list every visible button so we can see Padlet's real labels
      const all = page.locator('button, [role="button"]');
      const n = await all.count();
      console.log('--- Visible buttons on page ---');
      for (let i = 0; i < n; i++) {
        const b = all.nth(i);
        if (await b.isVisible().catch(() => false)) console.log(`[${i}] ${await labelOf(b)}`);
      }
      throw new Error('No reaction button found near the post (see button list above).');
    }

    console.log(`Clicking: ${await labelOf(btn)}`);
    await btn.click();
    await page.waitForTimeout(1500);

    // If a reaction picker opened, pick the configured reaction
    const choice = page.getByRole('button', { name: new RegExp(REACTION, 'i') }).last();
    if (await choice.isVisible({ timeout: 1500 }).catch(() => false)) await choice.click().catch(() => {});

    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'result.png', fullPage: true });
    console.log('Reaction applied.');
  } catch (err) {
    await page.screenshot({ path: 'failure.png', fullPage: true }).catch(() => {});
    throw err;
  } finally {
    await browser.close();
  }
})();
