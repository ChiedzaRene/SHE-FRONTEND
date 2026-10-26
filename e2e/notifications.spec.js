const { test, expect } = require('@playwright/test');
const { json, mockApi, signIn } = require('./helpers');

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
    'GET /dashboard/summary': {},
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
    'GET /dashboard/summary': {},
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
    'GET /dashboard/summary': {},
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
  await expect.poll(() => calls.length).toBe(4);   // the last click's request may still be on its way
  expect(calls).toEqual([
    ['/notifications/unread', { all: true }],
    ['/notifications/unread', { ids: [4] }],
    ['/notifications/read', { ids: [5] }],
    ['/notifications/read', { all: true }],
  ]);
});

test('the newest notification pops up and stays; clicking it opens the list, and it does not pop up again', async ({ page }) => {
  let inboxNow = inbox;
  await mockApi(page, { 'GET /notifications': (route) => route.fulfill(json(200, inboxNow)), 'GET /dashboard/summary': {} });
  await signIn(page, { role: 'admin' });

  const popup = page.locator('.notif-popup');
  await expect(popup).toContainText('New audit at Msasa Depot: Fire safety');   // only the most recent one
  await expect(popup).not.toContainText('Your password was reset');
  await page.waitForTimeout(2500);
  await expect(popup).toBeVisible();                                            // it stays until dealt with

  await popup.getByRole('button', { name: /^New notification: New audit at Msasa Depot/ }).click();
  const panel = page.getByRole('dialog', { name: 'Notifications' });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('Your password was reset by an administrator');
  await expect(popup).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Overall SHE Dashboard' })).toBeVisible();
  await expect(page.locator('.notif-popup')).toHaveCount(0);

  // a newer one comes in: it pops up; closing it does not open the list
  inboxNow = { unread: 3, items: [
    { id: 3, kind: 'incident_recorded', title: 'New fire at Borrowdale', message: 'Recorded by Tendai Moyo', link: '/incidents',
      resource: 'incidents', resource_id: 11, created_at: new Date().toISOString(), read_at: null }, ...inbox.items] };
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.locator('.notif-popup')).toContainText('New fire at Borrowdale');
  await page.getByRole('button', { name: 'Dismiss notification' }).click();
  await expect(page.locator('.notif-popup')).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Notifications' })).toHaveCount(0);
});

test('a notification that has already been read does not pop up', async ({ page }) => {
  await mockApi(page, {
    'GET /notifications': { unread: 0, items: [{ ...inbox.items[0], read_at: new Date().toISOString() }] },
    'GET /dashboard/summary': {},
  });
  await signIn(page, { role: 'admin' });
  await expect(page.getByRole('heading', { name: 'Overall SHE Dashboard' })).toBeVisible();
  await page.waitForTimeout(1000);
  await expect(page.locator('.notif-popup')).toHaveCount(0);
});

test('on a phone the pop-up sits on screen but never over the open menu', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await mockApi(page, { 'GET /notifications': inbox, 'GET /dashboard/summary': {} });
  await signIn(page, { role: 'admin' });
  const popup = page.locator('.notif-popup');
  await expect(popup).toBeVisible();
  const box = await popup.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(popup).toBeHidden();
  await page.locator('#app-sidebar').getByRole('button', { name: 'Logout' }).click();
  await expect(page).toHaveURL(/\/login$/);
});
