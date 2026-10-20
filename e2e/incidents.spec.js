const { test, expect } = require('@playwright/test');
const { json, mockApi, signIn } = require('./helpers');

const SITES = [{ id: 1, name: 'Msasa Depot' }, { id: 2, name: 'Borrowdale Service Station' }];
const incident = (over) => ({
  id: 7, site_id: 2, type: 'spill', severity: 'medium', description: 'Diesel spilt at pump 3 during delivery',
  injured_person: null, lost_time_days: 0, resolved: false, action_plan: null, date_time: '2026-10-19T09:00:00Z', ...over,
});

test('the register shows the affected site, and the action plan is saved apart from the fixed description', async ({ page }) => {
  let sent = null;
  await mockApi(page, {
    'GET /sites': SITES,
    'GET /incidents': [incident()],
    'PUT /incidents/7': (route, req) => {
      sent = req.postDataJSON();
      return route.fulfill(json(200, incident({ action_plan: sent.action_plan })));
    },
  });
  await signIn(page, { role: 'she_team' });
  await page.goto('/incidents');
  await expect(page.getByRole('row', { name: /^ID Site Type Severity/ })).toBeVisible();
  const row = page.getByRole('row', { name: /INC-7/ });
  await expect(row).toContainText('Borrowdale Service Station');

  await row.getByRole('button', { name: 'Details' }).click();
  await expect(page.getByText('Site: Borrowdale Service Station')).toBeVisible();
  await expect(page.getByText('(fixed once logged)')).toBeVisible();
  // the description is shown as text, not as something to edit
  await expect(page.getByRole('textbox', { name: /description/i })).toHaveCount(0);

  const save = page.getByRole('button', { name: 'Save action plan' });
  await expect(save).toBeDisabled();
  await page.getByRole('textbox', { name: 'Action plan' }).fill('Absorbent laid; refresher on delivery procedure by Friday');
  await save.click();
  await expect.poll(() => sent).toEqual({ action_plan: 'Absorbent laid; refresher on delivery procedure by Friday' });
  await expect(page.getByText('Action plan saved')).toBeVisible();
  await expect(save).toBeDisabled();
});

test('a director sees every site but gets no buttons to change records', async ({ page }) => {
  await mockApi(page, {
    'GET /sites': SITES,
    'GET /incidents': [incident({ action_plan: 'Absorbent laid' })],
  });
  await signIn(page, { role: 'director' });
  await expect(page).toHaveURL(/\/she-dashboard$/);
  const nav = page.locator('#app-sidebar');
  for (const name of ['Incidents', 'Sites', 'Inspections', 'Legal', 'Hours Worked']) {
    await expect(nav.getByRole('link', { name })).toBeVisible();
  }
  await expect(nav.getByRole('link', { name: 'Users' })).toHaveCount(0);

  await nav.getByRole('link', { name: 'Incidents' }).click();
  await page.getByRole('row', { name: /INC-7/ }).getByRole('button', { name: 'Details' }).click();
  await expect(page.getByText('Absorbent laid')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Action plan' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Take Action' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Close' }).click();

  await nav.getByRole('link', { name: 'Sites' }).click();
  await expect(page.getByRole('heading', { name: 'Sites Management' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Add New Site/ })).toHaveCount(0);

  await nav.getByRole('link', { name: 'Corrective Actions' }).click();
  await expect(page.getByRole('button', { name: /Log Action/ })).toHaveCount(0);
});

test('a corrective action takes the deadline that is chosen, not a fixed 30 days', async ({ page }) => {
  let sent = null;
  await mockApi(page, {
    'GET /sites': SITES,
    'POST /corrective-actions': (route, req) => {
      sent = req.postDataJSON();
      return route.fulfill(json(200, { id: 1, ...sent }));
    },
  });
  await signIn(page, { role: 'she_team' });
  await page.goto('/corrective-actions');
  await page.getByRole('button', { name: /Log Action/ }).click();
  const due = page.getByLabel('Deadline');
  await expect(due).toBeEditable();
  await expect(due).toHaveValue('');
  await page.getByLabel('Location / Site').selectOption({ label: 'Msasa Depot' });
  await page.getByLabel('Assigned Personnel').fill('Clean Co');
  await page.getByLabel('Action Plan / Description').fill('Replace the cracked bund wall');
  await due.fill('2027-01-15');
  await page.getByRole('button', { name: 'Assign Action' }).click();
  await expect.poll(() => sent?.site_id).toBeTruthy();
  const chosen = new Date(sent.due_date);
  expect([chosen.getFullYear(), chosen.getMonth() + 1, chosen.getDate()]).toEqual([2027, 1, 15]);
});
