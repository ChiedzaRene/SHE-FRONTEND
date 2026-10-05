// A working day in Glow SHE, done entirely through the screens against the real server and a fresh database.
const { test, expect } = require('@playwright/test');
const { ADMIN } = require('./settings');
const { signIn, signOut, openMenu, chooseOwnPassword, toast, localDateTime } = require('./ui');

const MANAGER = { name: 'Tendai Moyo', email: 'tendai.moyo@glowtest.com', temp: 'Welcome-123', own: 'Tendai-own-456' };
const SHE = { name: 'Rudo Chikore', email: 'rudo.chikore@glowtest.com', temp: 'Welcome-789', own: 'Rudo-own-321' };
const INCIDENT = 'Slipped near pump 3 & hurt wrist; first aid in < 5 minutes';
const when = localDateTime(1);

test.describe.serial('a working day', () => {
  test('the admin signs in (a wrong password is explained first)', async ({ page }) => {
    await signIn(page, ADMIN.email, 'not-the-password');
    await expect(page.getByText('Incorrect email or password')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);

    await page.getByLabel('Password').fill(ADMIN.password);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByRole('heading', { name: 'Overall SHE Dashboard' })).toBeVisible();
    await expect(page.getByText('No incidents recorded yet')).toBeVisible();
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
    await expect(form.getByLabel('Site')).toHaveValue('Msasa Depot');
    await form.getByLabel('Incident Type').selectOption({ label: 'Injury' });
    await form.getByLabel('Severity').selectOption({ label: 'High' });
    await form.getByLabel('When did it happen?').fill(when.value);
    await form.getByLabel('Description').fill(INCIDENT);
    await form.getByLabel('Lost Time Days').fill('2');
    await form.getByRole('button', { name: 'Log Incident' }).click();
    await expect(form).toHaveCount(0);

    await openMenu(page, 'Incidents');
    await expect(page.getByRole('heading', { name: 'Incidents Register' })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'injury' })).toHaveCount(1);
  });

  test('the SHE officer sets their password and enters the month\'s hours; the rates appear', async ({ page }) => {
    await signIn(page, SHE.email, SHE.temp);
    await chooseOwnPassword(page, SHE.temp, SHE.own);
    await openMenu(page, 'Hours Worked');
    await page.getByLabel('Month').fill(when.month);
    await page.getByLabel('Hours worked at Msasa Depot').fill('52000');
    await page.getByRole('button', { name: 'Save hours for Msasa Depot' }).click();
    await expect(page.getByRole('row', { name: /Msasa Depot/ }).getByText('Saved')).toBeVisible();

    await openMenu(page, 'Dashboard');
    // 1 recordable injury x 200,000 / 52,000 hours = 3.85; 1 lost-time injury -> LTIFR 3.85 too
    await expect(page.getByText('3.85').first()).toBeVisible();
  });

  test('the admin reads the incident exactly as it was typed, and sees it on the dashboard', async ({ page }) => {
    await signIn(page, ADMIN.email, ADMIN.password);
    await expect(page.getByText('injury (1)')).toBeVisible();
    await expect(page.locator('path.leaflet-interactive')).toHaveCount(2); // both sites on the map

    await openMenu(page, 'Incidents');
    await page.getByRole('row').filter({ hasText: 'injury' }).getByRole('button', { name: 'Details' }).click();
    await expect(page.getByText(INCIDENT, { exact: true })).toBeVisible(); // "&" and "<" shown as typed, not &amp;
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
    await signIn(manager, MANAGER.email, 'Reset-by-admin-1');
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
