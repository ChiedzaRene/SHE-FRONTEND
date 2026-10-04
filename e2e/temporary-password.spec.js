const { test, expect } = require('@playwright/test');
const { mockApi, signIn } = require('./helpers');

test('with a temporary password only Settings is usable and the rest of the menu looks disabled', async ({ page }) => {
  await signIn(page, { role: 'admin', mcp: true });
  await mockApi(page, { 'GET /users/me': { id: 1, email: 'tester@glow.com', full_name: 'Tester', role: 'admin', must_change_password: true } });
  await page.goto('/incidents');
  await expect(page).toHaveURL(/\/settings$/); // everything else redirects here

  const disabled = page.locator('.nav-link-disabled');
  await expect(disabled.first()).toBeVisible();
  expect(await disabled.count()).toBeGreaterThan(3);
  await expect(page.locator('a.nav-link', { hasText: 'Incidents' })).toHaveCount(0); // not a link any more
  await expect(page.locator('a.nav-link', { hasText: 'Settings' })).toBeVisible();

  await disabled.first().click({ force: true });
  await expect(page).toHaveURL(/\/settings$/);
});

test('a normal user has a fully working menu', async ({ page }) => {
  await signIn(page, { role: 'admin' });
  await mockApi(page, {});
  await page.goto('/incidents');
  await expect(page.locator('.nav-link-disabled')).toHaveCount(0);
  await expect(page.locator('a.nav-link', { hasText: 'Reports' })).toBeVisible();
});
