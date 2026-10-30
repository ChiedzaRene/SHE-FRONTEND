const { test, expect } = require('@playwright/test');
const { mockApi, signIn } = require('./helpers');

const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString();
const action = (id, created, over = {}) => ({
  id, site_id: 1, action_taken: `Action ${id}`, designation: `Action ${id}`, assigned_to: 'Clean Co', status: 'open', is_successful: false,
  due_date: new Date(Date.now() + 10 * 864e5).toISOString(), created_at: created, ...over,
});

test('corrective actions filter by when they were recorded, and new ones are flagged', async ({ page }) => {
  await mockApi(page, {
    'GET /sites': [{ id: 1, name: 'Msasa Depot' }],
    'GET /corrective-actions': [action(1, daysAgo(1)), action(2, daysAgo(5)), action(3, daysAgo(20)), action(4, daysAgo(60))],
  });
  await signIn(page, { role: 'she_team' });
  await page.goto('/corrective-actions');
  const rows = page.locator('tbody tr');
  await expect(rows).toHaveCount(4);
  // the one recorded yesterday is flagged NEW, and the count invites a look
  await expect(rows.filter({ hasText: 'Action 1' })).toContainText('NEW');
  await expect(rows.filter({ hasText: 'Action 3' })).not.toContainText('NEW');
  await expect(rows.filter({ hasText: 'Action 1' })).toContainText('Recorded');

  const when = page.getByLabel('Recorded');
  await when.selectOption({ label: 'Last 3 days' });
  await expect(rows).toHaveCount(1);
  await when.selectOption({ label: 'Last week' });
  await expect(rows).toHaveCount(2);
  await when.selectOption({ label: 'Last month' });
  await expect(rows).toHaveCount(3);
  await when.selectOption({ label: 'Any time' });
  await expect(rows).toHaveCount(4);

  await page.getByRole('button', { name: '1 new in the last 3 days' }).click();
  await expect(rows).toHaveCount(1);
  await expect(when).toHaveValue('3');
});

test('a regional manager has the dashboard, reports and their region\'s pages, and can be sent SHE files', async ({ page }) => {
  await mockApi(page, {
    'GET /licences': { types: [], regions: ['Harare East'], counts: { valid: 0, due_3_months: 0, due_1_month: 0, expired: 0, missing: 0 },
      sites: [], due: [], can_edit: false },
    'GET /safety-talks/overview': { period: 'month', regions: ['Harare East'], this_week: { open: false, pending: [] },
      totals: { due: 0, done: 0, missed: 0, rate: null, sites: 0, attendees: 0 }, sites: [], missed: [], talks: [] },
    'GET /reports/performance': { kind: 'performance', title: 'Monthly SHE Performance Report', subtitle: 'All sites',
      generated_at: '2026-10-21', kpis: [], tables: [], notes: [] },
    'GET /she-files': [{ id: 1, title: 'Regional briefing', description: null, filename: 'briefing.pdf', content_type: 'application/pdf',
      size: 1000, view_only: false, audience: ['regional_manager'], site_id: null, site_name: null, uploaded_by: 4,
      uploaded_by_name: 'Rudo Chikore', created_at: daysAgo(0), can_view: true, can_download: true, can_delete: false }],
  });
  await signIn(page, { role: 'regional_manager', region: 'Harare East' });
  const nav = page.locator('#app-sidebar');
  for (const [link, heading] of [['Dashboard', /Dashboard/], ['Incidents', 'Incidents Register'], ['Legal', 'Licences'],
    ['SHE Talks & Training', 'SHE Talks & Training'], ['SHE Files', 'SHE Files'], ['Reports', /Reports/]]) {
    await nav.getByRole('link', { name: link, exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: heading }).first()).toBeVisible();
  }
  await nav.getByRole('link', { name: 'SHE Files' }).click();
  await expect(page.getByText('Regional briefing')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Share a file' })).toHaveCount(0);   // they receive, they don't share
  await nav.getByRole('link', { name: 'SHE Talks & Training' }).click();
  await page.getByRole('tab', { name: 'SHE trainings' }).click();
  await expect(page.getByRole('button', { name: 'Record a training' })).toHaveCount(0);
});
