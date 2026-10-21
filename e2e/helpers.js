// The build is made with REACT_APP_API_URL=http://api.test, so every API call can be intercepted here.
const API = 'http://api.test';

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/, '');

// The app only reads the token's payload, so an unsigned one is enough for these tests.
const makeToken = (claims = {}) =>
  `${b64({ alg: 'none' })}.${b64({ sub: 'tester@glow.com', role: 'admin', user_id: 1, site_id: null, tv: 0, ...claims })}.sig`;

const json = (status, body, headers = {}) => ({
  status, contentType: 'application/json', body: JSON.stringify(body),
  headers: { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'X-Total-Count', ...headers },
});

// Every API call is answered here. `routes` maps "METHOD /path" to a body or a function(route, request).
// Anything not listed gets an empty list so pages render instead of hanging.
async function mockApi(page, routes = {}) {
  const calls = [];
  await page.route(`${API}/**`, async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace(/\/$/, '') || '/';
    if (req.method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: {
        'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    }
    calls.push(`${req.method()} ${path}`);
    const handler = routes[`${req.method()} ${path}`];
    if (typeof handler === 'function') return handler(route, req);
    if (handler !== undefined) return route.fulfill(json(200, handler));
    return route.fulfill(json(200, []));
  });
  return calls;
}

// Sign in through the sign-in form, as a person would. The (simulated) server answers with a token for
// `claims`. Call after mockApi so this answer wins.
async function signIn(page, claims = {}) {
  await page.route(`${API}/auth/login`, (route) =>
    route.request().method() === 'OPTIONS'
      ? route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } })
      : route.fulfill(json(200, { access_token: makeToken(claims), token_type: 'bearer' })));
  await page.goto('/login');
  await page.getByLabel('Email Address').fill('tester@glow.com');
  await page.getByLabel('Password').fill('a-password-123');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL((url) => !url.pathname.endsWith('/login'));
}

// A /dashboard/summary answer. `cur` and `prev` override the totals; `sites` are the per-site rows.
const totals = (over = {}) => ({
  incidents: 0, injuries: 0, lost_time_injuries: 0, hours_worked: 0, workers: null, ltifr: null,
  sites_with_hours: 0, sites: 2, uncounted_injuries: 0, months_missing_hours: [], actions_total: 0,
  actions_completed: 0, actions_completion_pct: null, avg_days_to_close: null, ...over,
});
const siteRow = (over = {}) => ({
  site_id: 1, name: 'Msasa Depot', address: '1 Depot Rd', contact_number: '0242 000 000', managers: [],
  incidents: 0, injuries: 0, lost_time_injuries: 0, hours_worked: 0, workers: null, ltifr: null,
  uncounted_injuries: 0, months_missing_hours: [], actions_total: 0, actions_completed: 0,
  actions_completion_pct: null, avg_days_to_close: null, ...over,
});
const dashboardSummary = ({ cur = {}, prev = {}, sites = [], byMonth = [], prevByMonth = [], period = 'quarter', siteId = null } = {}) => ({
  period, period_name: 'This quarter', site_id: siteId,
  current: { start: '2026-10-01', end: '2026-12-01', label: 'Oct – Dec 2026', totals: totals(cur), by_type: [],
    by_month: byMonth.length ? byMonth : [{ month: '2026-10' }, { month: '2026-11' }, { month: '2026-12' }], sites },
  previous: { start: '2026-07-01', end: '2026-09-01', label: 'Jul – Sep 2026', totals: totals(prev), by_type: [],
    by_month: prevByMonth.length ? prevByMonth : [{ month: '2026-07' }, { month: '2026-08' }, { month: '2026-09' }], sites: [] },
});

module.exports = { API, json, makeToken, mockApi, signIn, dashboardSummary, siteRow };
