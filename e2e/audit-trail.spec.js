const { test, expect } = require('@playwright/test');
const { json, mockApi, signIn } = require('./helpers');

const entry = (over = {}) => ({
  id: 1, user_email: 'she@glowpetroleum.com', user_role: 'she_team', action: 'UPDATE_CORRECTIVE_ACTION',
  resource: 'corrective_actions', resource_id: 12, details: null, ip_address: '10.0.0.4',
  timestamp: '2026-11-10T08:15:00Z', changes: null, ...over,
});

test('admins open the Audit Trail from the menu and see exactly what changed in each entry', async ({ page }) => {
  await mockApi(page, {
    'GET /audit-logs/facets': { actions: ['UPDATE_CORRECTIVE_ACTION', 'RECORD_CREATED'], resources: ['corrective_actions'],
      users: [], action_labels: { UPDATE_CORRECTIVE_ACTION: 'Corrective action updated', RECORD_CREATED: 'Record added' },
      resource_labels: { corrective_actions: 'Corrective actions', fire_inspection_files: 'Fire inspection files' } },
    'GET /audit-logs': (route) => route.fulfill(json(200, [
      entry({
        details: 'status: open → closed; site: 1 → 2',
        changes: [{ op: 'RECORD_UPDATED', table: 'corrective_actions', table_label: 'Corrective actions', id: 12, fields: {
          status: { old: 'open', new: 'closed' },
          site_id: { old: 1, new: 2, ref: 'sites', old_label: 'Westend Centre', new_label: 'Stopover Centre' },
          due_date: { old: null, new: '2026-11-20' },
        } }],
      }),
      entry({ id: 2, action: 'RECORD_CREATED', resource: 'fire_inspection_files', resource_id: 5, details: 'added fire inspection files #5',
        changes: [{ op: 'RECORD_CREATED', table: 'fire_inspection_files', table_label: 'Fire inspection files', id: 5,
          fields: { filename: { old: null, new: 'tags.png' } } }] }),
    ], { 'x-total-count': '2' })),
  });
  await signIn(page, { role: 'admin' });
  await page.locator('#app-sidebar').getByRole('link', { name: 'Audit Trail' }).click();
  await expect(page.getByRole('heading', { name: 'Audit Trail' })).toBeVisible();

  const row = page.getByRole('row', { name: /Corrective action updated/ });
  await expect(row).toContainText('she@glowpetroleum.com');
  await expect(row).toContainText('10.0.0.4');
  await row.getByRole('button', { name: 'Show what changed' }).click();
  const changes = page.locator('.audit-change-table').first();
  await expect(changes.getByRole('row', { name: /Status/ })).toContainText('open');
  await expect(changes.getByRole('row', { name: /Status/ })).toContainText('closed');
  // a site is shown by name, not just its number
  await expect(changes.getByRole('row', { name: /Site/ })).toContainText('Westend Centre (#1)');
  await expect(changes.getByRole('row', { name: /Site/ })).toContainText('Stopover Centre (#2)');
  await expect(changes.getByRole('row', { name: /Due date/ })).toContainText('2026-11-20');
  await row.getByRole('button', { name: 'Hide changes' }).click();
  await expect(page.locator('.audit-change-table')).toHaveCount(0);
});

test('the audit trail is only in the menu for admins, and has left Settings', async ({ page }) => {
  await mockApi(page, {});
  await signIn(page, { role: 'she_team' });
  await expect(page.locator('#app-sidebar').getByRole('link', { name: 'Audit Trail' })).toHaveCount(0);
  await page.goto('/settings');
  await expect(page.getByRole('tab', { name: 'Audit log' })).toHaveCount(0);
});
