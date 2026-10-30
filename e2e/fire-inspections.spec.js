const { test, expect } = require('@playwright/test');
const { json, mockApi, signIn } = require('./helpers');

// a short version of the fortnightly checklist (GP-SHE/OPR/10/02)
const checklist = {
  kinds: { fortnightly: 'Fortnightly fire equipment inspection', service_refill: 'Fire extinguisher service and refill' },
  results: ['C', 'NC', 'NA'],
  sections: [
    { section: 'Fire extinguishers', groups: [
      { group: 'Pressure indicator', items: [
        { key: 'fe_gauge', text: 'Pressure gauge is present and in good condition' },
        { key: 'fe_pointer', text: 'Pointer is on the green mark' }] },
    ] },
    { section: 'Sand buckets', groups: [{ group: 'Sand buckets', items: [{ key: 'sb_dry', text: 'Sand is dry' }] }] },
  ],
};
const listing = (over = {}) => ({ regions: ['Harare'], schedule: [], inspections: [], ...over });
const PDF = Buffer.from('%PDF-1.4\n%%EOF');

test('a site manager sends the fortnightly fire equipment checklist', async ({ page }) => {
  let sent = null;
  await mockApi(page, {
    'GET /fire-inspections/checklist': checklist,
    'GET /fire-inspections': listing({ schedule: [{ site_id: 1, site_name: 'Msasa Depot', region: 'Harare',
      fortnightly: { id: 1, last: '2026-10-01', next_due: '2026-10-15', days_left: -15, overdue: true }, service_refill: null }] }),
    'POST /fire-inspections': (route, req) => { sent = req.postDataBuffer().toString('latin1'); return route.fulfill(json(201, { id: 9 })); },
  });
  await signIn(page, { role: 'site_manager', site_id: 1 });
  await page.goto('/inspections');
  // sites land on their own fire equipment checks
  await expect(page.getByRole('tab', { name: 'Site fire equipment' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('region', { name: 'Fire equipment due dates' }).getByRole('row', { name: /Msasa Depot/ })).toContainText('Overdue');

  await page.getByRole('button', { name: 'New fire equipment inspection' }).click();
  const form = page.getByRole('form', { name: 'New fire equipment inspection' });
  await expect(form.getByLabel('Site')).toHaveCount(0);                    // always their own site
  await form.getByLabel('Inspection date').fill('2026-10-20');
  await expect(form.getByLabel('Next due')).toHaveValue('2026-11-03');      // two weeks on
  await form.getByLabel("Inspector's name").fill('Tendai Moyo');
  await form.getByRole('button', { name: 'Send to the SHE team' }).click();
  await expect(form.getByRole('alert')).toContainText('Answer every item');

  await form.getByLabel('Not conforming: Pointer is on the green mark').check({ force: true });
  await form.getByLabel('What is wrong: Pointer is on the green mark').fill('Pointer in the red');
  await form.getByRole('button', { name: 'Mark the rest conforming' }).click();
  await expect(form).toContainText('3 of 3 answered · 1 not conforming');
  await form.getByRole('button', { name: 'Send to the SHE team' }).click();
  await expect.poll(() => sent).toContain('name="kind"\r\n\r\nfortnightly');
  expect(sent).toContain('name="next_due"\r\n\r\n2026-11-03');
  expect(sent).not.toContain('name="site_id"');
  const answers = JSON.parse(sent.match(/name="answers"\r\n\r\n(.*)\r\n/)[1]);
  expect(answers).toEqual({ fe_pointer: { result: 'NC', comment: 'Pointer in the red' }, fe_gauge: { result: 'C' }, sb_dry: { result: 'C' } });
});

test('the six-monthly service and refill needs proof, and the next date is six months on', async ({ page }) => {
  let sent = null;
  await mockApi(page, {
    'GET /fire-inspections/checklist': checklist,
    'GET /fire-inspections': listing(),
    'GET /sites': [{ id: 1, name: 'Msasa Depot', region: 'Harare' }, { id: 2, name: 'Bulawayo Depot', region: 'Bulawayo' }],
    'POST /fire-inspections': (route, req) => { sent = req.postDataBuffer().toString('latin1'); return route.fulfill(json(201, { id: 10 })); },
  });
  await signIn(page, { role: 'she_team' });
  await page.goto('/inspections?tab=fire');
  await page.getByRole('button', { name: 'New fire equipment inspection' }).click();
  const form = page.getByRole('form', { name: 'New fire equipment inspection' });
  await form.getByRole('radio', { name: 'Six-monthly service and refill' }).click();
  await form.getByLabel('Site').selectOption({ label: 'Msasa Depot' });
  await form.getByLabel('Service date').fill('2026-08-31');
  await expect(form.getByLabel('Next due')).toHaveValue('2027-02-28');      // six months on (end of February)
  await form.getByLabel("Inspector's name").fill('Tendai Moyo');
  await form.getByLabel('Service company').fill('Fire Masters (Pvt) Ltd');
  await form.getByLabel('Extinguishers serviced').fill('6');
  await form.getByRole('button', { name: 'Send to the SHE team' }).click();
  await expect(form.getByRole('alert')).toContainText('proof of the service and refill');
  await form.getByLabel(/Evidence \(required\)/).setInputFiles({ name: 'certificate.pdf', mimeType: 'application/pdf', buffer: PDF });
  await form.getByRole('button', { name: 'Send to the SHE team' }).click();
  await expect.poll(() => sent).toContain('name="kind"\r\n\r\nservice_refill');
  for (const part of ['name="site_id"\r\n\r\n1', 'name="next_due"\r\n\r\n2027-02-28', 'name="contractor"\r\n\r\nFire Masters (Pvt) Ltd',
    'name="extinguishers"\r\n\r\n6', 'filename="certificate.pdf"']) expect(sent).toContain(part);
  expect(sent).not.toContain('name="answers"');
});

test('the SHE team records audit findings, by its own team or an audit team', async ({ page }) => {
  let created = null;
  await mockApi(page, {
    'GET /site-inspections': (route, req) => route.fulfill(json(200, { regions: [], inspections: new URL(req.url()).searchParams.get('kind') === 'audit'
      ? [{ id: 7, number: 16, kind: 'audit', audit_body: 'Bureau Veritas', site_id: 1, site_name: 'Msasa Depot', inspection_date: '2026-10-02',
        inspectors: 'J. Ncube', status: 'submitted', nc_counts: { total: 0, closed: 0, draft: 0, overdue: 0 } }] : [] })),
    'GET /sites': [{ id: 1, name: 'Msasa Depot' }],
    'POST /site-inspections': (route, req) => { created = req.postDataJSON(); return route.fulfill(json(201, { id: 8 })); },
  });
  await signIn(page, { role: 'she_team' });
  await page.goto('/inspections?tab=audit');
  await expect(page.getByRole('region', { name: 'Audit reports' }).getByRole('row', { name: /Report No. 16/ })).toContainText('Bureau Veritas');
  await page.getByRole('button', { name: 'New audit report' }).click();
  const form = page.getByRole('form', { name: 'New inspection' });
  await expect(form.getByRole('radio', { name: 'Audit findings' })).toHaveAttribute('aria-checked', 'true');
  await form.getByLabel('Audited by').fill('Bureau Veritas audit team');
  await form.getByLabel('Site audited').selectOption({ label: 'Msasa Depot' });
  await form.getByLabel('Auditors').fill('J. Ncube');
  await form.getByRole('button', { name: 'Start report' }).click();
  await expect.poll(() => created).toMatchObject({ kind: 'audit', audit_body: 'Bureau Veritas audit team', site_id: 1, inspectors: 'J. Ncube' });
});
