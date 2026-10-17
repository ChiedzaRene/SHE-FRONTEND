const { test, expect } = require('@playwright/test');
const { json, mockApi, signIn } = require('./helpers');

const lastMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

test('a site manager enters their hours worked and number of workers for the month', async ({ page }) => {
  const saves = [];
  await mockApi(page, {
    'GET /sites': [{ id: 1, name: 'Msasa Depot' }],
    'GET /site-hours': [],
    'PUT /site-hours': (route, req) => {
      saves.push(req.postDataJSON());
      return route.fulfill(json(200, { id: 1, site_id: 1, period: `${lastMonth()}-01`, hours_worked: 5200, workers: 26, entered_by: 4 }));
    },
  });
  await signIn(page, { role: 'site_manager', site_id: 1 });
  await page.locator('#app-sidebar').getByRole('link', { name: 'Hours Worked' }).click();
  await expect(page.getByRole('heading', { name: 'Hours Worked' })).toBeVisible();
  await page.getByLabel('Hours worked at Msasa Depot').fill('5200');
  await page.getByLabel('Number of workers at Msasa Depot').fill('26');
  await page.getByRole('button', { name: 'Save hours for Msasa Depot' }).click();
  await expect(page.getByText('Saved')).toBeVisible();
  expect(saves).toEqual([{ site_id: 1, month: lastMonth(), hours_worked: 5200, workers: 26 }]);
});

test('the SHE team sees the hours and workers the managers entered but cannot change them', async ({ page }) => {
  await mockApi(page, {
    'GET /sites': [{ id: 1, name: 'Msasa Depot' }, { id: 2, name: 'Borrowdale' }],
    'GET /site-hours': [{ id: 1, site_id: 1, period: `${lastMonth()}-01`, hours_worked: 5200, workers: 26, entered_by: 4 }],
  });
  await signIn(page, { role: 'she_team' });
  await page.locator('#app-sidebar').getByRole('link', { name: 'Hours Worked' }).click();
  await expect(page.getByText("These figures are entered by the site managers and can't be changed here.")).toBeVisible();
  const row = page.getByRole('row', { name: /Msasa Depot/ });
  await expect(row).toContainText('5,200');
  await expect(row).toContainText('26');
  await expect(row).toContainText('Reported');
  await expect(page.getByRole('row', { name: /Borrowdale/ })).toContainText('Missing');
  await expect(page.getByRole('spinbutton')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Save hours/ })).toHaveCount(0);
});
