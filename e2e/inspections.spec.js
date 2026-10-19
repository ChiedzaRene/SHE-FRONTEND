const { test, expect } = require('@playwright/test');
const { json, mockApi, signIn } = require('./helpers');

const nc = (over = {}) => ({
  id: 11, inspection_id: 5, seq: 1, serial: '15/CBD/01', title: 'Oil separator', details: '<p>Found <b>nearly full</b></p>',
  reference: 'ZWS 970:2020 Clause 17(F)', status: 'raised', recommendation: null, assigned_to: null, assigned_to_name: null,
  due_date: null, overdue: false, acknowledged_by_name: null, acknowledged_at: null, corrective_action_id: null,
  completion_notes: null, completed_by_name: null, completed_at: null, reviewed_by_name: null, reviewed_at: null,
  review_outcome: null, review_comment: null, photos: [], can: { edit: false, acknowledge: false, complete: false, review: false }, ...over,
});
const report = (over = {}) => ({
  id: 5, number: 15, site_id: 1, site_name: 'CBD', site_code: 'CBD', region: 'Harare', inspection_date: '2026-10-17',
  inspectors: 'Rudo Chikore', status: 'submitted', created_by_name: 'Rudo Chikore', submitted_at: '2026-10-18T08:00:00Z',
  submitted_by_name: 'Rudo Chikore', closed_at: null, nc_counts: { total: 1, raised: 1, assigned: 0, completed: 0, closed: 0, draft: 0, overdue: 0 },
  introduction: '<p>The SHE Department conducted a <b>comprehensive</b> inspection.</p>', criteria: null,
  objectives: '<ul><li><i>Detect</i> hazards</li></ul>', findings_summary: '<p>Performing well.</p>', conformities: null,
  ncs: [nc()], previous_ncs: [], attachments: [], can: { edit: false, submit: false, delete: false }, ...over,
});

test('the SHE team writes the report with bold, italic and underline, and adds an NC', async ({ page }) => {
  let saved = null;
  let added = null;
  const draft = report({ status: 'draft', ncs: [], introduction: null, objectives: null, findings_summary: null, can: { edit: true, submit: true, delete: true } });
  await mockApi(page, {
    'GET /site-inspections/5': draft,
    'PUT /site-inspections/5': (route, req) => { saved = req.postDataJSON(); return route.fulfill(json(200, { ...draft, ...saved })); },
    'POST /site-inspections/5/ncs': (route, req) => {
      added = req.postDataJSON();
      return route.fulfill(json(201, { ...draft, ...saved, ncs: [nc({ status: 'draft', title: added.title, details: added.details, reference: added.reference, can: { edit: true } })] }));
    },
  });
  await signIn(page, { role: 'she_team' });
  await page.goto('/inspections/5');
  await expect(page.getByRole('heading', { name: /CBD site inspection report No. 15/i })).toBeVisible();

  const intro = page.getByRole('textbox', { name: 'Introduction' });
  await intro.click();
  await page.keyboard.type('The SHE Department conducted a ');
  await page.getByRole('toolbar', { name: 'Formatting for Introduction' }).getByRole('button', { name: 'Bold' }).click();
  await page.keyboard.type('comprehensive');
  await page.getByRole('toolbar', { name: 'Formatting for Introduction' }).getByRole('button', { name: 'Bold' }).click();
  await page.keyboard.type(' inspection, ');
  await page.keyboard.press('Control+i');
  await page.keyboard.type('safely');
  await page.keyboard.press('Control+i');
  await page.keyboard.press('Control+u');
  await page.keyboard.type(' and well');
  await page.getByRole('button', { name: 'Save report' }).click();
  await expect.poll(() => saved && saved.introduction).toMatch(/<b>comprehensive<\/b>/);
  expect(saved.introduction).toMatch(/<i>safely<\/i>/);
  expect(saved.introduction).toMatch(/<u>(\s|&nbsp;)*and well<\/u>/);

  await page.getByRole('button', { name: 'Add a non-conformity' }).click();
  const form = page.getByRole('form', { name: 'Add a non-conformity' });
  await form.getByLabel('Heading').fill('Oil separator');
  await form.getByRole('textbox', { name: 'Details of the NC' }).click();
  await page.keyboard.type('Found nearly full');
  await form.getByLabel('Requirement breached').fill('ZWS 970:2020 Clause 17(F)');
  await form.getByRole('button', { name: 'Add NC' }).click();
  await expect.poll(() => added && added.title).toBe('Oil separator');
  const card = page.getByRole('article', { name: 'NC 15/CBD/01' });
  await expect(card).toContainText('Requirement breached: ZWS 970:2020 Clause 17(F)');
  await expect(card.getByRole('button', { name: 'Add photo' })).toBeVisible();
});

test('the regional office acknowledges an NC: recommendation, who and by when', async ({ page }) => {
  let sent = null;
  await mockApi(page, {
    'GET /site-inspections/5': report({ ncs: [nc({ can: { acknowledge: true } })] }),
    'GET /site-inspections/5/assignees': [
      { id: 3, name: 'Tendai Moyo', role: 'site_manager', label: 'Site manager' },
      { id: 40, name: 'Grace Regional', role: 'regional_manager', label: 'Regional office' },
      { id: 4, name: 'Rudo Chikore', role: 'she_team', label: 'SHE office' },
    ],
    'POST /site-inspections/ncs/11/acknowledge': (route, req) => {
      sent = req.postDataJSON();
      return route.fulfill(json(200, report({ ncs: [nc({ status: 'assigned', recommendation: sent.recommendation, assigned_to: 3,
        assigned_to_name: 'Tendai Moyo', due_date: sent.due_date, acknowledged_by_name: 'Grace Regional', acknowledged_at: '2026-10-19T08:00:00Z' })] })));
    },
  });
  await signIn(page, { role: 'regional_manager', region: 'Harare' });
  await expect(page).toHaveURL(/\/inspections$/);                         // the regional office lands on Inspections
  await expect(page.locator('#app-sidebar').getByRole('link')).toHaveText(['Inspections', 'Corrective Actions', 'Settings']);
  await page.goto('/inspections/5');
  await expect(page.getByRole('region', { name: 'Introduction' }).locator('b')).toHaveText('comprehensive');
  const form = page.getByRole('form', { name: 'Acknowledge 15/CBD/01' });
  await form.getByRole('textbox', { name: /Recommended corrective action/ }).click();
  await page.keyboard.type('Drain and clean the oil separator');
  await form.getByLabel('By who').selectOption({ label: 'Tendai Moyo' });
  await expect(form.getByLabel('By who').locator('optgroup')).toHaveCount(3);
  await form.getByLabel('By when').fill('2026-11-02');
  await form.getByRole('button', { name: 'Acknowledge and assign' }).click();
  await expect.poll(() => sent).toEqual({ recommendation: 'Drain and clean the oil separator', assigned_to: 3, due_date: '2026-11-02' });
  const card = page.getByRole('article', { name: 'NC 15/CBD/01' });
  await expect(card).toContainText('Corrective action open');
  await expect(card).toContainText('Tendai Moyo');
});

test('the site completes the action, and the SHE team sees who reviewed it and when', async ({ page }) => {
  let done = null;
  await mockApi(page, {
    'GET /site-inspections/5': report({ ncs: [nc({ status: 'assigned', recommendation: '<p>Drain it</p>', assigned_to_name: 'Tendai Moyo',
      due_date: '2026-11-02', can: { complete: true } })] }),
    'POST /site-inspections/ncs/11/complete': (route, req) => {
      done = req.postDataBuffer().toString('latin1');
      return route.fulfill(json(200, report({ ncs: [nc({ status: 'closed', recommendation: '<p>Drain it</p>', assigned_to_name: 'Tendai Moyo',
        due_date: '2026-11-02', completion_notes: 'Drained by Clean Co', completed_by_name: 'Tendai Moyo', completed_at: '2026-10-20T08:00:00Z',
        reviewed_by_name: 'Rudo Chikore', reviewed_at: '2026-10-21T08:00:00Z', review_outcome: 'closed' })] })));
    },
  });
  await signIn(page, { role: 'site_manager', site_id: 1 });
  await page.goto('/inspections/5');
  const form = page.getByRole('form', { name: 'Complete 15/CBD/01' });
  await form.getByLabel('How was it closed?').fill('Drained by Clean Co');
  await form.getByRole('button', { name: 'Mark as completed' }).click();
  await expect.poll(() => done).toContain('Drained by Clean Co');
  const card = page.getByRole('article', { name: 'NC 15/CBD/01' });
  await expect(card).toContainText('Reviewed by: Rudo Chikore');
  await expect(card).toContainText(/Date of review: (Oct 21, 2026|21 Oct 2026)/);
  await expect(card).toContainText('NC status after review: Closed');
});

test('the site attaches photos and documents as proof of the corrective action; PDFs open in the app', async ({ page }) => {
  let sent = null;
  const { makePdf } = require('./pdf');
  const pdf = makePdf('Receipt');
  await mockApi(page, {
    'GET /site-inspections/5': report({
      attachments: [{ id: 70, kind: 'report', filename: 'signed-checklist.docx', content_type: 'application/msword', is_image: false, viewable: false }],
      ncs: [nc({ status: 'assigned', recommendation: '<p>Drain it</p>', assigned_to_name: 'Tendai Moyo', due_date: '2026-11-02', can: { complete: true } })],
    }),
    'POST /site-inspections/ncs/11/complete': (route, req) => {
      sent = req.postDataBuffer().toString('latin1');
      return route.fulfill(json(200, report({ ncs: [nc({ status: 'completed', recommendation: '<p>Drain it</p>', assigned_to_name: 'Tendai Moyo',
        completion_notes: 'Drained', completed_by_name: 'Tendai Moyo', completed_at: '2026-10-20T08:00:00Z',
        photos: [{ id: 81, kind: 'evidence', filename: 'receipt.pdf', content_type: 'application/pdf', is_image: false, viewable: true }] })] })));
    },
    'GET /site-inspections/photos/81': (route) => route.fulfill({ status: 200, contentType: 'application/pdf', body: pdf, headers: { 'access-control-allow-origin': '*' } }),
  });
  await signIn(page, { role: 'site_manager', site_id: 1 });
  await page.goto('/inspections/5');
  // a Word document is downloaded rather than opened
  const docs = page.getByRole('region', { name: 'Supporting documents' });
  await expect(docs.getByRole('button', { name: 'Download signed-checklist.docx' })).toBeVisible();
  await expect(docs.getByRole('button', { name: 'Open signed-checklist.docx' })).toHaveCount(0);

  const form = page.getByRole('form', { name: 'Complete 15/CBD/01' });
  await form.getByLabel('How was it closed?').fill('Drained');
  await form.getByLabel(/^Proof: photos or documents/).setInputFiles([
    { name: 'receipt.pdf', mimeType: 'application/pdf', buffer: pdf },
    { name: 'after.png', mimeType: 'image/png', buffer: Buffer.from('png') },
  ]);
  await expect(form).toContainText('receipt.pdf, after.png');
  await form.getByRole('button', { name: 'Mark as completed' }).click();
  await expect.poll(() => sent).toContain('filename="receipt.pdf"');
  expect(sent).toContain('filename="after.png"');
  expect(sent.match(/name="files"/g)).toHaveLength(2);

  const card = page.getByRole('article', { name: 'NC 15/CBD/01' });
  await expect(card).toContainText('Proof of the action');
  await card.getByRole('button', { name: 'Open receipt.pdf' }).click();
  await expect(page.getByRole('dialog', { name: 'receipt.pdf' }).getByRole('img', { name: 'Page 1 of 1' })).toBeVisible();
});
