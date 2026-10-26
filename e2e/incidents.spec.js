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

test("the site's report gives the description and then the evidence, with no causes yet", async ({ page }) => {
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
  await expect(form.getByLabel(/^Cause/)).toHaveCount(0);            // the investigation finds the causes
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
  await form.getByLabel('Evidence notes').fill('Photos of the forecourt');
  await form.getByLabel(/Evidence files/).setInputFiles({ name: 'pump3.png', mimeType: 'image/png', buffer: Buffer.from('png') });
  await form.getByRole('button', { name: 'Add cost' }).click();
  await form.getByLabel('Cost item 1').fill('Absorbent and clean-up');
  await form.getByLabel('Damage payer 1').fill('Transporter');
  await form.getByLabel('Cost in USD 1').fill('250.50');
  await form.getByRole('button', { name: 'Add cost' }).click();
  await form.getByLabel('Cost in USD 2').fill('100');
  await expect(form.getByText('Total cost: $350.50')).toBeVisible();
  await form.getByRole('button', { name: 'Log Incident' }).click();

  await expect.poll(() => uploads.length).toBe(1);
  expect(uploads[0]).toMatch(/^multipart\/form-data/);
  expect(created.injured_person).toBe('Farai Moyo');
  expect(created.description).toBe('Diesel overflowed during a tanker delivery at pump 3');
  expect(created.incident_intake).toEqual({
    reporter_name: 'Tendai Chikore', department: 'Retail', employee_or_contractor: 'contractor', years_of_service: '3',
    location: 'Pump 3 forecourt', categories: ['oil_fuel_spillage', 'other'], other_category: 'Tanker overfill',
    injury_outcome: 'first_aid', environmental_impact: 'within_site', evidence: 'Photos of the forecourt',
    cost_items: [
      { description: 'Absorbent and clean-up', damage_payer: 'Transporter', cost_usd: 250.5 },
      { description: '', damage_payer: '', cost_usd: 100 },
    ],
  });
  await expect(form).toHaveCount(0);
});

// An incident whose record changes as the (simulated) server accepts each step
async function investigation(page, start, extra = {}) {
  const state = { current: incident(start), sent: [] };
  await mockApi(page, {
    'GET /sites': SITES,
    'GET /incidents': (route) => route.fulfill(json(200, [state.current])),
    'PUT /incidents/7': (route, req) => {
      const body = req.postDataJSON();
      state.sent.push(body);
      state.current = { ...state.current, incident_workflow: { ...state.current.incident_workflow, ...body.incident_workflow } };
      return route.fulfill(json(200, state.current));
    },
    'GET /incidents/investigators': [
      { id: 51, name: 'Rudo Officer', role: 'she_officer', job_title: 'SHE Officer' },
      { id: 52, name: 'Peter Two', role: 'site_manager', job_title: 'Site manager', site_id: 2 },
    ],
    ...extra,
  });
  return state;
}

const openRecord = async (page) => {
  await page.goto('/incidents');
  await page.getByRole('row', { name: /INC-7/ }).getByRole('button', { name: 'Details' }).click();
  const record = page.getByRole('dialog', { name: 'Incident INC-7' });
  await record.getByRole('tab', { name: 'Investigation' }).click();
  return record;
};

test('a SHE officer picks the investigation team from the people with accounts', async ({ page }) => {
  const state = await investigation(page, { incident_workflow: { status: 'reported' } });
  await signIn(page, { role: 'she_officer', user_id: 50 });
  await expect(page).toHaveURL(/\/she-dashboard$/);
  await expect(page.locator('#app-sidebar').getByRole('link', { name: 'Sites' })).toBeVisible();
  const record = await openRecord(page);
  await expect(record.getByRole('region', { name: 'Investigation and causes' })).toContainText('Opens once the SHE team assigns');
  await record.getByLabel('Team member 1', { exact: true }).selectOption({ label: 'Rudo Officer (SHE Officer)' });
  await expect(record.getByLabel('Team member 1 job title')).toHaveValue('SHE Officer');
  await record.getByRole('button', { name: 'Add team member' }).click();
  await record.getByLabel('Team member 2', { exact: true }).selectOption({ label: 'Peter Two (Site manager)' });
  await record.getByLabel('Team member 2 job title').fill('Depot manager');
  await record.getByRole('button', { name: 'Assign investigation team' }).click();
  await expect(record.getByRole('status')).toHaveText(/Investigation team assigned/);
  const sent = state.sent[0].incident_workflow;
  expect(sent.status).toBe('assigned');
  expect(sent.team_members.map((m) => [m.user_id, m.job_title])).toEqual([[51, 'SHE Officer'], [52, 'Depot manager']]);
  await expect(record.locator('.inc-stepper li[aria-current="step"]')).toContainText('Team assigned');
  await expect(record.getByRole('button', { name: 'Start investigation' })).toBeVisible();
});

test('a team member from another site logs the evidence and causes, and nothing else', async ({ page }) => {
  const state = await investigation(page, {
    incident_workflow: { status: 'investigating', team_members: [{ user_id: 52, name: 'Peter Two', job_title: 'Depot manager' }] },
  });
  await signIn(page, { role: 'site_manager', site_id: 1, user_id: 52 });
  const record = await openRecord(page);
  await expect(record.getByText('You are on the investigation team')).toBeVisible();
  await expect(record.getByRole('cell', { name: 'Peter Two' })).toBeVisible();          // the team, read only
  await expect(record.getByRole('button', { name: 'Assign investigation team' })).toHaveCount(0);
  await record.getByLabel('Investigation evidence and findings').fill('Statements from two attendants');
  await record.getByLabel('Suggestions for cause 1').selectOption('Failure to follow procedure');
  await record.getByLabel('Cause 2', { exact: true }).fill('Tanker driver left the hose');
  await record.getByLabel('Root cause suggestions').selectOption('Inadequate training');
  await record.getByRole('button', { name: 'Record the causes' }).click();
  await expect(record.getByRole('status')).toHaveText(/Causes recorded/);
  expect(state.sent[0]).toEqual({ incident_workflow: {
    evidence: 'Statements from two attendants', causes: ['Failure to follow procedure', 'Tanker driver left the hose'],
    root_cause: 'Inadequate training', status: 'causes_recorded' } });
  // corrective actions are for the SHE team
  await expect(record.getByRole('region', { name: 'Corrective actions' })).toContainText('No corrective actions assigned yet');
  await expect(record.getByRole('button', { name: 'Assign a corrective action' })).toHaveCount(0);
});

test('the SHE team assigns corrective actions with the hierarchy of control; the description stays fixed', async ({ page }) => {
  let posted = null;
  const ca = { id: 30, incident_id: 7, site_id: 2, action_taken: 'Fit an overfill alarm on pump 3', assigned_to: 'Peter Two',
    control: 'redesign', due_date: '2026-11-15T21:59:00Z', status: 'open', is_successful: null };
  const state = await investigation(page, {
    incident_workflow: { status: 'causes_recorded', causes: ['Failure to follow procedure'], root_cause: 'Inadequate training' },
  }, {
    'GET /corrective-actions/incident/7': (route) => route.fulfill(json(200, posted ? [ca] : [])),
    'POST /corrective-actions': (route, req) => { posted = req.postDataJSON(); return route.fulfill(json(200, ca)); },
  });
  await signIn(page, { role: 'she_team' });
  const record = await openRecord(page);
  await expect(record.getByRole('button', { name: 'Corrective actions all assigned' })).toBeDisabled();
  await record.getByRole('button', { name: 'Assign a corrective action' }).click();
  await expect(record.getByText('Corrective action for INC-7')).toBeVisible();
  await expect(record.locator('.ca-fixed')).toHaveText('Diesel spilt at pump 3 during delivery');
  await expect(record.getByLabel('Action plan (what will be done)')).toHaveValue('');   // only the plan goes here
  await record.getByLabel('Assigned Personnel').fill('Peter Two');
  await record.getByLabel('Deadline').fill('2026-11-15');
  await record.getByLabel('Hierarchy of control').selectOption('redesign');
  await record.getByLabel('Action plan (what will be done)').fill('Fit an overfill alarm on pump 3');
  await record.getByRole('button', { name: 'Assign Action' }).click();
  await expect(record.getByRole('table', { name: 'Corrective actions' })).toContainText('Redesign');
  expect(posted).toMatchObject({ incident_id: 7, site_id: 2, control: 'redesign', action_taken: 'Fit an overfill alarm on pump 3',
    assigned_to: 'Peter Two' });
  await record.getByRole('button', { name: 'Corrective actions all assigned' }).click();
  await expect(record.getByRole('status')).toHaveText(/Actions assigned/);
  expect(state.sent[0]).toEqual({ incident_workflow: { status: 'actions_assigned' } });
  await expect(record.getByRole('button', { name: 'Close the investigation' })).toBeVisible();
});

test('closing logs the lessons learnt, the report type and the SHE Officer comment', async ({ page }) => {
  const state = await investigation(page, { incident_workflow: { status: 'actions_assigned' } });
  await signIn(page, { role: 'she_officer' });
  const record = await openRecord(page);
  await record.getByLabel('Lessons learnt').fill('Deliveries are watched from start to finish');
  await record.getByLabel('Preliminary investigation report').check();
  await record.getByLabel('Preliminary investigation report date').fill('2026-10-21');
  await record.getByLabel('Full investigation report').check();
  await record.getByLabel('Full investigation report date').fill('2026-10-30');
  await record.getByLabel('This is a revised version of a previous report').check();
  await record.getByLabel("SHE Officer's comment").fill('Closed after the alarm was fitted');
  await record.getByRole('button', { name: 'Close the investigation' }).click();
  await expect(record.getByRole('status')).toHaveText(/Investigation closed/);
  expect(state.sent[0].incident_workflow).toEqual({
    lessons_learned: 'Deliveries are watched from start to finish', report_revised: true, report_type: 'full_investigation',
    report_dates: { preliminary_investigation: '2026-10-21', full_investigation: '2026-10-30' },
    she_comment: 'Closed after the alarm was fitted', status: 'closed',
  });
  await expect(record.locator('.inc-stepper li[aria-current="step"]')).toContainText('Closed');
});

test("the server's reason is shown when a step can't be taken yet", async ({ page }) => {
  await investigation(page, { incident_workflow: { status: 'investigating' } }, {
    'PUT /incidents/7': (route) => route.fulfill(json(422, { detail: 'Evidence, one to three causes and the root cause are required' })),
  });
  await signIn(page, { role: 'admin' });
  const record = await openRecord(page);
  await record.getByRole('button', { name: 'Record the causes' }).click();
  await expect(record.getByRole('alert')).toContainText('the root cause are required');
});

test('the Operations Manager comments on a fatal incident and changes nothing else', async ({ page }) => {
  const state = await investigation(page, {
    severity: 'fatal', incident_intake: { categories: ['fatality'] }, incident_workflow: { status: 'actions_assigned' },
  });
  await signIn(page, { role: 'operations' });
  const record = await openRecord(page);
  await expect(record.getByLabel('Lessons learnt')).toBeDisabled();
  await expect(record.getByRole('button', { name: 'Close the investigation' })).toHaveCount(0);
  await record.getByLabel("Operations Manager's comments (fatal incidents)").fill('Reviewed with the board');
  await record.getByRole('button', { name: 'Save comment' }).click();
  await expect.poll(() => state.sent[0]).toEqual({ incident_workflow: { operations_manager_comment: 'Reviewed with the board' } });
});
