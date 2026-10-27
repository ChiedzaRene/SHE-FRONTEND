const { test, expect } = require('@playwright/test');
const { json, mockApi, signIn } = require('./helpers');

const SITES = [{ id: 1, name: 'Msasa Depot' }, { id: 2, name: 'Borrowdale Service Station' }];
const incident = (over) => ({
  id: 7, site_id: 2, type: 'spill', severity: 'medium', description: 'Diesel spilt at pump 3 during delivery',
  injured_person: null, lost_time_days: 0, resolved: false, action_plan: null, date_time: '2026-10-19T09:00:00Z', ...over,
});

test('the register shows the affected site; the record shows the fixed, formatted description and no action plan', async ({ page }) => {
  await mockApi(page, {
    'GET /sites': SITES,
    'GET /incidents': [incident({ description_html: '<p><b>Diesel spilt</b> at pump 3 during delivery</p>' })],
  });
  await signIn(page, { role: 'she_team' });
  await page.goto('/incidents');
  await expect(page.getByRole('row', { name: /^ID Site Type Severity/ })).toBeVisible();
  const row = page.getByRole('row', { name: /INC-7/ });
  await expect(row).toContainText('Borrowdale Service Station');

  await row.getByRole('button', { name: 'Details' }).click();
  await expect(page.getByText('Site: Borrowdale Service Station')).toBeVisible();
  await expect(page.getByText('(fixed once logged)')).toBeVisible();
  await expect(page.locator('.inc-description b')).toHaveText('Diesel spilt');   // formatting kept
  // the description is shown, not edited; the plan comes with the corrective actions
  await expect(page.getByRole('textbox', { name: /description/i })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: /action plan/i })).toHaveCount(0);
  await expect(page.getByText(/action plan/i)).toHaveCount(0);
});

test('a director sees every site but gets no buttons to change records', async ({ page }) => {
  await mockApi(page, {
    'GET /sites': SITES,
    'GET /incidents': [incident()],
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
  await expect(page.getByText('Diesel spilt at pump 3 during delivery')).toBeVisible();
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

test("the site's report: who reported, the person involved, the description, the causes and the evidence", async ({ page }) => {
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
  await expect(form.getByLabel(/Action plan/)).toHaveCount(0);       // the plan comes with the corrective actions
  // the description comes after who reported it and the person involved, as on the paper form
  const order = await form.locator('label').evaluateAll((ls) => ls.map((l) => l.textContent.trim()));
  const at = (text) => order.findIndex((t) => (text instanceof RegExp ? text.test(t) : t.startsWith(text)));
  expect(at('Name of reporter')).toBeLessThan(at(/^Name of (injured person|person involved)/));
  expect(at('Years of service')).toBeLessThan(at('Description'));
  expect(at('Description')).toBeLessThan(at('Incident Type'));
  expect(at('Description')).toBeLessThan(at('Cause 1'));
  await form.getByLabel('Incident Type').selectOption({ label: 'Spill' });
  const description = form.getByRole('textbox', { name: 'Description', exact: true });
  await expect(form.getByRole('toolbar', { name: 'Formatting for Description' })).toBeVisible();
  await description.click();
  await page.keyboard.press('Control+b');
  await page.keyboard.type('Diesel overflowed');
  await page.keyboard.press('Control+b');
  await page.keyboard.type(' during a tanker delivery at pump 3');
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
  await form.getByLabel('Cause 1', { exact: true }).fill('Delivery not watched');
  await form.getByLabel('Cause 2', { exact: true }).fill('Hose left in the tank');
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
  expect(created.description).toMatch(/^<b>Diesel overflowed<\/b>( |&nbsp;)during a tanker delivery at pump 3$/);
  expect(created.incident_intake).toEqual({
    reporter_name: 'Tendai Chikore', department: 'Retail', employee_or_contractor: 'contractor', years_of_service: '3',
    location: 'Pump 3 forecourt', categories: ['oil_fuel_spillage', 'other'], other_category: 'Tanker overfill',
    injury_outcome: 'first_aid', environmental_impact: 'within_site', evidence: 'Photos of the forecourt',
    site_causes: ['Delivery not watched', 'Hose left in the tank'],
    cost_items: [
      { description: 'Absorbent and clean-up', damage_payer: 'Transporter', cost_usd: 250.5 },
      { description: '', damage_payer: '', cost_usd: 100 },
    ],
  });
  expect(created.action_plan).toBeUndefined();
  await expect(form).toHaveCount(0);
  await expect(page.getByText('Incident logged and sent to the SHE team')).toBeVisible();
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
  await expect(record.getByRole('region', { name: 'Investigation findings' })).toContainText('Opens once the SHE team assigns');
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

test('the findings box opens only when the investigation starts, for the team only, and is fixed once sent', async ({ page }) => {
  const state = await investigation(page, {
    incident_workflow: { status: 'assigned', team_members: [{ user_id: 52, name: 'Peter Two', job_title: 'Depot manager' }] },
  });
  await signIn(page, { role: 'site_manager', site_id: 1, user_id: 52 });
  const record = await openRecord(page);
  await expect(record.getByText('You are on the investigation team')).toBeVisible();
  await expect(record.getByRole('cell', { name: 'Peter Two' })).toBeVisible();          // the team, read only
  await expect(record.getByRole('button', { name: 'Assign investigation team' })).toHaveCount(0);
  const findings = record.getByRole('textbox', { name: 'Investigation findings' });
  await expect(findings).toHaveCount(0);                                                 // locked until started
  await expect(record.getByText('Opens for the investigation team once the investigation is started')).toBeVisible();
  await record.getByRole('button', { name: 'Start investigation' }).click();
  await expect(record.getByRole('status')).toHaveText(/Investigation started/);
  expect(state.sent[0]).toEqual({ incident_workflow: { status: 'investigating' } });

  await expect(record.getByRole('toolbar', { name: 'Formatting for Investigation findings' })).toBeVisible();
  await findings.click();
  await record.getByRole('button', { name: 'Bulleted list' }).click();
  await page.keyboard.type('Two statements taken');
  await record.getByRole('button', { name: 'Send findings to the SHE team' }).click();
  await expect(record.getByRole('status')).toHaveText(/Findings sent to the SHE team/);
  expect(state.sent[1].incident_workflow.status).toBe('findings_recorded');
  expect(state.sent[1].incident_workflow.evidence).toMatch(/^<ul><li>Two statements taken(<br>)?<\/li><\/ul>$/);
  // sent: the findings are fixed, and the root cause is for the SHE team
  await expect(findings).toHaveCount(0);
  await expect(record.locator('.inc-locked li')).toHaveText('Two statements taken');
  await expect(record.getByRole('textbox', { name: 'Root cause', exact: true })).toBeDisabled();
});

test('the SHE team, when not on the investigation team, cannot write the findings', async ({ page }) => {
  await investigation(page, { incident_workflow: { status: 'investigating', team_members: [{ user_id: 52, name: 'Peter Two' }] } });
  await signIn(page, { role: 'she_team', user_id: 4 });
  const record = await openRecord(page);
  await expect(record.getByRole('textbox', { name: 'Investigation findings' })).toHaveCount(0);
  await expect(record.getByText('Only the investigation team writes the findings.')).toBeVisible();
  await expect(record.getByRole('button', { name: 'Send findings to the SHE team' })).toHaveCount(0);
});

test('the SHE team records the root cause once the findings are in; the causes stay the site\'s', async ({ page }) => {
  const state = await investigation(page, {
    incident_intake: { site_causes: ['Delivery not watched', 'Hose left in the tank'] },
    incident_workflow: { status: 'findings_recorded', evidence: '<p><b>Two</b> statements taken</p>' },
  });
  await signIn(page, { role: 'she_officer' });
  const record = await openRecord(page);
  await expect(record.getByRole('region', { name: 'Corrective actions' })).toContainText('Opens once the SHE team records the root cause');
  await expect(record.locator('.inc-locked b')).toHaveText('Two');                 // the team's findings, fixed
  const causes = record.locator('.inc-causes li');
  await expect(causes).toHaveText(['Delivery not watched', 'Hose left in the tank']);
  await expect(record.getByLabel(/^Cause 1/)).toHaveCount(0);                       // not editable here
  await record.getByLabel('Root cause suggestions').selectOption('Inadequate training');
  await record.getByRole('button', { name: 'Record the root cause' }).click();
  await expect(record.getByRole('status')).toHaveText(/Root cause recorded/);
  expect(state.sent[0]).toEqual({ incident_workflow: { root_cause: 'Inadequate training', status: 'root_cause_recorded' } });
  await expect(record.getByRole('button', { name: 'Assign a corrective action' })).toBeVisible();
});

test('the SHE team assigns corrective actions with the hierarchy of control; the description stays fixed', async ({ page }) => {
  let posted = null;
  const ca = { id: 30, incident_id: 7, site_id: 2, action_taken: 'Fit an overfill alarm on pump 3', assigned_to: 'Peter Two',
    control: 'redesign', due_date: '2026-11-15T21:59:00Z', status: 'open', is_successful: null };
  const state = await investigation(page, {
    incident_workflow: { status: 'root_cause_recorded', causes: ['Failure to follow procedure'], root_cause: 'Inadequate training' },
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
  // closing waits for the corrective actions to be closed
  await expect(record.getByText('1 corrective action is still open')).toBeVisible();
  await expect(record.getByRole('region', { name: 'Closing the investigation' })).toContainText('Opens once every corrective action is closed');
  await expect(record.getByRole('button', { name: 'Close the investigation' })).toHaveCount(0);
});

test('once the corrective actions are closed, SHE log the lessons learnt, report type and comment', async ({ page }) => {
  const state = await investigation(page, { incident_workflow: { status: 'actions_assigned' } }, {
    'GET /corrective-actions/incident/7': [{ id: 30, incident_id: 7, action_taken: 'Fit an overfill alarm', control: 'redesign',
      assigned_to: 'Peter Two', status: 'resolved', is_successful: 'yes' }],
  });
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
  await investigation(page, { incident_workflow: { status: 'findings_recorded', evidence: 'Statements' } }, {
    'PUT /incidents/7': (route) => route.fulfill(json(409, { detail: 'The root cause is recorded after the investigation team sends its findings' })),
  });
  await signIn(page, { role: 'admin' });
  const record = await openRecord(page);
  await record.getByRole('textbox', { name: 'Root cause', exact: true }).fill('Inadequate training');
  await record.getByRole('button', { name: 'Record the root cause' }).click();
  await expect(record.getByRole('alert')).toContainText('after the investigation team sends its findings');
});

test('the Operations Manager comments on a fatal incident and changes nothing else', async ({ page }) => {
  const state = await investigation(page, {
    severity: 'fatal', incident_intake: { categories: ['fatality'] }, incident_workflow: { status: 'actions_assigned' },
  }, {
    'GET /corrective-actions/incident/7': [{ id: 30, incident_id: 7, action_taken: 'Fit an overfill alarm', control: 'redesign',
      assigned_to: 'Peter Two', status: 'resolved', is_successful: 'yes' }],
  });
  await signIn(page, { role: 'operations' });
  const record = await openRecord(page);
  await expect(record.getByLabel('Lessons learnt')).toBeDisabled();
  await expect(record.getByRole('button', { name: 'Close the investigation' })).toHaveCount(0);
  await record.getByLabel(/^Operations Manager's comments/).fill('Reviewed with the board');
  await record.getByRole('button', { name: 'Save comment' }).click();
  await expect.poll(() => state.sent[0]).toEqual({ incident_workflow: { operations_manager_comment: 'Reviewed with the board' } });
});

test("a description that is too short is caught before sending, and the server's reason is shown", async ({ page }) => {
  let posts = 0;
  await mockApi(page, {
    'GET /sites/1': SITES[0],
    'GET /sites': SITES,
    'POST /incidents': (route) => {
      posts += 1;
      return route.fulfill(json(422, { detail: [{ type: 'value_error', loc: ['body', 'occurred_at'], msg: 'Value error, occurred_at cannot be in the future' }] }));
    },
  });
  await signIn(page, { role: 'site_manager', site_id: 1 });
  await page.getByRole('button', { name: 'Log Incident' }).click();
  const form = page.locator('.modal');
  await expect(form.getByLabel('Site', { exact: true })).toHaveValue('Msasa Depot');
  const description = form.getByRole('textbox', { name: 'Description', exact: true });
  await description.fill('Fell');
  await form.getByRole('button', { name: 'Log Incident' }).click();
  await expect(form.getByText('Describe what happened in at least 5 characters.')).toBeVisible();
  expect(posts).toBe(0);
  await description.fill('Fell from the loading ramp');
  await form.getByRole('button', { name: 'Log Incident' }).click();
  await expect(form.getByText("The incident wasn't logged. Occurred at occurred_at cannot be in the future")).toBeVisible();
});
