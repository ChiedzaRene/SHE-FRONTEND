const { test, expect } = require('@playwright/test');
const { mockApi, signIn } = require('./helpers');

// The browser's clock is controlled so 30 minutes take no time. Default limit: 30 minutes, warning in the last minute.
test.beforeEach(async ({ page }) => {
  await page.clock.install();
  await mockApi(page, { 'GET /incidents/summary': { total: 0, open: 0, by_type: [], by_site: [] } });
  await signIn(page, { role: 'admin' });
  await expect(page.getByText('Overall SHE Dashboard')).toBeVisible();
});

const warning = (page) => page.getByRole('alertdialog', { name: 'Are you still there?' });

test('after 29 minutes without activity a warning appears; "Stay signed in" keeps the person in', async ({ page }) => {
  await page.clock.fastForward('29:05');
  await expect(warning(page)).toBeVisible();
  await expect(warning(page)).toContainText(/signed out in \d+ seconds/);

  await page.getByRole('button', { name: 'Stay signed in' }).click();
  await expect(warning(page)).toHaveCount(0);
  await expect(page).toHaveURL(/\/admin$/);

  // the countdown starts again from the click
  await page.clock.fastForward('28:00');
  await expect(warning(page)).toHaveCount(0);
  await page.clock.fastForward('01:10');
  await expect(warning(page)).toBeVisible();
});

test('with no response the person is signed out and told why', async ({ page }) => {
  await page.clock.fastForward('29:05');
  await expect(warning(page)).toBeVisible();
  await page.clock.fastForward('01:00');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText('You were signed out after 30 minutes without activity. Please sign in again.')).toBeVisible();

  // and the pages behind the sign-in can't be reached any more
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login$/);
});

test('someone working normally is not signed out', async ({ page }) => {
  for (let i = 0; i < 3; i += 1) {
    await page.clock.fastForward('20:00');
    await page.mouse.move(200 + i * 10, 300);
    await page.mouse.move(260 + i * 10, 320);
  }
  await page.clock.fastForward('20:00'); // 80 minutes in total, never 30 without activity
  await expect(warning(page)).toHaveCount(0);
  await expect(page).toHaveURL(/\/admin$/);
});

test('reopening the app after the browser was closed for over 30 minutes means signing in again', async ({ page, context }) => {
  const later = await context.newPage();
  await page.close(); // browser closed: nothing of the app is running
  await context.clock.setSystemTime(Date.now() + 45 * 60 * 1000);
  await later.goto('/admin');
  await expect(later).toHaveURL(/\/login$/);
  await expect(later.getByText('You were signed out after 30 minutes without activity. Please sign in again.')).toBeVisible();
});

test('reopening within 30 minutes carries on where the person left off', async ({ page, context }) => {
  const later = await context.newPage();
  await page.close();
  await context.clock.setSystemTime(Date.now() + 10 * 60 * 1000);
  await later.goto('/admin');
  await expect(later.getByText('Overall SHE Dashboard')).toBeVisible();
});

test('signing out in one tab signs out the other open tabs too', async ({ page, context }) => {
  const other = await context.newPage();
  await other.goto('/incidents');
  await expect(other.getByRole('heading', { name: 'Incidents Register' })).toBeVisible();

  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(other).toHaveURL(/\/login$/);
  await expect(other.getByText('You were signed out in another tab. Please sign in again.')).toBeVisible();
});
