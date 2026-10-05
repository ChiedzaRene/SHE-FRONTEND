const { test, expect } = require('@playwright/test');
const { json, mockApi, signIn } = require('./helpers');

test('the admin dashboard uses the small summary instead of downloading every incident', async ({ page }) => {
  const calls = await mockApi(page, {
    'GET /incidents/summary': { total: 12, open: 5, by_type: [{ name: 'injury', value: 7 }, { name: 'spill', value: 5 }] },
    'GET /incidents/metrics/global': { trir: 0.4, ltifr: 0.1, total_incidents: 12 },
  });
  await signIn(page, { role: 'admin' }); // lands on the admin dashboard
  await expect(page.getByText('Overall SHE Dashboard')).toBeVisible();
  await expect(page.getByText('5', { exact: true }).first()).toBeVisible(); // open incidents
  expect(calls).toContain('GET /incidents/summary');
  expect(calls).not.toContain('GET /incidents');
});

const sites = [
  { id: 1, name: 'Msasa Depot', latitude: -17.8, longitude: 31.0 },
  { id: 2, name: 'Borrowdale', latitude: -17.7, longitude: 31.1 },
];

const bubbleWidths = (page) =>
  page.locator('path.leaflet-interactive').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)));

test('map bubbles are sized by all incidents at each site, and the chart lists counts', async ({ page }) => {
  await page.route(/basemaps|openstreetmap|arcgisonline/, (r) => r.abort());
  await mockApi(page, {
    'GET /sites': sites,
    'GET /incidents/summary': { total: 4, open: 4, by_type: [{ name: 'injury', value: 3 }, { name: 'spill', value: 1 }],
      by_site: [{ site_id: 1, value: 3 }, { site_id: 2, value: 1 }] },
    // the 12-month figures would say 0 for both: the bubbles must not use them
    'GET /incidents/metrics/by-site': [{ site_id: 1, total_incidents: 0 }, { site_id: 2, total_incidents: 0 }],
  });
  await signIn(page, { role: 'admin' }); // lands on the admin dashboard
  await expect(page.getByText('injury (3)')).toBeVisible();
  await expect(page.locator('path.leaflet-interactive')).toHaveCount(2);
  const [a, b] = await bubbleWidths(page);
  expect(a).toBeGreaterThan(b);
});

test('the dashboard still works against an older server without the summary', async ({ page }) => {
  await page.route(/basemaps|openstreetmap|arcgisonline/, (r) => r.abort());
  await mockApi(page, {
    'GET /sites': sites,
    'GET /incidents/summary': (route) => route.fulfill(json(422, { detail: [{ msg: 'value is not a valid integer' }] })),
    'GET /incidents': [
      { id: 1, site_id: 1, type: 'injury', resolved: false }, { id: 2, site_id: 1, type: 'injury', resolved: true },
      { id: 3, site_id: 2, type: 'spill', resolved: false },
    ],
  });
  await signIn(page, { role: 'admin' }); // lands on the admin dashboard
  await expect(page.getByText('injury (2)')).toBeVisible();
  await expect(page.getByText('spill (1)')).toBeVisible();
  await expect(page.locator('path.leaflet-interactive')).toHaveCount(2);
});

test('with no incidents the chart says so instead of showing an empty space', async ({ page }) => {
  await mockApi(page, { 'GET /incidents/summary': { total: 0, open: 0, by_type: [], by_site: [] } });
  await signIn(page, { role: 'admin' }); // lands on the admin dashboard
  await expect(page.getByText('No incidents recorded yet')).toBeVisible();
});

test('the map background comes from a service that needs no account key, with place names on top', async ({ page }) => {
  const tiles = [];
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  await page.route(/arcgisonline|openstreetmap|basemaps/, (r) => { tiles.push(r.request().url()); r.fulfill({ status: 200, contentType: 'image/png', body: png }); });
  await mockApi(page, { 'GET /sites': sites, 'GET /incidents/summary': { total: 0, open: 0, by_type: [], by_site: [] } });
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
    'GET /incidents/summary': { total: 1, open: 1, by_type: [{ name: 'spill', value: 1 }], by_site: [{ site_id: 1, value: 1 }] },
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
