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

test("the site fills in Glow's incident report form and attaches evidence when logging", async ({ page }) => {
  let created = null;
  const uploads = [];
  await mockApi(page, {
    'GET /sites/1': SITES[0],
    'GET /sites': SITES,
    'POST /incidents': (route, req) => {
      created = req.postDataJSON();
      return route.fulfill(json(200, incident({ id: 9, site_id: 1, ...created })));
    },
    'POST /incidents/9/files': (route, req) => {
      uploads.push(req.headers()['content-type']);
      return route.fulfill(json(201, incident({ id: 9 })));
    },
  });
  await signIn(page, { role: 'site_manager', site_id: 1 });
  await page.getByRole('button', { name: 'Log Incident' }).click();
  const form = page.locator('.modal');
  await expect(form.getByLabel('Site', { exact: true })).toHaveValue('Msasa Depot');
  await form.getByLabel('Incident Type').selectOption({ label: 'Spill' });
  await form.getByLabel('Description').fill('Diesel overflowed during a tanker delivery at pump 3');
  await form.getByLabel('Name of person involved').fill('Farai Moyo');
  await form.getByLabel('Name of reporter').fill('Tendai Chikore');
  await form.getByLabel('Department').fill('Retail');
  await form.getByLabel('Employee or contractor').selectOption('contractor');
  await form.getByLabel('Years of service').fill('3');
  await form.getByLabel('Location of incident').fill('Pump 3 forecourt');
  await form.getByLabel('Oil/fuel spillages').check();
  await form.getByLabel('Other', { exact: true }).check();
  await form.getByLabel('Other category').fill('Tanker overfill');
  await form.getByLabel('First aid case').check();
  await form.getByLabel('Impact within site boundaries').check();
  await form.getByLabel('Cause 1').fill('Delivery not watched');
  await form.getByRole('button', { name: 'Add cost' }).click();
  await form.getByLabel('Cost item 1').fill('Absorbent and clean-up');
  await form.getByLabel('Damage payer 1').fill('Transporter');
  await form.getByLabel('Cost in USD 1').fill('250.50');
  await form.getByRole('button', { name: 'Add cost' }).click();
  await form.getByLabel('Cost in USD 2').fill('100');
  await expect(form.getByText('Total cost: $350.50')).toBeVisible();
  await form.getByLabel(/Evidence files/).setInputFiles({ name: 'pump3.png', mimeType: 'image/png', buffer: Buffer.from('png') });
  await form.getByRole('button', { name: 'Log Incident' }).click();

  await expect.poll(() => uploads.length).toBe(1);
  expect(uploads[0]).toMatch(/^multipart\/form-data/);
  expect(created.injured_person).toBe('Farai Moyo');
  expect(created.incident_intake).toEqual({
    reporter_name: 'Tendai Chikore', department: 'Retail', employee_or_contractor: 'contractor', years_of_service: '3',
    location: 'Pump 3 forecourt', categories: ['oil_fuel_spillage', 'other'], other_category: 'Tanker overfill',
    injury_outcome: 'first_aid', environmental_impact: 'within_site', site_causes: ['Delivery not watched'],
    cost_items: [
      { description: 'Absorbent and clean-up', damage_payer: 'Transporter', cost_usd: 250.5 },
      { description: '', damage_payer: '', cost_usd: 100 },
    ],
  });
  await expect(form).toHaveCount(0);
});

test('the SHE team records the investigation and moves it through the stages', async ({ page }) => {
  let current = incident({
    incident_intake: { reporter_name: 'Tendai Chikore', site_causes: ['Delivery not watched'], evidence: 'Photos of pump 3' },
    incident_workflow: { status: 'reported' },
    files: [{ id: 4, filename: 'statement.pdf', content_type: 'application/pdf', size: 2048, viewable: true, uploaded_by: 3 }],
  });
  const sent = [];
  await mockApi(page, {
    'GET /sites': SITES,
    'GET /incidents': (route) => route.fulfill(json(200, [current])),
    'PUT /incidents/7': (route, req) => {
      const body = req.postDataJSON();
      sent.push(body);
      current = { ...current, incident_workflow: { ...current.incident_workflow, ...body.incident_workflow },
        incident_intake: { ...current.incident_intake, ...body.incident_intake } };
      return route.fulfill(json(200, current));
    },
    'GET /incidents/7/workflow-history': [
      { id: 1, user_email: 'she@glow.com', timestamp: '2026-10-20T08:00:00Z',
        details: JSON.stringify({ previous_stage: 'reported', new_stage: 'assigned' }) },
    ],
  });
  await signIn(page, { role: 'she_team' });
  await page.goto('/incidents');
  const row = page.getByRole('row', { name: /INC-7/ });
  await expect(row).toContainText('Reported');
  await row.getByRole('button', { name: 'Details' }).click();
  const record = page.getByRole('dialog', { name: 'Incident INC-7' });

  // what the site reported and its evidence
  await expect(record.getByText('Tendai Chikore')).toBeVisible();
  await expect(record.getByText('statement.pdf')).toBeVisible();
  await expect(record.getByRole('button', { name: 'Remove statement.pdf' })).toBeVisible();
  await expect(record.locator('.inc-stepper li[aria-current="step"]')).toContainText('Reported');

  await record.getByRole('tab', { name: 'Investigation' }).click();
  await expect(record.getByLabel('Cause 1', { exact: true })).toHaveValue('Delivery not watched');   // the site's view to start from
  await record.getByLabel('Team member 1 name').fill('Rudo Banda');
  await record.getByLabel('Team member 1 job title').fill('SHE Officer');
  await record.getByLabel('Team member 1 date').fill('2026-10-20');
  await record.getByRole('button', { name: 'Save and move to Team assigned' }).click();
  await expect(record.getByRole('status')).toHaveText(/Moved to Team assigned/);
  expect(sent[0].incident_workflow).toMatchObject({
    status: 'assigned', team_members: [{ name: 'Rudo Banda', job_title: 'SHE Officer', date: '2026-10-20' }],
  });
  await expect(record.locator('.inc-stepper li[aria-current="step"]')).toContainText('Team assigned');

  await record.getByLabel('Suggestions for cause 2').selectOption('Failure to follow procedure');
  await expect(record.getByLabel('Cause 2', { exact: true })).toHaveValue('Failure to follow procedure');
  await record.getByLabel('Root cause suggestions').selectOption('Inadequate training');
  await record.getByLabel('Corrective action 1').fill('Fit an overfill alarm on pump 3');
  await record.getByLabel('Control for action 1').selectOption('redesign');
  await record.getByLabel('Action 1 by whom').fill('Maintenance');
  await record.getByLabel('Action 1 by when').fill('2026-11-15');
  await record.getByLabel('Lessons learnt').fill('Deliveries are watched from start to finish');
  await record.getByLabel('Preliminary investigation report').check();
  await record.getByLabel('Full investigation report').check();
  await record.getByLabel('This is a revised version of a previous report').check();
  await record.getByRole('button', { name: 'Save investigation' }).click();
  await expect(record.getByRole('status')).toHaveText(/Investigation saved/);
  const saved = sent[1];
  expect(saved.incident_workflow.status).toBeUndefined();
  expect(saved.incident_workflow).toMatchObject({
    causes: ['Delivery not watched', 'Failure to follow procedure'], root_cause: 'Inadequate training',
    action_items: [{ action: 'Fit an overfill alarm on pump 3', control: 'redesign', by_whom: 'Maintenance', by_when: '2026-11-15' }],
    lessons_learned: 'Deliveries are watched from start to finish', report_type: 'full_investigation',
  });
  expect(Object.keys(saved.incident_intake.report.types)).toEqual(['preliminary_investigation', 'full_investigation']);
  expect(saved.incident_intake.report.revised).toBe(true);

  await record.getByRole('tab', { name: 'History' }).click();
  await expect(record.getByText('moved it from Reported to Team assigned')).toBeVisible();
});

test("the server's reason is shown when a stage can't be reached yet", async ({ page }) => {
  await mockApi(page, {
    'GET /sites': SITES,
    'GET /incidents': [incident({ incident_workflow: { status: 'investigating' } })],
    'PUT /incidents/7': (route) => route.fulfill(json(422, {
      detail: 'Evidence, up to three causes, root cause, corrective action and lessons learnt are required' })),
  });
  await signIn(page, { role: 'admin' });
  await page.goto('/incidents');
  await page.getByRole('row', { name: /INC-7/ }).getByRole('button', { name: 'Details' }).click();
  await page.getByRole('tab', { name: 'Investigation' }).click();
  await page.getByRole('button', { name: 'Save and move to Causes recorded' }).click();
  await expect(page.getByRole('alert')).toContainText('lessons learnt are required');
});

test('the Operations Manager comments on a fatal incident and changes nothing else', async ({ page }) => {
  let sent = null;
  const fatal = incident({ severity: 'fatal', incident_intake: { categories: ['fatality'] }, incident_workflow: { status: 'closed' } });
  await mockApi(page, {
    'GET /sites': SITES,
    'GET /incidents': [fatal],
    'PUT /incidents/7': (route, req) => {
      sent = req.postDataJSON();
      return route.fulfill(json(200, { ...fatal, incident_workflow: { ...fatal.incident_workflow, ...sent.incident_workflow } }));
    },
  });
  await signIn(page, { role: 'operations' });
  await page.goto('/incidents');
  await page.getByRole('row', { name: /INC-7/ }).getByRole('button', { name: 'Details' }).click();
  await page.getByRole('tab', { name: 'Investigation' }).click();
  await expect(page.getByLabel('Lessons learnt')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Save investigation' })).toHaveCount(0);
  await page.getByLabel("Operations Manager's comments (fatal incidents)").fill('Reviewed with the board');
  await page.getByRole('button', { name: 'Save comment' }).click();
  await expect.poll(() => sent).toEqual({ incident_workflow: { operations_manager_comment: 'Reviewed with the board' } });
});
