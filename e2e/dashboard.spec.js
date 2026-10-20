const { test, expect } = require('@playwright/test');
const { json, mockApi, signIn, dashboardSummary, siteRow } = require('./helpers');

const sites = [
  { id: 1, name: 'Msasa Depot', latitude: -17.8, longitude: 31.0 },
  { id: 2, name: 'Borrowdale', latitude: -17.7, longitude: 31.1 },
];

const bubbleWidths = (page) =>
  page.locator('path.leaflet-interactive').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)));

test('the dashboard shows total incidents and how each figure changed since the previous period', async ({ page }) => {
  const calls = await mockApi(page, {
    'GET /sites': sites,
    'GET /dashboard/summary': dashboardSummary({
      cur: { incidents: 12, injuries: 7, trir: 1.25, ltifr: 0.4, actions_total: 8, actions_completed: 6,
        actions_completion_pct: 75, avg_days_to_close: 4.5, hours_worked: 160000, workers: 85, sites_with_hours: 2 },
      prev: { incidents: 9, trir: 2.0, actions_completion_pct: 50, avg_days_to_close: 6 },
    }),
  });
  await signIn(page, { role: 'admin' }); // lands on the admin dashboard
  await expect(page.getByRole('heading', { name: 'Overall SHE Dashboard' })).toBeVisible();
  await expect(page.getByText('Active Incidents')).toHaveCount(0);
  const kpi = (label) => page.locator('.dash-kpi').filter({ has: page.getByText(label, { exact: true }) });
  await expect(kpi('Total incidents')).toContainText('12');
  await expect(kpi('Total incidents')).toContainText('+3 vs Jul – Sep 2026');
  await expect(kpi('Total incidents').locator('.dash-change')).toHaveClass(/bad/);      // more incidents is worse
  await expect(kpi('TRIR (average of sites)')).toContainText('1.25');
  await expect(kpi('TRIR (average of sites)').locator('.dash-change')).toHaveClass(/good/);
  await expect(kpi('Corrective actions completed')).toContainText('75%');
  await expect(kpi('Corrective actions completed')).toContainText('6 of 8 raised in the period');
  await expect(kpi('Average days to close')).toContainText('4.5 days');
  await expect(kpi('Workers')).toContainText('85');
  // quarter against quarter, side by side
  const compare = page.getByRole('table').filter({ hasText: 'Measure' });
  await expect(compare.getByRole('columnheader', { name: 'Jul – Sep 2026' })).toBeVisible();
  await expect(compare.getByRole('row', { name: /^Incidents/ })).toContainText('9');
  expect(calls).toContain('GET /dashboard/summary');
  expect(calls).not.toContain('GET /incidents');
});

test('choosing a site and a period reloads the figures for them and shows the site details', async ({ page }) => {
  const asked = [];
  await mockApi(page, {
    'GET /sites': sites,
    'GET /dashboard/summary': (route, req) => {
      const q = new URL(req.url()).searchParams;
      asked.push(`${q.get('period')}|${q.get('site_id') || ''}`);
      const one = q.get('site_id') === '2';
      return route.fulfill(json(200, dashboardSummary({
        siteId: one ? 2 : null,
        cur: { incidents: one ? 1 : 5, workers: one ? 14 : 40, hours_worked: one ? 2400 : 9000 },
        sites: one
          ? [siteRow({ site_id: 2, name: 'Borrowdale', address: '5 Borrowdale Rd', contact_number: '0772 111 222',
            managers: ['Tendai Moyo'], incidents: 1, workers: 14, hours_worked: 2400 })]
          : [siteRow({ incidents: 4 }), siteRow({ site_id: 2, name: 'Borrowdale', incidents: 1 })],
      })));
    },
  });
  await signIn(page, { role: 'she_team' });
  await expect(page.locator('.dash-kpi').first()).toContainText('5');

  await page.getByLabel('Site', { exact: true }).selectOption({ label: 'Borrowdale' });
  const info = page.getByRole('region', { name: 'Site information' });
  await expect(info).toContainText('5 Borrowdale Rd');
  await expect(info).toContainText('0772 111 222');
  await expect(info).toContainText('Manager: Tendai Moyo');
  await expect(info).toContainText('14 workers');
  await expect(page.getByText(/Showing Borrowdale for/)).toBeVisible();

  await page.getByLabel('Period').selectOption({ label: 'Last quarter' });
  await expect.poll(() => asked.at(-1)).toBe('last_quarter|2');
  await expect(page).toHaveURL(/site=2/);
  await expect(page).toHaveURL(/period=last_quarter/);

  // clicking a site name in the table goes back to all sites
  await page.getByRole('button', { name: 'Borrowdale' }).click();
  await expect.poll(() => asked.at(-1)).toBe('last_quarter|');
  await expect(info).toHaveCount(0);
});

test('incidents are a stacked bar per month by type, with counts in the legend', async ({ page }) => {
  await page.route(/basemaps|openstreetmap|arcgisonline/, (r) => r.abort());
  await mockApi(page, {
    'GET /sites': sites,
    'GET /dashboard/summary': dashboardSummary({
      cur: { incidents: 4 },
      byMonth: [{ month: '2026-10', injury: 2, spill: 1 }, { month: '2026-11', injury: 1 }, { month: '2026-12' }],
      prevByMonth: [{ month: '2026-07', fire: 1 }, { month: '2026-08' }, { month: '2026-09' }],
      sites: [siteRow({ incidents: 3 }), siteRow({ site_id: 2, name: 'Borrowdale', incidents: 1 })],
    }),
  });
  await signIn(page, { role: 'admin' });
  const legend = page.getByRole('list', { name: 'Incident types' });
  await expect(legend).toContainText('Injury (3)');
  await expect(legend).toContainText('Spill (1)');
  await expect(legend).toContainText('Fire (1)');                   // last quarter is shown next to this one
  await expect(page.locator('.recharts-pie')).toHaveCount(0);
  await expect(page.locator('.recharts-bar-rectangles path')).toHaveCount(4); // one segment per type per month
  // map bubbles are sized by the period's incidents at each site
  await expect(page.locator('path.leaflet-interactive')).toHaveCount(2);
  const [a, b] = await bubbleWidths(page);
  expect(a).toBeGreaterThan(b);
});

test('with no incidents the chart says so instead of showing an empty space', async ({ page }) => {
  await mockApi(page, { 'GET /dashboard/summary': dashboardSummary() });
  await signIn(page, { role: 'admin' }); // lands on the admin dashboard
  await expect(page.getByText('No incidents recorded in this period')).toBeVisible();
});

test('the map background comes from a service that needs no account key, with place names on top', async ({ page }) => {
  const tiles = [];
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  await page.route(/arcgisonline|openstreetmap|basemaps/, (r) => { tiles.push(r.request().url()); r.fulfill({ status: 200, contentType: 'image/png', body: png }); });
  await mockApi(page, { 'GET /sites': sites, 'GET /dashboard/summary': dashboardSummary() });
  await signIn(page, { role: 'admin' }); // lands on the admin dashboard
  await expect(page.locator('.leaflet-tile-loaded').first()).toBeAttached();
  expect(tiles.some((u) => u.includes('World_Light_Gray_Base'))).toBe(true);
  expect(tiles.some((u) => u.includes('World_Light_Gray_Reference'))).toBe(true);
  expect(tiles.some((u) => u.includes('cartocdn'))).toBe(false);
  await expect(page.getByText(/couldn't load/)).toHaveCount(0);
  await expect(page.locator('.leaflet-control-attribution')).toContainText('Esri');
});

test('on a narrow screen the open menu sits above the map, and its items can be clicked', async ({ page }) => {
  await page.setViewportSize({ width: 700, height: 720 });
  await page.route(/arcgisonline|openstreetmap|basemaps/, (r) => r.abort());
  await mockApi(page, {
    'GET /sites': sites,
    'GET /dashboard/summary': dashboardSummary({ sites: [siteRow({ incidents: 1 }), siteRow({ site_id: 2, name: 'Borrowdale' })] }),
  });
  await signIn(page, { role: 'admin' });
  const map = page.locator('.leaflet-container');
  await map.scrollIntoViewIfNeeded();

  await page.getByRole('button', { name: 'Open menu' }).click();
  const sidebar = page.locator('#app-sidebar');
  await expect(sidebar).toBeVisible();
  // wait until the menu has finished sliding in
  await expect.poll(async () => Math.round((await sidebar.boundingBox()).x)).toBe(0);

  // every part of the map that lies under the open menu (zoom buttons, site bubbles, the map itself)
  // must be hidden by the menu, not drawn on top of it
  const onTop = await page.evaluate(() => {
    const menu = document.querySelector('#app-sidebar').getBoundingClientRect();
    const parts = [...document.querySelectorAll('.leaflet-control-zoom a, path.leaflet-interactive, .leaflet-container')];
    return parts
      .map((el) => {
        const r = el.getBoundingClientRect();
        const x = Math.min(Math.max(r.left + r.width / 2, r.left + 2), menu.right - 2);
        const y = r.top + r.height / 2;
        if (x < menu.left || x > menu.right || x < r.left || x > r.right || y < menu.top || y > menu.bottom) return null;
        const hit = document.elementFromPoint(x, y);
        return hit && !hit.closest('#app-sidebar') ? el.className.baseVal || el.className || el.tagName : null;
      })
      .filter(Boolean);
  });
  expect(onTop).toEqual([]);

  // a person can click the last menu item even where the map is underneath
  await sidebar.getByRole('link', { name: 'Settings', exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
});
