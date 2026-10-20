const { test, expect } = require('@playwright/test');
const { json, mockApi, signIn } = require('./helpers');

const TYPES = [
  ['council_shop', 'Council shop licence', 'City Council'], ['fire_brigade', 'Fire brigade licence', 'Fire Brigade'],
  ['ema_septic', 'EMA septic tank waste discharge licence', 'EMA'], ['ema_air', 'EMA air emission licence', 'EMA'],
  ['hazardous_substances', 'Hazardous substance storage and sale licence', 'EMA'], ['council_trade_effluent', 'Council trade effluent licence', 'City Council'],
];
const lic = (over) => ({ id: 1, site_id: 1, licence_type: 'fire_brigade', name: 'Fire brigade licence', issuer: 'Fire Brigade',
  licence_number: 'FB-001', issue_date: '2025-11-10', expiry_date: '2026-11-09', days_left: 20, status: 'due_1_month', amount: 150,
  notes: null, document_name: null, document_viewable: false, current: true, recorded_by_name: 'Rudo Chikore', ...over });
const register = (overCells = {}) => ({
  types: TYPES.map(([key, name, issuer]) => ({ key, name, issuer })), regions: ['Harare'],
  counts: { valid: 0, due_3_months: 0, due_1_month: 1, expired: 0, missing: 5 },
  sites: [{ site_id: 1, name: 'Msasa Depot', region: 'Harare', licences: TYPES.map(([key, name, issuer]) => ({
    licence_type: key, name, issuer, current: null, status: 'missing', history: [], ...(overCells[key] || {}) })) }],
  due: overCells.fire_brigade ? [{ ...overCells.fire_brigade.current, site_name: 'Msasa Depot' }] : [], can_edit: true,
});

test('the Legal page lists each site against the six licences, with what is due soon', async ({ page }) => {
  await mockApi(page, { 'GET /licences': register({ fire_brigade: { current: lic(), status: 'due_1_month' } }) });
  await signIn(page, { role: 'she_team' });
  await page.locator('#app-sidebar').getByRole('link', { name: 'Legal' }).click();
  await expect(page.getByRole('tab', { name: 'Licences' })).toHaveAttribute('aria-selected', 'true');
  const grid = page.getByRole('region', { name: 'Licence register' });
  for (const [, name] of TYPES) await expect(grid.getByRole('columnheader', { name })).toBeVisible();
  await expect(grid.getByRole('button', { name: /^Fire brigade licence at Msasa Depot: Due within a month/ })).toBeVisible();
  await expect(grid.getByRole('button', { name: 'EMA air emission licence at Msasa Depot: Not recorded' })).toBeVisible();
  const due = page.getByRole('region', { name: 'Licences due' });
  await expect(due).toContainText('Fire brigade licence · Msasa Depot');
  await expect(due).toContainText('reminded 3 months and 1 month before');
  // the scorecard is still there
  await page.getByRole('tab', { name: 'Legal compliance scorecard' }).click();
  await expect(page.getByRole('heading', { name: 'Legal Compliance' })).toBeVisible();
});

test('recording a licence with its dates, number, fee and certificate', async ({ page }) => {
  let sent = null;
  await mockApi(page, {
    'GET /licences': register(),
    'POST /licences': (route, req) => { sent = req.postDataBuffer().toString('latin1'); return route.fulfill(json(201, lic({ licence_type: 'ema_air' }))); },
  });
  await signIn(page, { role: 'she_team' });
  await page.goto('/legal');
  await page.getByRole('button', { name: 'EMA air emission licence at Msasa Depot: Not recorded' }).click();
  const dialog = page.getByRole('dialog', { name: 'EMA air emission licence at Msasa Depot' });
  await expect(dialog).toContainText("hasn't been recorded");
  const form = dialog.getByRole('form', { name: 'Record the licence' });
  await form.getByLabel('Expiry / payment due date').fill('2027-03-31');
  await form.getByLabel('Issue date').fill('2026-04-01');
  await form.getByLabel('Licence number').fill('EMA-AIR-77');
  await form.getByLabel('Fee paid').fill('320.50');
  await form.getByLabel(/Licence certificate/).setInputFiles({ name: 'ema-air.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') });
  await form.getByRole('button', { name: 'Save licence' }).click();
  await expect(page.getByText('EMA air emission licence recorded')).toBeVisible();
  for (const part of ['name="licence_type"\r\n\r\nema_air', 'name="expiry_date"\r\n\r\n2027-03-31', 'name="issue_date"\r\n\r\n2026-04-01',
    'name="licence_number"\r\n\r\nEMA-AIR-77', 'name="amount"\r\n\r\n320.50', 'name="site_id"\r\n\r\n1', 'filename="ema-air.pdf"']) expect(sent).toContain(part);
});

test('a renewal shows the current licence and keeps the earlier ones', async ({ page }) => {
  await mockApi(page, { 'GET /licences': register({ fire_brigade: { current: lic({ id: 2, licence_number: 'FB-002', expiry_date: '2027-11-09', days_left: 385, status: 'valid' }),
    status: 'valid', history: [lic({ current: false, expiry_date: '2026-11-09' })] } }) });
  await signIn(page, { role: 'site_manager', site_id: 1 });
  await page.goto('/legal');
  await page.getByRole('button', { name: /^Fire brigade licence at Msasa Depot: Valid/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Fire brigade licence at Msasa Depot' });
  await expect(dialog).toContainText('FB-002');
  await expect(dialog.getByRole('form', { name: 'Record the renewal' })).toBeVisible();
  await expect(dialog.locator('.lic-history')).toContainText('FB-001');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});
