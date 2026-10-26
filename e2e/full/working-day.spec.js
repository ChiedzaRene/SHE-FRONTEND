// A working day in Glow SHE, done entirely through the screens against the real server and a fresh database.
const { test, expect } = require('@playwright/test');
const { ADMIN, API_PORT } = require('./settings');
const API_URL = `http://127.0.0.1:${API_PORT}`;
const { signIn, signOut, openMenu, chooseOwnPassword, toast, localDateTime } = require('./ui');
const { makePdf } = require('../pdf');

const bell = (page) => page.locator('.notif:visible .notif-button');
const monthLabel = (ym) => new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1, 1)
  .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

const MANAGER = { name: 'Tendai Moyo', email: 'tendai.moyo@glowtest.com', temp: 'Welcome-123', own: 'Tendai-own-456', later: 'Tendai-new-789' };
const REGIONAL = { name: 'Grace Moyo', email: 'grace.moyo@glowtest.com', temp: 'Welcome-246', own: 'Grace-own-135' };
const SHE = { name: 'Rudo Chikore', email: 'rudo.chikore@glowtest.com', temp: 'Welcome-789', own: 'Rudo-own-321' };
const INCIDENT = 'Slipped near pump 3 & hurt wrist; first aid in < 5 minutes';
const INJURED = 'Farai Moyo';
const ACTION = 'Fix the drainage next to pump 3';
const when = localDateTime(1);

test.describe.serial('a working day', () => {
  test('the admin signs in (a wrong password is explained first)', async ({ page }) => {
    await signIn(page, ADMIN.email, 'not-the-password');
    await expect(page.getByText('Incorrect email or password')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);

    await page.getByLabel('Password').fill(ADMIN.password);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByRole('heading', { name: 'Overall SHE Dashboard' })).toBeVisible();
    await expect(page.getByText('No incidents recorded in this period')).toBeVisible();
  });

  test('the admin adds sites (no phone number needed), corrects one, and removes one added by mistake', async ({ page }) => {
    await signIn(page, ADMIN.email, ADMIN.password);
    await openMenu(page, 'Sites');
    for (const [name, address, lat, lng] of [
      ['Msasa Depot', '12 Mutare Road, Msasa, Harare', '-17.8390', '31.1140'],
      ['Borrowdale Station', '45 Borrowdale Road, Harare', '-17.7600', '31.0900'],
      ['Typo Station', 'Nowhere', '-18.0', '31.0'],
    ]) {
      await page.getByRole('button', { name: 'Add New Site' }).click();
      await page.getByLabel('Site Name').fill(name);
      await page.getByLabel('Physical Address').fill(address);
      // Msasa is put in its region when it is added; Borrowdale is allocated from the list below
      if (name === 'Msasa Depot') await page.getByLabel('Region', { exact: true }).selectOption('Harare East');
      await page.getByLabel('Site code').fill(name === 'Msasa Depot' ? 'MSA' : '');
      await page.getByLabel('Latitude').fill(lat);
      await page.getByLabel('Longitude').fill(lng);
      await page.getByRole('button', { name: 'Save Site' }).click();
      await expect(page.getByText(name, { exact: true })).toBeVisible();
    }

    // a phone number with letters is explained in plain words, and can be corrected
    await page.getByRole('button', { name: 'Edit Borrowdale Station' }).click();
    await page.getByLabel('Contact Number').fill('call the manager');
    await page.getByRole('button', { name: 'Update Site' }).click();
    await expect(toast(page, "Contact number isn't in the right format")).toBeVisible();
    await page.getByLabel('Contact Number').fill('+263 242 123 456');
    await page.getByRole('button', { name: 'Update Site' }).click();
    await expect(page.getByText('+263 242 123 456')).toBeVisible();

    // allocating a site to a region straight from the list; each region shows its manager (none yet)
    const regions = page.getByRole('region', { name: 'Regions' });
    await expect(regions).toContainText('2 sites not allocated');      // Borrowdale and Typo Station
    await page.getByLabel('Region for Borrowdale Station').selectOption('Harare East');
    await expect(toast(page, 'Borrowdale Station is now in Harare East')).toBeVisible();
    await expect(regions.locator('li').filter({ hasText: 'Harare East' })).toContainText('2 sites');
    await expect(regions.locator('li').filter({ hasText: 'Harare East' })).toContainText('No regional manager yet');
    await expect(regions).toContainText('1 site not allocated');

    await page.getByRole('button', { name: 'Delete Typo Station' }).click();
    await expect(page.getByRole('alertdialog')).toContainText('Delete Typo Station?');
    await page.getByRole('button', { name: 'Delete site' }).click();
    await expect(page.getByText('Typo Station', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Msasa Depot', { exact: true })).toBeVisible();
  });

  test('the admin registers a site manager and a SHE officer', async ({ page }) => {
    await signIn(page, ADMIN.email, ADMIN.password);
    await openMenu(page, 'Users');
    for (const [person, role, site] of [[MANAGER, 'Site Manager', 'Msasa Depot'], [SHE, 'SHE Team', 'Global']]) {
      await page.getByRole('button', { name: 'Register New User' }).click();
      await page.getByLabel('Full Name').fill(person.name);
      await page.getByLabel('Email').fill(person.email);
      await page.getByLabel('Password').fill(person.temp);
      await page.getByLabel('Role').selectOption({ label: role });
      await page.getByLabel('Site').selectOption({ label: site });
      await page.getByRole('button', { name: 'Create User' }).click();
      await expect(toast(page, `${person.email} created`)).toBeVisible();
      await expect(page.getByText(person.email, { exact: true })).toBeVisible();
    }
  });

  test('a too-short password is refused with a reason, and nothing is saved', async ({ page }) => {
    await signIn(page, ADMIN.email, ADMIN.password);
    await openMenu(page, 'Users');
    await page.getByRole('button', { name: `Edit ${SHE.email}` }).click();
    const password = page.getByLabel('Password');
    await password.fill('1234');
    await page.getByRole('button', { name: 'Update User' }).click();
    expect(await password.evaluate((el) => el.validationMessage)).toMatch(/8/);
    await expect(page.locator('.modal')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
  });

  test('the site manager signs in with the temporary password and must choose their own first', async ({ page }) => {
    await signIn(page, MANAGER.email, MANAGER.temp);
    await expect(page).toHaveURL(/\/settings$/);
    // everything except Settings is locked until the password is changed
    const incidentsItem = page.locator('#app-sidebar .nav-link-disabled', { hasText: 'Incidents' });
    await expect(incidentsItem).toBeVisible();
    await incidentsItem.click({ force: true });
    await expect(page).toHaveURL(/\/settings$/);

    await chooseOwnPassword(page, MANAGER.temp, MANAGER.own);
    await expect(page.getByRole('heading', { name: 'Msasa Depot' })).toBeVisible(); // their own site's dashboard
    await expect(page.locator('#app-sidebar .nav-link-disabled')).toHaveCount(0);
  });

  test('the site manager logs an injury at their site', async ({ page }) => {
    await signIn(page, MANAGER.email, MANAGER.own);
    await expect(page.getByRole('heading', { name: 'Msasa Depot' })).toBeVisible();
    await page.getByRole('button', { name: 'Log Incident' }).click();
    const form = page.locator('.modal');
    await expect(form.getByLabel('Site', { exact: true })).toHaveValue('Msasa Depot');
    await form.getByLabel('Incident Type').selectOption({ label: 'Injury' });
    await form.getByLabel('Severity').selectOption({ label: 'High' });
    await form.getByLabel('When did it happen?').fill(when.value);
    await form.getByLabel('Description').fill(INCIDENT);
    await form.getByLabel('Name of injured person').fill(INJURED);
    await form.getByLabel('Lost Time Days').fill('2');
    // the rest of Glow's report form
    await form.getByLabel('Name of reporter').fill(MANAGER.name);
    await form.getByLabel('Location of incident').fill('Pump 3 forecourt');
    await form.getByLabel('Body injury').check();
    await form.getByLabel('First aid case').check();
    await form.getByRole('button', { name: 'Log Incident' }).click();
    await expect(form).toHaveCount(0);

    await openMenu(page, 'Incidents');
    await expect(page.getByRole('heading', { name: 'Incidents Register' })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'injury' })).toHaveCount(1);
  });

  test('the admin is notified of the injury, opens it from the bell, and finds it flagged NEW at the top', async ({ page }) => {
    await signIn(page, ADMIN.email, ADMIN.password);
    await expect(bell(page)).toHaveAccessibleName('Notifications, 1 unread');
    await bell(page).click();
    const item = page.getByRole('dialog', { name: 'Notifications' }).getByRole('button', { name: new RegExp(`^New injury at Msasa Depot \\(${INJURED} hurt\\)`) });
    await expect(item).toContainText('Tendai Moyo recorded a high incident');
    await item.click();

    await expect(page).toHaveURL(/\/incidents$/);
    const first = page.locator('tbody tr').first();
    await expect(first).toContainText('injury');
    await expect(first.getByText('NEW', { exact: true })).toBeVisible();
    await expect(bell(page)).toHaveAccessibleName('Notifications');   // read now

    await page.reload();                                                // seen: no longer flagged
    await expect(page.locator('tbody tr').first()).toContainText('injury');
    await expect(page.getByText('NEW', { exact: true })).toHaveCount(0);

    // it stays in the list for 24 hours after opening, with when it happened, and can be marked unread again
    await bell(page).click();
    const panel = page.getByRole('dialog', { name: 'Notifications' });
    await expect(panel.locator('time').first()).toHaveText(/^Today, /);
    await expect(panel).toContainText(/opened, removed in 2[34] h/);
    await panel.getByRole('button', { name: 'Mark all as unread' }).click();
    await expect(bell(page)).toHaveAccessibleName('Notifications, 1 unread');
    await panel.getByRole('button', { name: 'Mark all as read' }).click();
    await expect(bell(page)).toHaveAccessibleName('Notifications');
  });

  test('the dashboard explains that the injury is not counted until hours are entered for its month', async ({ page }) => {
    await signIn(page, ADMIN.email, ADMIN.password);
    await page.getByLabel('Period').selectOption({ label: 'Last 12 months' });
    const notice = page.getByRole('status').filter({ hasText: 'not counted in LTIFR yet' });
    await expect(notice).toContainText('1 injury is not counted in LTIFR yet');
    await notice.getByRole('link', { name: 'Enter hours worked' }).click();
    await expect(page.getByRole('heading', { name: 'Hours Worked' })).toBeVisible();
  });

  test('the site manager enters the month\'s hours and workers; the SHE officer sees them but can\'t change them', async ({ page }) => {
    await signIn(page, MANAGER.email, MANAGER.own);
    await openMenu(page, 'Hours Worked');
    // the page lists the month that has an injury but no hours; choosing it switches the page to that month
    await page.getByRole('button', { name: monthLabel(when.month) }).click();
    await expect(page.getByLabel('Month')).toHaveValue(when.month);
    await page.getByLabel('Hours worked at Msasa Depot').fill('52000');
    await page.getByLabel('Number of workers at Msasa Depot').fill('30');
    await page.getByRole('button', { name: 'Save hours for Msasa Depot' }).click();
    await expect(page.getByRole('row', { name: /Msasa Depot/ }).getByText('Saved')).toBeVisible();
    await openMenu(page, 'Dashboard');
    await expect(page.locator('.card').filter({ hasText: 'Workers' }).first()).toContainText('30');
    await signOut(page);

    await signIn(page, SHE.email, SHE.temp);
    await chooseOwnPassword(page, SHE.temp, SHE.own);
    await openMenu(page, 'Hours Worked');
    await page.getByLabel('Month').fill(when.month);
    const row = page.getByRole('row', { name: /Msasa Depot/ });
    await expect(row).toContainText('52,000');
    await expect(row).toContainText('30');
    await expect(page.getByRole('button', { name: /^Save hours/ })).toHaveCount(0);   // read-only for the SHE team

    await openMenu(page, 'Dashboard');
    await page.getByLabel('Period').selectOption({ label: 'Last 12 months' });
    // 1 lost-time injury x 200,000 / 52,000 hours = LTIFR 3.85
    const kpi = (label) => page.locator('.dash-kpi').filter({ has: page.getByText(label, { exact: true }) });
    await expect(kpi('LTIFR (average of sites)')).toContainText('3.85');
    await expect(page.getByText(/TRIR/)).toHaveCount(0);
    await expect(kpi('Workers')).toContainText('30');
    await expect(page.getByText('not counted in LTIFR yet')).toHaveCount(0); // every injury now counted
    await page.getByLabel('Site', { exact: true }).selectOption({ label: 'Msasa Depot' });
    const info = page.getByRole('region', { name: 'Site information' });
    await expect(info).toContainText('12 Mutare Road, Msasa, Harare');
    await expect(info).toContainText('Manager: Tendai Moyo');
  });

  test('the SHE officer shares a view-only PDF with site managers; the manager can open it but not download it', async ({ page, browser }) => {
    await signIn(page, SHE.email, SHE.own);
    await openMenu(page, 'SHE Files');
    await page.getByRole('button', { name: 'Share a file' }).click();
    const form = page.getByRole('form', { name: 'Share a file' });
    await form.getByLabel('File').setInputFiles({ name: 'spill-procedure.pdf', mimeType: 'application/pdf', buffer: makePdf('Spill procedure') });
    await form.getByLabel('Title').fill('Spill response procedure');
    await form.getByLabel('Which site?').selectOption({ label: 'Msasa Depot only' });
    await form.getByRole('checkbox', { name: /View only/ }).check();
    await form.getByRole('button', { name: 'Share file' }).click();
    await expect(page.locator('.files-row').first()).toContainText('View only');
    await expect(page.getByRole('button', { name: 'Download Spill response procedure' })).toBeVisible(); // the sharer keeps a copy

    const manager = await (await browser.newContext()).newPage();
    await signIn(manager, MANAGER.email, MANAGER.own);
    await expect(manager.locator('.notif-popup')).toContainText('New SHE file: Spill response procedure');
    await openMenu(manager, 'SHE Files');
    const row = manager.locator('.files-row').filter({ hasText: 'Spill response procedure' });
    await expect(row.getByText('NEW', { exact: true })).toBeVisible();
    await expect(row.getByRole('button', { name: /^Download/ })).toHaveCount(0);
    await row.getByRole('button', { name: 'Open Spill response procedure' }).click();
    const viewer = manager.getByRole('dialog', { name: 'Spill response procedure' });
    await expect(viewer.getByRole('img', { name: 'Page 1 of 1' })).toBeVisible();
    await expect(viewer.getByRole('button', { name: 'Download' })).toHaveCount(0);
    await expect(viewer.locator('.viewer-watermark')).toContainText(MANAGER.email);
    // and the server itself refuses the download, whatever the screen shows
    const status = await manager.evaluate(async ({ api }) => {
      const list = await fetch(`${api}/she-files/`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then((r) => r.json());
      const res = await fetch(`${api}/she-files/${list[0].id}/download`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      return res.status;
    }, { api: API_URL });
    expect(status).toBe(403);
  });

  test('the manager gives the weekly talk; the SHE team tracks it and records a first aid training', async ({ page, browser }) => {
    await signIn(page, MANAGER.email, MANAGER.own);
    await openMenu(page, 'Talks & Training');
    const week = page.getByRole('region', { name: "This week's talk" });
    const day = new Date().getDay();               // talks can be submitted on Monday (1) and Tuesday (2)
    const windowOpen = day === 1 || day === 2;
    if (windowOpen) {
      const form = page.getByRole('form', { name: "Submit this week's talk" });
      await form.getByLabel('Title of the talk').fill('Safe refuelling');
      await form.getByLabel('People present').fill('14');
      await form.getByLabel('Document').setInputFiles({ name: 'register.pdf', mimeType: 'application/pdf', buffer: makePdf('Register') });
      await form.getByRole('button', { name: 'Submit talk' }).click();
      await expect(week).toContainText("This week's talk is in");
    } else {
      await expect(week).toContainText('Submissions are closed');
      await expect(page.getByRole('form', { name: "Submit this week's talk" })).toHaveCount(0);
    }

    const she = await (await browser.newContext()).newPage();
    await signIn(she, SHE.email, SHE.own);
    await openMenu(she, 'Talks & Training');
    await she.getByLabel('Region').selectOption('Harare East');
    const row = she.getByRole('region', { name: 'Completion by site' }).getByRole('row', { name: /Msasa Depot/ });
    // the site was added today, so the only week due is this one (if its window is open)
    await expect(row).toContainText(windowOpen ? '1 of 1 · 100%' : 'None due yet');
    if (windowOpen) await expect(she.getByRole('region', { name: 'Submitted talks' })).toContainText('Safe refuelling');

    await she.getByRole('tab', { name: 'SHE trainings' }).click();
    await she.getByRole('button', { name: 'Record a training' }).click();
    const form = she.getByRole('form', { name: 'Record a training' });
    await form.getByLabel('Site').selectOption({ label: 'Msasa Depot' });
    await form.getByLabel('Name of training').fill('First aid');
    await form.getByLabel('Trainer').fill(SHE.name);
    await form.getByLabel('Personnel trained').fill(`${MANAGER.name}, ${INJURED}`);
    await form.getByLabel('Number trained').fill('2');
    await form.getByLabel('Supporting document').setInputFiles({ name: 'first-aid.pdf', mimeType: 'application/pdf', buffer: makePdf('First aid') });
    await form.getByRole('button', { name: 'Record training' }).click();
    await expect(she.getByRole('region', { name: 'Trainings' }).getByRole('row', { name: /First aid/ })).toContainText(SHE.name);

    // the manager sees it at their site and can open the document
    // straight to the tab: opening it marks the training as seen, so a click and a reload would race
    await page.goto('/trainings?tab=trainings');
    const training = page.getByRole('region', { name: 'Trainings' }).getByRole('row', { name: /First aid/ });
    await expect(training.getByText('NEW', { exact: true })).toBeVisible();
    await training.getByRole('button', { name: 'Open First aid' }).click();
    await expect(page.getByRole('dialog', { name: 'First aid' }).getByRole('img', { name: 'Page 1 of 1' })).toBeVisible();
  });

  test('inspection: SHE writes the report, the regional office assigns the NC, the site completes it, SHE closes it', async ({ page, browser }) => {
    // wait until signed in, then close the newest-notification pop-up so it doesn't cover the page
    const pop = async (p) => {
      await expect(p).not.toHaveURL(/\/login$/);
      await p.locator('#app-sidebar').waitFor();
      if (await p.locator('.notif-popup').isVisible()) await p.getByRole('button', { name: 'Dismiss notification' }).click();
    };

    // the admin adds the regional manager for the Harare East region
    await signIn(page, ADMIN.email, ADMIN.password);
    await openMenu(page, 'Users');
    await page.getByRole('button', { name: 'Register New User' }).click();
    await page.getByLabel('Full Name').fill(REGIONAL.name);
    await page.getByLabel('Email').fill(REGIONAL.email);
    await page.getByLabel('Password').fill(REGIONAL.temp);
    await page.getByLabel('Role').selectOption({ label: 'Regional Manager' });
    await page.getByLabel('Region').selectOption('Harare East');
    await page.getByRole('button', { name: 'Create User' }).click();
    await expect(toast(page, `${REGIONAL.email} created`)).toBeVisible();

    // the SHE officer writes the report
    const she = await (await browser.newContext()).newPage();
    await signIn(she, SHE.email, SHE.own);
    await pop(she);
    await openMenu(she, 'Inspections');
    await she.getByRole('button', { name: 'New inspection' }).click();
    await she.getByLabel('Site inspected').selectOption({ label: 'Msasa Depot' });
    await she.getByLabel('Inspected by').fill(SHE.name);
    await she.getByRole('button', { name: 'Start report' }).click();
    await expect(she.getByRole('heading', { name: /Msasa Depot site inspection report No. 1/i })).toBeVisible();
    await she.getByRole('textbox', { name: 'Introduction' }).click();
    await she.keyboard.type('The SHE Department conducted a ');
    await she.keyboard.press('Control+b');
    await she.keyboard.type('comprehensive');
    await she.keyboard.press('Control+b');
    await she.keyboard.type(' inspection.');
    await she.getByRole('textbox', { name: 'Inspection overall observations' }).click();
    await she.keyboard.type('Overall the site is performing well.');
    await she.getByRole('button', { name: 'Save report' }).click();
    await expect(she.getByRole('button', { name: 'Saved' })).toBeVisible();
    await she.getByRole('button', { name: 'Add a non-conformity' }).click();
    const ncForm = she.getByRole('form', { name: 'Add a non-conformity' });
    await ncForm.getByLabel('Heading').fill('Oil separator');
    await ncForm.getByRole('textbox', { name: 'Details of the NC' }).click();
    await she.keyboard.type('Oil separator found nearly full during the inspection.');
    await ncForm.getByLabel('Requirement breached').fill('ZWS 970:2020 Clause 17(F)');
    await ncForm.getByRole('button', { name: 'Add NC' }).click();
    const card = (p) => p.getByRole('article', { name: 'NC 1/MSA/01' });
    await card(she).getByLabel('Proof for 1/MSA/01').setInputFiles({ name: 'separator.png', mimeType: 'image/png',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') });
    await expect(card(she).getByRole('button', { name: 'Enlarge separator.png' })).toBeVisible();
    // proof of the inspection itself: the signed checklist as a PDF
    await she.getByLabel('Supporting document for the report').setInputFiles({ name: 'signed-checklist.pdf', mimeType: 'application/pdf', buffer: makePdf('Checklist') });
    await expect(she.getByRole('region', { name: 'Supporting documents' })).toContainText('signed-checklist.pdf');
    const reportUrl = she.url();
    await she.getByRole('button', { name: 'Submit to regional office' }).click();
    await she.getByRole('alertdialog').getByRole('button', { name: 'Submit report' }).click();
    await expect(she).toHaveURL(/\/inspections$/);                     // submitted: the report closes, back to the list
    await she.goto(reportUrl);
    await expect(card(she)).toContainText('With regional office');

    // the regional manager acknowledges it and gives it to the site manager with a deadline
    const regional = await (await browser.newContext()).newPage();
    await signIn(regional, REGIONAL.email, REGIONAL.temp);
    await chooseOwnPassword(regional, REGIONAL.temp, REGIONAL.own);
    await expect(regional).toHaveURL(/\/inspections$/);
    await pop(regional);
    await regional.getByRole('region', { name: 'Waiting on you' }).getByRole('link', { name: /1\/MSA\/01/ }).click();
    const ack = regional.getByRole('form', { name: 'Acknowledge 1/MSA/01' });
    await ack.getByRole('textbox', { name: /Recommended corrective action/ }).click();
    await regional.keyboard.type('Drain and clean the oil separator.');
    await ack.getByLabel('By who').selectOption({ label: MANAGER.name });
    const due = new Date(Date.now() + 14 * 86400e3);
    await ack.getByLabel('By when').fill(`${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`);
    await ack.getByRole('button', { name: 'Acknowledge and assign' }).click();
    await expect(regional).toHaveURL(/\/inspections$/);                // every NC assigned: back to the list
    await regional.goto(reportUrl);
    await expect(card(regional)).toContainText('Corrective action open');

    // the site manager sees the whole report and completes the action
    const manager = await (await browser.newContext()).newPage();
    await signIn(manager, MANAGER.email, MANAGER.own);
    await pop(manager);
    await manager.goto(reportUrl);
    await expect(manager.getByRole('region', { name: 'Introduction' }).locator('b')).toHaveText('comprehensive');
    await expect(card(manager)).toContainText('Drain and clean the oil separator.');
    await card(manager).getByLabel('How was it closed?').fill('Separator drained and cleaned by Clean Co; receipt in the SHE file.');
    await card(manager).getByLabel(/^Proof: photos or documents/).setInputFiles([
      { name: 'receipt.pdf', mimeType: 'application/pdf', buffer: makePdf('Receipt') },
      { name: 'after.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') },
    ]);
    // the site sees the inspection's proof too
    await manager.getByRole('region', { name: 'Supporting documents' }).getByRole('button', { name: 'Open signed-checklist.pdf' }).click();
    await expect(manager.getByRole('dialog', { name: 'signed-checklist.pdf' }).getByRole('img', { name: 'Page 1 of 1' })).toBeVisible();
    await manager.getByRole('button', { name: 'Close viewer' }).click();
    await card(manager).getByRole('button', { name: 'Mark as completed' }).click();
    await expect(card(manager)).toContainText('Awaiting SHE review');

    // the SHE officer checks the proof, then closes it; the reviewer and date are recorded
    await she.reload();
    await expect(card(she).getByRole('button', { name: 'Open receipt.pdf' })).toBeVisible();
    await expect(card(she).getByRole('button', { name: 'Enlarge after.png' })).toBeVisible();
    await card(she).getByRole('button', { name: 'Close NC' }).click();
    await expect(card(she)).toContainText(`Reviewed by: ${SHE.name}`);
    await expect(card(she)).toContainText('NC status after review: Closed');
    await expect(she.locator('.insp-cover')).toContainText('Closed');

    // the site manager is told it was closed; opening the report reads the report's notifications
    await manager.reload();
    await expect(card(manager)).toContainText('NC status after review: Closed');
    await expect(manager.locator('.notif:visible .notif-button')).toHaveAccessibleName('Notifications');

    // the corrective action shows on the site's corrective actions, linked to the report
    await openMenu(manager, 'Corrective Actions');
    await expect(manager.getByRole('row', { name: /Inspection NC 1\/MSA\/01/ }).getByRole('link', { name: 'Open the inspection report' })).toBeVisible();
  });

  test('a licence due within a month: the SHE team records it and the site manager is reminded', async ({ page, browser }) => {
    await signIn(page, SHE.email, SHE.own);
    await expect(page).not.toHaveURL(/\/login$/);
    await openMenu(page, 'Legal');
    await page.locator('.lic-site-head').filter({ hasText: 'Msasa Depot' }).click();   // sites start folded
    await page.getByRole('button', { name: 'Fire brigade licence at Msasa Depot: Not recorded' }).click();
    const form = page.getByRole('dialog', { name: 'Fire brigade licence at Msasa Depot' }).getByRole('form', { name: 'Record the licence' });
    const due = new Date(Date.now() + 20 * 86400e3);
    await form.getByLabel('Expiry / payment due date').fill(`${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`);
    await form.getByLabel('Licence number').fill('FB-2026-114');
    await form.getByLabel(/Licence certificate/).setInputFiles({ name: 'fire-licence.pdf', mimeType: 'application/pdf', buffer: makePdf('Fire licence') });
    await form.getByRole('button', { name: 'Save licence' }).click();
    await expect(page.getByRole('region', { name: 'Licences due' })).toContainText('Fire brigade licence · Msasa Depot');

    const manager = await (await browser.newContext()).newPage();
    await signIn(manager, MANAGER.email, MANAGER.own);
    await bell(manager).click();
    const reminder = manager.getByRole('dialog', { name: 'Notifications' }).getByRole('button', { name: /^Fire brigade licence for Msasa Depot is due in (19|20) days/ });
    await expect(reminder).toBeVisible();
    await reminder.click();
    await expect(manager).toHaveURL(/\/legal$/);
    await manager.getByRole('button', { name: /^Fire brigade licence at Msasa Depot: Due within a month/ }).click();
    await manager.getByRole('button', { name: 'Open fire-licence.pdf' }).click();
    await expect(manager.getByRole('img', { name: 'Page 1 of 1' })).toBeVisible();
  });

  test('the admin reads the incident exactly as it was typed, and sees it on the dashboard', async ({ page }) => {
    await signIn(page, ADMIN.email, ADMIN.password);
    await expect(page.getByRole('list', { name: 'Incident types' })).toContainText('Injury (1)');
    await expect(page.locator('path.leaflet-interactive')).toHaveCount(2); // both sites on the map

    await openMenu(page, 'Incidents');
    await page.getByRole('row').filter({ hasText: 'injury' }).getByRole('button', { name: 'Details' }).click();
    await expect(page.getByText(INCIDENT, { exact: true })).toBeVisible(); // "&" and "<" shown as typed, not &amp;
    await expect(page.getByText(`Injured person: ${INJURED}`)).toBeVisible();
  });

  test('the SHE officer attaches evidence and assigns the investigation team from the accounts', async ({ page }) => {
    await signIn(page, SHE.email, SHE.own);
    await openMenu(page, 'Incidents');
    const row = page.getByRole('row').filter({ hasText: 'injury' });
    await expect(row).toContainText('Reported');
    await row.getByRole('button', { name: 'Details' }).click();
    const record = page.getByRole('dialog', { name: /^Incident INC-/ });
    await expect(record.getByText('Pump 3 forecourt')).toBeVisible();
    await expect(record.getByText('Body injury')).toBeVisible();

    await record.getByLabel('Attach evidence files').setInputFiles({ name: 'witness.pdf', mimeType: 'application/pdf', buffer: makePdf('Witness') });
    await expect(record.getByRole('button', { name: 'Open witness.pdf' })).toBeVisible();

    await record.getByRole('tab', { name: 'Investigation' }).click();
    // the team is chosen from the people with accounts
    await record.getByLabel('Team member 1', { exact: true }).selectOption({ label: `${SHE.name} (SHE team)` });
    await record.getByLabel('Team member 1 job title').fill('SHE Officer');
    await record.getByRole('button', { name: 'Assign investigation team' }).click();
    await expect(record.getByRole('status')).toHaveText(/Investigation team assigned/);
    await record.getByRole('tab', { name: 'History' }).click();
    await expect(record.getByText('moved it from Reported to Team assigned')).toBeVisible();
    await record.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(row).toContainText('Team assigned');
  });

  test('the admin assigns a corrective action to the manager, who is notified and finds it flagged NEW', async ({ page, browser }) => {
    await signIn(page, ADMIN.email, ADMIN.password);
    await openMenu(page, 'Corrective Actions');
    await page.getByRole('button', { name: 'Log Action' }).click();
    await page.getByLabel('Location / Site').selectOption({ label: 'Msasa Depot' });
    await page.getByLabel('Assigned Personnel').fill(MANAGER.name);
    await page.getByLabel('Action Plan / Description').fill(ACTION);
    const due = new Date(Date.now() + 14 * 864e5); // the deadline is chosen, not fixed
    await page.getByLabel('Deadline').fill(`${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`);
    await page.getByRole('button', { name: 'Assign Action' }).click();
    await expect(page.locator('tbody tr').filter({ hasText: 'Msasa Depot' })).toHaveCount(1);

    const manager = await (await browser.newContext()).newPage();
    await signIn(manager, MANAGER.email, MANAGER.own);
    await expect(bell(manager)).toHaveAccessibleName('Notifications, 1 unread');
    await bell(manager).click();
    const item = manager.getByRole('dialog', { name: 'Notifications' })
      .getByRole('button', { name: /^Corrective action assigned to you at Msasa Depot/ });
    await expect(item).toContainText(`Grace Admin assigned you: ${ACTION}`);
    await item.click();
    await expect(manager).toHaveURL(/\/corrective-actions$/);
    const row = manager.locator('tbody tr').first();
    await expect(row).toContainText('Msasa Depot');
    await expect(row.getByText('NEW', { exact: true })).toBeVisible();
  });

  test('the admin views the incident register report', async ({ page }) => {
    await signIn(page, ADMIN.email, ADMIN.password);
    await openMenu(page, 'Reports');
    await page.getByRole('button', { name: /Incident register/ }).click();
    await expect(page.getByRole('cell', { name: INCIDENT })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download PDF' })).toBeEnabled();
  });

  test('the admin resets the manager\'s password, gets a confirmation, and the manager must change it again', async ({ page, browser }) => {
    await signIn(page, ADMIN.email, ADMIN.password);
    await openMenu(page, 'Users');
    await page.getByRole('button', { name: `Edit ${MANAGER.email}` }).click();
    await page.getByLabel('Password').fill('Reset-by-admin-1');
    await page.getByRole('button', { name: 'Update User' }).click();
    await expect(page.locator('.modal')).toHaveCount(0);
    await expect(toast(page, `Password reset for ${MANAGER.email}`)).toBeVisible();

    const manager = await (await browser.newContext()).newPage();
    await signIn(manager, MANAGER.email, MANAGER.own);
    await expect(manager.getByText('Incorrect email or password')).toBeVisible(); // the old one no longer works
    await manager.getByLabel('Password').fill('Reset-by-admin-1');
    await manager.getByRole('button', { name: 'Sign In' }).click();
    await expect(manager).toHaveURL(/\/settings$/);
    await expect(manager.getByLabel('Temporary password (from your administrator)')).toBeVisible();

    await chooseOwnPassword(manager, 'Reset-by-admin-1', MANAGER.later);
    await bell(manager).click();
    await expect(manager.getByRole('dialog', { name: 'Notifications' }))
      .toContainText('Your password was reset by an administrator');
  });

  test('a person who recorded incidents can\'t be deleted, so the admin deactivates them instead', async ({ page, browser }) => {
    await signIn(page, ADMIN.email, ADMIN.password);
    await openMenu(page, 'Users');
    await page.getByRole('button', { name: `Delete ${MANAGER.email}` }).click();
    await page.getByRole('button', { name: 'Delete user' }).click();
    await expect(page.getByRole('alertdialog')).toContainText('1 incident');
    await page.getByRole('button', { name: 'Deactivate account' }).click();
    await expect(toast(page, 'Account deactivated')).toBeVisible();

    const manager = await (await browser.newContext()).newPage();
    await signIn(manager, MANAGER.email, MANAGER.later);
    await expect(manager.getByText('Account is disabled. Contact your administrator.')).toBeVisible();
  });

  test('the admin looks up everything the manager did in the audit log', async ({ page }) => {
    await signIn(page, ADMIN.email, ADMIN.password);
    await openMenu(page, 'Settings');
    await page.getByRole('tab', { name: 'Audit log' }).click();
    await page.getByRole('combobox', { name: 'Person' }).click();
    await page.getByLabel('Search people').fill('tendai');
    await page.getByRole('option', { name: /Tendai Moyo/ }).click();
    await expect(page.getByText('Actions recorded')).toBeVisible();
    const log = page.locator('table');
    await expect(log).toContainText('Signed in');
    await expect(log).toContainText(/incident/i);
    await expect(log).toContainText(/password/i);
  });

  test('on a phone, the menu opens from the menu button and closes after choosing a page', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, SHE.email, SHE.own);
    await expect(page.locator('#app-sidebar')).toBeHidden();
    await openMenu(page, 'Reports');
    await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible();
    await expect(page.locator('#app-sidebar')).toBeHidden();
    await signOut(page);
  });

  test('repeated wrong passwords lock only that account for a few minutes', async ({ page }) => {
    for (let i = 0; i < 8; i += 1) {
      await signIn(page, SHE.email, `wrong-guess-${i}`);
      await expect(page.getByText('Incorrect email or password')).toBeVisible();
    }
    await signIn(page, SHE.email, SHE.own);
    await expect(page.getByText(/Too many failed attempts for this account/)).toBeVisible();

    await signIn(page, ADMIN.email, ADMIN.password); // a colleague is not affected
    await expect(page.getByRole('heading', { name: 'Overall SHE Dashboard' })).toBeVisible();
  });
});
