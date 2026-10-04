const { test, expect } = require('@playwright/test');
const { mockApi, signIn } = require('./helpers');

test('the admin dashboard uses the small summary instead of downloading every incident', async ({ page }) => {
  await signIn(page, { role: 'admin' });
  const calls = await mockApi(page, {
    'GET /incidents/summary': { total: 12, open: 5, by_type: [{ name: 'injury', value: 7 }, { name: 'spill', value: 5 }] },
    'GET /incidents/metrics/global': { trir: 0.4, ltifr: 0.1, total_incidents: 12 },
  });
  await page.goto('/admin');
  await expect(page.getByText('Overall SHE Dashboard')).toBeVisible();
  await expect(page.getByText('5', { exact: true }).first()).toBeVisible(); // open incidents
  expect(calls).toContain('GET /incidents/summary');
  expect(calls).not.toContain('GET /incidents');
});
