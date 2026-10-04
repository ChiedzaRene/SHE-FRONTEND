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

async function signIn(page, claims) {
  const token = makeToken(claims);
  // only on the first page load, so a later sign-out (token removed) isn't undone by the next navigation
  await page.addInitScript((t) => { if (!sessionStorage.getItem('e2e_seeded')) { sessionStorage.setItem('e2e_seeded', '1'); localStorage.setItem('token', t); } }, token);
  return token;
}

module.exports = { API, json, makeToken, mockApi, signIn };
