const { test, expect } = require('@playwright/test');
const { mockApi, signIn } = require('./helpers');

const inbox = {
  unread: 2,
  items: [
    { id: 2, kind: 'audit_recorded', title: 'New audit at Msasa Depot: Fire safety', message: 'Rudo Chikore recorded a score of 82%',
      link: '/audits', resource: 'audits', resource_id: 7, created_at: new Date().toISOString(), read_at: null },
    { id: 1, kind: 'password_reset', title: 'Your password was reset by an administrator', message: 'Grace Admin set a temporary password for you.',
      link: '/settings', resource: 'users', resource_id: 3, created_at: new Date(Date.now() - 3 * 3600e3).toISOString(), read_at: null },
  ],
};

test('on a phone the bell sits in the top bar, shows the unread count, and its list fits the screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  const reads = [];
  await mockApi(page, {
    'GET /notifications': inbox,
    'GET /incidents/summary': { total: 0, open: 0, by_type: [], by_site: [] },
    'POST /notifications/read': (route, req) => { reads.push(req.postDataJSON()); return route.fulfill({ status: 200, contentType: 'application/json', body: '{"marked":1}', headers: { 'access-control-allow-origin': '*' } }); },
  });
  await signIn(page, { role: 'admin' });

  const bell = page.locator('.mobile-topbar').getByRole('button', { name: 'Notifications, 2 unread' });
  await expect(bell).toBeVisible();
  await bell.click();
  const panel = page.getByRole('dialog', { name: 'Notifications' });
  await expect(panel).toContainText('New audit at Msasa Depot: Fire safety');
  await expect(panel).toContainText('3 hours ago');
  const box = await panel.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);

  // an account notification is marked read when opened and goes to Settings
  await panel.getByRole('button', { name: /Your password was reset/ }).click();
  await expect(page).toHaveURL(/\/settings$/);
  expect(reads).toContainEqual({ ids: [1] });
});

test('with nothing new the bell has no count and says so', async ({ page }) => {
  await mockApi(page, {
    'GET /notifications': { unread: 0, items: [] },
    'GET /incidents/summary': { total: 0, open: 0, by_type: [], by_site: [] },
  });
  await signIn(page, { role: 'admin' });
  await page.locator('#app-sidebar').getByRole('button', { name: 'Notifications' }).click();
  await expect(page.getByRole('dialog', { name: 'Notifications' })).toContainText("You're all caught up.");
});
