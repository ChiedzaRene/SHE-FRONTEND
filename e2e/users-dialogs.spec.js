const { test, expect } = require('@playwright/test');
const { json, mockApi, signIn } = require('./helpers');

const users = [
  { id: 1, email: 'tester@glow.com', full_name: 'Tester', role: 'admin', site_id: null, is_active: true },
  { id: 7, email: 'busy@glow.com', full_name: 'Busy Person', role: 'she_team', site_id: null, is_active: true },
];

test('deleting a user with records offers to deactivate, using in-app dialogs (no browser pop-ups)', async ({ page }) => {
  let nativeDialogs = 0;
  page.on('dialog', async (d) => { nativeDialogs += 1; await d.dismiss(); });

  const updates = [];
  await signIn(page, { role: 'admin' });
  const calls = await mockApi(page, {
    'GET /users': users,
    'DELETE /users/7': (route) => route.fulfill(json(409, { detail: "busy@glow.com can't be deleted because they have recorded 3 incidents. Deactivate the account instead." })),
    'PUT /users/7': (route, req) => { updates.push(req.postDataJSON()); return route.fulfill(json(200, { ...users[1], is_active: false })); },
  });
  await page.goto('/users');

  await page.getByRole('button', { name: 'Delete busy@glow.com' }).click();
  await expect(page.getByRole('alertdialog')).toContainText('Delete this user?');
  await page.getByRole('button', { name: 'Delete user' }).click();

  await expect(page.getByRole('alertdialog')).toContainText("can't be deleted");
  await expect(page.getByRole('alertdialog')).toContainText('3 incidents');
  await page.getByRole('button', { name: 'Deactivate account' }).click();

  await expect(page.getByText(/Account deactivated/)).toBeVisible();
  expect(updates).toEqual([{ is_active: false }]);
  expect(calls).toContain('DELETE /users/7');
  expect(nativeDialogs).toBe(0);
});

test('cancelling the delete dialog does nothing', async ({ page }) => {
  await signIn(page, { role: 'admin' });
  const calls = await mockApi(page, { 'GET /users': users });
  await page.goto('/users');
  await page.getByRole('button', { name: 'Delete busy@glow.com' }).click();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  expect(calls.filter((c) => c.startsWith('DELETE'))).toHaveLength(0);
});

test('resetting a password closes the box and confirms it', async ({ page }) => {
  await signIn(page, { role: 'admin' });
  const sent = [];
  await mockApi(page, {
    'GET /users': users,
    'PUT /users/7': (route, req) => { sent.push(req.postDataJSON()); return route.fulfill(json(200, { ...users[1], must_change_password: true })); },
  });
  await page.goto('/users');
  await page.locator('tr', { hasText: 'busy@glow.com' }).locator('button').first().click();
  await page.locator('input[name=password]').fill('Brand-new-9');
  await page.getByRole('button', { name: 'Update User' }).click();
  await expect(page.locator('.modal')).toHaveCount(0);
  await expect(page.getByText(/Password reset for busy@glow.com/)).toBeVisible();
  expect(sent[0].password).toBe('Brand-new-9');
});

test('a reset the server refuses keeps the box open and shows why inside it', async ({ page }) => {
  await signIn(page, { role: 'admin' });
  await mockApi(page, {
    'GET /users': users,
    'PUT /users/7': (route) => route.fulfill(json(403, { detail: 'Only a super admin can modify super admins' })),
  });
  await page.goto('/users');
  await page.locator('tr', { hasText: 'busy@glow.com' }).locator('button').first().click();
  await page.locator('input[name=password]').fill('Brand-new-9');
  await page.getByRole('button', { name: 'Update User' }).click();
  await expect(page.locator('.modal [role=alert]')).toHaveText('Only a super admin can modify super admins');
  await expect(page.locator('.modal')).toHaveCount(1);
});
