const { test, expect } = require('@playwright/test');
const { mockApi, signIn } = require('./helpers');

test.use({ viewport: { width: 390, height: 800 } });

test('on a phone the menu is hidden until the menu button is pressed, and closes after choosing a page', async ({ page }) => {
  await signIn(page, { role: 'admin' });
  await mockApi(page, {});
  await page.goto('/incidents');

  const sidebar = page.locator('#app-sidebar');
  await expect(sidebar).toBeHidden();
  // content gets the full phone width
  const width = await page.locator('.main-content').evaluate((el) => el.getBoundingClientRect().width);
  expect(width).toBeGreaterThan(380);

  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(sidebar).toBeVisible();
  await page.locator('a.nav-link', { hasText: 'Sites' }).click();
  await expect(page).toHaveURL(/\/sites$/);
  await expect(sidebar).toBeHidden();

  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.keyboard.press('Escape');
  await expect(sidebar).toBeHidden();
});
