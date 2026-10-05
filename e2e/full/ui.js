// Small helpers that act the way a person does: through the sign-in form, the menu and the buttons.
const { expect } = require('@playwright/test');

async function signIn(page, email, password) {
  await page.goto('/login');
  await page.getByLabel('Email Address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
}

async function signOut(page) {
  if (page.viewportSize().width <= 900) await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page).toHaveURL(/\/login$/);
}

// Click an item in the side menu (opening it first on a phone)
async function openMenu(page, label) {
  // phones and tablets (up to 900px wide) show the menu behind a button
  if (page.viewportSize().width <= 900) await page.getByRole('button', { name: 'Open menu' }).click();
  await page.locator('#app-sidebar').getByRole('link', { name: label, exact: true }).click();
}

// Choose your own password after signing in with a temporary one
async function chooseOwnPassword(page, temporary, chosen) {
  await expect(page).toHaveURL(/\/settings$/);
  await page.getByLabel('Temporary password (from your administrator)').fill(temporary);
  await page.getByLabel('New password', { exact: true }).fill(chosen);
  await page.getByLabel('Confirm new password').fill(chosen);
  await page.getByRole('button', { name: 'Change password' }).click();
  // the app moves on to the person's dashboard and confirms the change there
  await expect(page.locator('.toast').filter({ hasText: 'Password changed. You can now use Glow SHE.' })).toBeVisible();
  await expect(page).not.toHaveURL(/\/settings$/);
}

const toast = (page, text) => page.locator('.toast').filter({ hasText: text });

// yyyy-mm-ddThh:mm for a datetime-local box, `daysAgo` days back at 09:30
function localDateTime(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(9, 30, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return { value: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T09:30`, month: `${d.getFullYear()}-${pad(d.getMonth() + 1)}` };
}

module.exports = { signIn, signOut, openMenu, chooseOwnPassword, toast, localDateTime };
