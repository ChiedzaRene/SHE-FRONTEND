const { test, expect } = require('@playwright/test');
const { json, mockApi, signIn } = require('./helpers');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

test('a branded splash shows while the app itself is still downloading', async ({ page }) => {
  // hold back the app's JavaScript so only the start-up page is visible
  await page.route(/fonts\.googleapis|fonts\.gstatic/, (r) => r.abort());
  let release;
  const held = new Promise((r) => { release = r; });
  await page.route(/\/static\/js\/main\..*\.js$/, async (route) => { await held; await route.continue(); });
  await page.goto('/login', { waitUntil: 'commit' });
  await expect(page.locator('.boot')).toBeVisible();
  await expect(page.locator('.boot')).toContainText('Loading Glow SHE');
  if (process.env.SHOTS) {
    // a normal screenshot waits for the page to finish loading, which is exactly what is being held back
    const cdp = await page.context().newCDPSession(page);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
    require('fs').writeFileSync(`${process.env.SHOTS}/load_boot.png`, Buffer.from(data, 'base64'));
  }
  release();
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  await expect(page.locator('.boot')).toHaveCount(0);
});

test('the dashboard shows a loading screen, then a slow-server note, instead of a blank page', async ({ page }) => {
  await mockApi(page, {
    'GET /incidents/summary': async (route) => { await wait(7500); return route.fulfill(json(200, { total: 0, open: 0, by_type: [], by_site: [] })); },
  });
  await signIn(page, { role: 'admin' }); // lands on the admin dashboard
  await expect(page.getByText('Loading dashboard...')).toBeVisible();
  await expect(page.locator('.activity-bar')).toBeVisible();
  await expect(page.getByText(/server may be waking up/)).toBeVisible({ timeout: 8000 });
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/load_slow.png` });
  await expect(page.getByText('Overall SHE Dashboard')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.activity-bar')).toHaveCount(0);
  await expect(page.getByText(/server may be waking up/)).toHaveCount(0);
});

test('saving shows the activity bar until the server answers', async ({ page }) => {
  await mockApi(page, {
    'GET /users': [{ id: 7, email: 'busy@glow.com', full_name: 'Busy', role: 'she_team', site_id: null, is_active: true }],
    'PUT /users/7': async (route) => { await wait(1500); return route.fulfill(json(200, {})); },
  });
  await signIn(page, { role: 'admin' });
  await page.locator('#app-sidebar').getByRole('link', { name: 'Users', exact: true }).click();
  await page.locator('tr', { hasText: 'busy@glow.com' }).locator('button').first().click();
  await page.getByRole('button', { name: 'Update User' }).click();
  await expect(page.locator('.activity-bar')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Saving...' })).toBeVisible();
  await expect(page.locator('.activity-bar')).toHaveCount(0, { timeout: 5000 });
});

test('quick requests do not flash the bar', async ({ page }) => {
  await mockApi(page, {});
  await signIn(page, { role: 'admin' });
  await page.locator('#app-sidebar').getByRole('link', { name: 'Incidents', exact: true }).click();
  await page.waitForTimeout(1000);
  await expect(page.locator('.activity-bar')).toHaveCount(0);
});
