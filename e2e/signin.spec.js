const { test, expect } = require('@playwright/test');
const { json, mockApi, signIn } = require('./helpers');

async function fillAndSubmit(page) {
  await page.getByPlaceholder(/manager@/).fill('someone@glow.com');
  await page.getByPlaceholder('••••••••').fill('whatever-123');
  await page.getByRole('button', { name: 'Sign In' }).click();
}

test('wrong password shows the server message and stays on the sign-in page', async ({ page }) => {
  await mockApi(page, { 'POST /auth/login': (route) => route.fulfill(json(401, { detail: 'Incorrect email or password' })) });
  await page.goto('/login');
  await fillAndSubmit(page);
  await expect(page.getByText('Incorrect email or password')).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test('too many attempts tells the user to wait', async ({ page }) => {
  await mockApi(page, { 'POST /auth/login': (route) => route.fulfill(json(429, { detail: 'Too many failed attempts for this account. Please wait 5 minute(s) and try again.' })) });
  await page.goto('/login');
  await fillAndSubmit(page);
  await expect(page.getByText(/wait 5 minute/)).toBeVisible();
});

test('server unreachable says so instead of "wrong password"', async ({ page }) => {
  await mockApi(page, { 'POST /auth/login': (route) => route.abort('failed') });
  await page.goto('/login');
  await fillAndSubmit(page);
  await expect(page.getByText(/Can't reach the server/)).toBeVisible();
  await expect(page.getByText(/Invalid email or password/)).toHaveCount(0);
});

test('an expired session returns to sign-in with an explanation', async ({ page }) => {
  await signIn(page, { role: 'admin' });
  await mockApi(page, { 'GET /incidents/summary': (route) => route.fulfill(json(401, { detail: 'Could not validate credentials' })) });
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText('Your session has expired. Please sign in again.')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
});

test('a successful sign-in goes to the role dashboard', async ({ page }) => {
  const { makeToken } = require('./helpers');
  await mockApi(page, { 'POST /auth/login': { access_token: makeToken({ role: 'she_team' }), token_type: 'bearer' } });
  await page.goto('/login');
  await fillAndSubmit(page);
  await expect(page).toHaveURL(/\/she-dashboard$/);
});
