// Inactivity sign-out against the real server. The browser clock is fast-forwarded so 30 minutes take no time.
const { test, expect } = require('@playwright/test');
const { ADMIN } = require('./settings');
const { signIn } = require('./ui');

test('after 30 minutes without activity the admin is warned, then signed out, and must sign in again', async ({ page }) => {
  await page.clock.install();
  await signIn(page, ADMIN.email, ADMIN.password);
  await expect(page.getByRole('heading', { name: 'Overall SHE Dashboard' })).toBeVisible();

  await page.clock.fastForward('29:05');
  await expect(page.getByRole('alertdialog', { name: 'Are you still there?' })).toBeVisible();
  await page.clock.fastForward('01:00');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText('You were signed out after 30 minutes without activity. Please sign in again.')).toBeVisible();
  await page.goto('/users');
  await expect(page).toHaveURL(/\/login$/);

  await signIn(page, ADMIN.email, ADMIN.password); // signing in again works as normal
  await expect(page.getByRole('heading', { name: 'Overall SHE Dashboard' })).toBeVisible();
});
