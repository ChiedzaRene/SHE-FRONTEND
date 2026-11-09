const { test, expect } = require('@playwright/test');
const { mockApi, signIn } = require('./helpers');

test('admins see when each person was last active', async ({ page }) => {
  const ago = (minutes) => new Date(Date.now() - minutes * 60000).toISOString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(9, 30, 0, 0);
  const person = (id, email, last) => ({ id, email, full_name: email.split('@')[0], role: 'site_manager', site_id: 1,
    is_active: true, must_change_password: false, last_active_at: last });
  await mockApi(page, {
    'GET /sites': [{ id: 1, name: 'Westend Centre' }],
    'GET /users': [
      person(1, 'westend@glowpetroleum.com', ago(1)),
      person(2, 'northgate@glowpetroleum.com', ago(25)),
      person(3, 'cathedral@glowpetroleum.com', yesterday.toISOString()),
      person(4, 'stopover@glowpetroleum.com', null),
    ],
  });
  await signIn(page, { role: 'admin' });
  await page.goto('/users');
  await expect(page.locator('thead').getByText('Last active', { exact: true })).toBeVisible();
  const row = (email) => page.getByRole('row', { name: new RegExp(email) });
  await expect(row('westend@')).toContainText('Just now');
  await expect(row('northgate@')).toContainText('25 minutes ago');
  await expect(row('cathedral@')).toContainText(/Yesterday at/);
  await expect(row('stopover@')).toContainText('Never signed in');
  // the exact time shows when pointing at it
  await expect(row('cathedral@').locator('time')).toHaveAttribute('datetime', yesterday.toISOString());
});
