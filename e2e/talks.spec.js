const { test, expect } = require('@playwright/test');
const { json, mockApi, signIn, dashboardSummary, siteRow } = require('./helpers');
const { makePdf } = require('./pdf');

const PDF = makePdf('Toolbox talk register');
const inTwoDays = () => new Date(Date.now() + 36 * 3600e3).toISOString();
const talk = (over = {}) => ({
  id: 7, site_id: 1, site_name: 'Msasa Depot', region: 'Harare', week_of: '2026-10-19', title: 'Safe refuelling',
  attendees: 14, notes: null, filename: 'register.pdf', content_type: 'application/pdf', size: PDF.length, can_view: true,
  submitted_by_name: 'Tendai Moyo', submitted_at: new Date().toISOString(), updated_at: null, ...over,
});
const current = (over = {}) => ({
  today: '2026-10-19', week_of: '2026-10-19', open: true, deadline: inTwoDays(), next_open: null, talk: null,
  cumulative: { due: 4, done: 3, rate: 75, missed_weeks: ['2026-10-05'] }, tracking_since: '2026-09-21', ...over,
});

test('on Monday the site manager submits the toolbox talk with its register', async ({ page }) => {
  let sent = null;
  let state = current();
  await mockApi(page, {
    'GET /safety-talks/current': () => null,
    'GET /safety-talks/overview': { talks: [], sites: [], missed: [] },
    'POST /safety-talks': (route, req) => {
      sent = req.postDataBuffer().toString('latin1');
      state = current({ talk: talk() });
      return route.fulfill(json(201, talk()));
    },
  });
  await page.route('http://api.test/safety-talks/current', (route) => route.request().method() === 'OPTIONS'
    ? route.fallback() : route.fulfill(json(200, state)));
  await signIn(page, { role: 'site_manager', site_id: 1 });
  await page.locator('#app-sidebar').getByRole('link', { name: 'Talks & Training' }).click();

  const week = page.getByRole('region', { name: "This week's talk" });
  await expect(week).toContainText("This week's talk is due");
  await expect(week).toContainText('submissions close at the end of');
  await expect(page.getByRole('region', { name: 'Completion rate' })).toContainText('75%');
  await expect(page.getByRole('region', { name: 'Missed weeks' })).toContainText(/Oct 5|5 Oct/);

  const form = page.getByRole('form', { name: "Submit this week's talk" });
  await form.getByRole('button', { name: 'Submit talk' }).click();
  await expect(form.getByRole('alert')).toContainText('title');
  await form.getByLabel('Title of the talk').fill('Safe refuelling');
  await form.getByLabel('People present').fill('14');
  await form.getByLabel('Document').setInputFiles({ name: 'register.pdf', mimeType: 'application/pdf', buffer: PDF });
  await form.getByRole('button', { name: 'Submit talk' }).click();

  await expect(week).toContainText("This week's talk is in");
  await expect(week).toContainText('Safe refuelling');
  for (const part of ['name="title"\r\n\r\nSafe refuelling', 'name="attendees"\r\n\r\n14', 'filename="register.pdf"']) {
    expect(sent).toContain(part);
  }
});

test('after Tuesday the week is closed and nothing can be submitted', async ({ page }) => {
  await mockApi(page, {
    'GET /safety-talks/current': current({ open: false, week_of: null, deadline: null, next_open: '2026-10-26' }),
    'GET /safety-talks/overview': { talks: [talk()], sites: [], missed: [] },
    'GET /safety-talks/7/view': (route) => route.fulfill({ status: 200, contentType: 'application/pdf', body: PDF, headers: { 'access-control-allow-origin': '*' } }),
  });
  await signIn(page, { role: 'site_manager', site_id: 1 });
  await page.goto('/trainings');
  await expect(page.getByRole('region', { name: "This week's talk" })).toContainText('Submissions are closed');
  await expect(page.getByRole('form', { name: "Submit this week's talk" })).toHaveCount(0);
  await page.getByRole('button', { name: 'Open Safe refuelling' }).click();
  await expect(page.getByRole('dialog', { name: 'Safe refuelling' }).getByRole('img', { name: 'Page 1 of 1' })).toBeVisible();
});

test('the SHE team tracks every site: missed weeks, sites still to submit, and filters', async ({ page }) => {
  const asked = [];
  await mockApi(page, {
    'GET /sites': [{ id: 1, name: 'Msasa Depot', region: 'Harare' }, { id: 2, name: 'Borrowdale', region: 'Harare' },
      { id: 3, name: 'Bulawayo Depot', region: 'Bulawayo' }],
    'GET /safety-talks/overview': (route, req) => {
      const q = new URL(req.url()).searchParams;
      asked.push(`${q.get('period')}|${q.get('region') || ''}|${q.get('site_id') || ''}`);
      return route.fulfill(json(200, {
        period: q.get('period'), regions: ['Bulawayo', 'Harare'],
        this_week: { week_of: '2026-10-19', open: true, deadline: inTwoDays(), pending: [{ site_id: 2, name: 'Borrowdale', region: 'Harare', managers: ['Rudo Moyo'] }] },
        totals: { due: 8, done: 6, missed: 2, rate: 75, sites: 2, attendees: 84 },
        sites: [
          { site_id: 1, name: 'Msasa Depot', region: 'Harare', managers: ['Tendai Moyo'], due: 4, done: 4, rate: 100, missed_weeks: [], this_week_open: true, this_week_done: true },
          { site_id: 2, name: 'Borrowdale', region: 'Harare', managers: ['Rudo Moyo'], due: 4, done: 2, rate: 50, missed_weeks: ['2026-10-12', '2026-10-05'], this_week_open: true, this_week_done: false },
        ],
        missed: [{ site_id: 2, name: 'Borrowdale', region: 'Harare', managers: ['Rudo Moyo'], week_of: '2026-10-12' },
          { site_id: 2, name: 'Borrowdale', region: 'Harare', managers: ['Rudo Moyo'], week_of: '2026-10-05' }],
        talks: [talk()],
      }));
    },
  });
  await signIn(page, { role: 'she_team' });
  await page.goto('/trainings');
  await expect(page.locator('.dash-kpi').first()).toContainText('75%');
  // missed (deadline passed) and still to submit (before the deadline) are shown together
  const pending = page.getByRole('region', { name: 'Still to submit' });
  const missed = page.getByRole('region', { name: 'Missed talks' });
  await expect(pending).toContainText('1 site');
  await expect(pending.locator('li')).toHaveCount(1);
  await expect(pending).toContainText('Borrowdale');
  await expect(pending).toContainText('Rudo Moyo');
  await expect(missed).toContainText('1 site');
  await expect(missed.locator('li')).toHaveCount(1);                 // one card per site, its weeks listed inside
  await expect(missed.locator('li')).toContainText('2 missed');
  await expect(missed).toContainText(/Oct 12|12 Oct/);
  await expect(missed).toContainText(/Oct 5|5 Oct/);
  // one column for how a site is doing, worst first
  const completion = page.getByRole('region', { name: 'Completion by site' });
  await expect(completion.locator('thead th')).toHaveText(['Site', 'Region', 'Site manager', 'Talks submitted']);
  await expect(completion.getByRole('row').nth(1)).toContainText('Borrowdale');
  await expect(completion.getByRole('row', { name: /Borrowdale/ })).toContainText('2 of 4 · 50%');
  await expect(completion.getByRole('row', { name: /Msasa Depot/ })).toContainText('4 of 4 · 100%');
  await expect(page.getByRole('region', { name: 'Submitted talks' })).toContainText('Safe refuelling');

  await page.getByLabel('Region').selectOption('Bulawayo');
  await expect.poll(() => asked.at(-1)).toBe('month|Bulawayo|');
  await expect(page.getByLabel('Site', { exact: true }).locator('option')).toHaveText(['All sites', 'Bulawayo Depot']);
  await page.getByLabel('Period').selectOption({ label: 'Last 3 months' });
  await expect.poll(() => asked.at(-1)).toBe('3m|Bulawayo|');
  await page.getByLabel('Site', { exact: true }).selectOption({ label: 'Bulawayo Depot' });
  await expect.poll(() => asked.at(-1)).toBe('3m|Bulawayo|3');
});

test('the SHE team records a fire fighting training with its supporting document', async ({ page }) => {
  let sent = null;
  const saved = { id: 5, site_id: 1, user_id: 1, training_module: 'Fire fighting', personnel: 'Tendai Moyo, Farai Moyo',
    trainer_name: 'Rudo Chikore', trained_employees: 2, total_employees: 2, date: '2026-10-10T00:00:00', type: null,
    comments: null, document_name: 'attendance.pdf', document_type: 'application/pdf', document_size: 100,
    has_document: true, document_viewable: true };
  let list = [];
  await mockApi(page, {
    'GET /sites': [{ id: 1, name: 'Msasa Depot' }],
    'GET /trainings': () => null,
    'POST /trainings/record': (route, req) => { sent = req.postDataBuffer().toString('latin1'); list = [saved]; return route.fulfill(json(201, saved)); },
  });
  await page.route('http://api.test/trainings/', (route) => route.request().method() === 'GET'
    ? route.fulfill(json(200, list)) : route.fallback());
  await signIn(page, { role: 'she_team' });
  await page.goto('/trainings?tab=trainings');
  await page.getByRole('button', { name: 'Record a training' }).click();
  const form = page.getByRole('form', { name: 'Record a training' });
  await form.getByLabel('Date').fill('2026-10-10');
  await form.getByLabel('Site').selectOption({ label: 'Msasa Depot' });
  await form.getByLabel('Name of training').fill('Fire fighting');
  await form.getByLabel('Trainer').fill('Rudo Chikore');
  await form.getByLabel('Personnel trained').fill('Tendai Moyo, Farai Moyo');
  await form.getByLabel('Number trained').fill('2');
  await form.getByRole('button', { name: 'Record training' }).click();
  await expect(form.getByRole('alert')).toContainText('supporting document');
  await form.getByLabel('Supporting document').setInputFiles({ name: 'attendance.pdf', mimeType: 'application/pdf', buffer: PDF });
  await form.getByRole('button', { name: 'Record training' }).click();

  const row = page.getByRole('region', { name: 'Trainings' }).getByRole('row', { name: /Fire fighting/ });
  await expect(row).toContainText('Rudo Chikore');
  await expect(row).toContainText('Tendai Moyo, Farai Moyo');
  await expect(row.getByRole('button', { name: 'Open Fire fighting' })).toBeVisible();
  for (const part of ['name="date"\r\n\r\n2026-10-10', 'name="site_id"\r\n\r\n1', 'name="training_module"\r\n\r\nFire fighting',
    'name="trainer_name"\r\n\r\nRudo Chikore', 'name="trained_employees"\r\n\r\n2', 'filename="attendance.pdf"']) expect(sent).toContain(part);
});

test('site managers see SHE trainings but cannot record them', async ({ page }) => {
  await mockApi(page, { 'GET /sites': [{ id: 1, name: 'Msasa Depot' }], 'GET /trainings': [] });
  await signIn(page, { role: 'site_manager', site_id: 1 });
  await page.goto('/trainings?tab=trainings');
  await expect(page.getByRole('tab', { name: 'SHE trainings' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('button', { name: 'Record a training' })).toHaveCount(0);
});

test('the dashboards show weekly talk completion, and the SHE dashboard filters by region', async ({ page }) => {
  const asked = [];
  await mockApi(page, {
    'GET /sites': [{ id: 1, name: 'Msasa Depot', region: 'Harare' }, { id: 2, name: 'Bulawayo Depot', region: 'Bulawayo' }],
    'GET /dashboard/summary': (route, req) => {
      asked.push(new URL(req.url()).searchParams.get('region') || '');
      return route.fulfill(json(200, { ...dashboardSummary({
        cur: { talks_due: 8, talks_done: 6, talks_rate: 75 }, prev: { talks_rate: 50 },
        sites: [siteRow({ talks_due: 4, talks_done: 3, talks_rate: 75 })] }), regions: ['Bulawayo', 'Harare'] }));
    },
  });
  await signIn(page, { role: 'she_team' });
  const kpi = page.locator('.dash-kpi').filter({ has: page.getByText('Weekly toolbox talks', { exact: true }) });
  await expect(kpi).toContainText('75%');
  await expect(kpi).toContainText('6 of 8 weeks submitted');
  await expect(kpi).toContainText('+25 pts');
  await page.getByLabel('Region').selectOption('Harare');
  await expect.poll(() => asked.at(-1)).toBe('Harare');
  await expect(page.getByLabel('Site', { exact: true }).locator('option')).toHaveText(['All sites in Harare', 'Msasa Depot']);
});
