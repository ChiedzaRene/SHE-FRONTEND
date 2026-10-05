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
  await expect(panel.locator('time').first()).toHaveText(/^Today, \d{1,2}:\d{2}/);   // exact time of each notification
  const box = await panel.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);

  // an account notification is marked read when opened and goes to Settings
  await panel.getByRole('button', { name: /^Your password was reset/ }).click();
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


test('notifications can be marked unread again (all or one), opened ones say when they will be removed', async ({ page }) => {
  const calls = [];
  const fulfil = (route, req) => { calls.push([new URL(req.url()).pathname, req.postDataJSON()]); return route.fulfill({ status: 200, contentType: 'application/json', body: '{"marked":1}', headers: { 'access-control-allow-origin': '*' } }); };
  const now = Date.now();
  await mockApi(page, {
    'GET /notifications': {
      unread: 1,
      items: [
        { id: 5, kind: 'incident_recorded', title: 'New spill at Msasa Depot', message: 'Tendai Moyo recorded a low incident',
          link: '/incidents', resource: 'incidents', resource_id: 9, created_at: new Date(now - 60e3).toISOString(), read_at: null },
        { id: 4, kind: 'audit_recorded', title: 'New audit at Borrowdale: Housekeeping', message: 'Score 90%',
          link: '/audits', resource: 'audits', resource_id: 3, created_at: new Date(now - 5 * 3600e3).toISOString(),
          read_at: new Date(now - 2 * 3600e3).toISOString() },
      ],
    },
    'GET /incidents/summary': { total: 0, open: 0, by_type: [], by_site: [] },
    'POST /notifications/read': fulfil,
    'POST /notifications/unread': fulfil,
  });
  await signIn(page, { role: 'admin' });
  await page.locator('#app-sidebar').getByRole('button', { name: 'Notifications, 1 unread' }).click();
  const panel = page.getByRole('dialog', { name: 'Notifications' });

  await expect(panel.locator('li').nth(1)).toContainText('opened, removed in 22 h');   // opened 2 hours ago
  await expect(panel).toContainText('Opened notifications are removed after 24 hours.');

  await panel.getByRole('button', { name: 'Mark all as unread' }).click();
  await panel.getByRole('button', { name: 'Mark "New audit at Borrowdale: Housekeeping" as unread' }).click();
  await panel.getByRole('button', { name: 'Mark "New spill at Msasa Depot" as read' }).click();
  await panel.getByRole('button', { name: 'Mark all as read' }).click();
  expect(calls).toEqual([
    ['/notifications/unread', { all: true }],
    ['/notifications/unread', { ids: [4] }],
    ['/notifications/read', { ids: [5] }],
    ['/notifications/read', { all: true }],
  ]);
});
