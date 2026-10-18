const { test, expect } = require('@playwright/test');
const { json, mockApi, signIn } = require('./helpers');
const { makePdf } = require('./pdf');

const PDF = makePdf('Confidential findings');
const file = (over = {}) => ({
  id: 1, title: 'Audit findings', description: 'Read before Friday', filename: 'findings.pdf',
  content_type: 'application/pdf', size: PDF.length, view_only: true, audience: ['site_manager'], site_id: null,
  site_name: null, uploaded_by: 4, uploaded_by_name: 'Rudo Chikore', created_at: new Date().toISOString(),
  can_view: true, can_download: false, can_delete: false, ...over,
});

test('the SHE team shares a file with site managers of one site and makes it view only', async ({ page }) => {
  let sent = null;
  await mockApi(page, {
    'GET /sites': [{ id: 1, name: 'Msasa Depot' }, { id: 2, name: 'Borrowdale' }],
    'GET /she-files': [],
    'POST /she-files': (route, req) => {
      sent = req.postDataBuffer().toString('latin1');
      return route.fulfill(json(201, file({ uploaded_by: 1, uploaded_by_name: 'tester@glow.com', site_id: 2, site_name: 'Borrowdale', can_download: true, can_delete: true })));
    },
  });
  await signIn(page, { role: 'she_team' });
  await page.locator('#app-sidebar').getByRole('link', { name: 'SHE Files' }).click();
  await page.getByRole('button', { name: 'Share a file' }).click();
  const form = page.getByRole('form', { name: 'Share a file' });

  // a Word document can't be view only: it can't be opened in the app
  await form.getByLabel('File').setInputFiles({ name: 'policy.docx', mimeType: 'application/octet-stream', buffer: Buffer.from('PK') });
  await expect(form.getByRole('checkbox', { name: /View only/ })).toBeDisabled();
  await expect(form).toContainText('Only PDFs and images can be view only');

  await form.getByLabel('File').setInputFiles({ name: 'findings.pdf', mimeType: 'application/pdf', buffer: PDF });
  await form.getByLabel('Title').fill('Audit findings');
  await form.getByLabel('Note (optional)').fill('Read before Friday');
  await form.getByLabel('Which site managers?').selectOption({ label: 'Borrowdale only' });
  await form.getByRole('checkbox', { name: /View only/ }).check();
  await form.getByRole('button', { name: 'Share file' }).click();

  await expect(page.getByText('"Audit findings" shared')).toBeVisible();
  for (const part of ['name="title"\r\n\r\nAudit findings', 'name="audience"\r\n\r\nsite_manager', 'name="site_id"\r\n\r\n2',
    'name="view_only"\r\n\r\ntrue', 'filename="findings.pdf"']) expect(sent).toContain(part);
  const row = page.locator('.files-row').first();
  await expect(row).toContainText('View only');
  await expect(row).toContainText('for Site managers (Borrowdale)');
});

test('a site manager opens a view-only file in the app, with no way to download it', async ({ page }) => {
  await mockApi(page, {
    'GET /she-files': [file(), file({ id: 2, title: 'Permit form', filename: 'permit.docx', content_type: 'application/msword',
      view_only: false, can_view: false, can_download: true, description: null })],
    'GET /she-files/1/view': (route) => route.fulfill({ status: 200, contentType: 'application/pdf', body: PDF,
      headers: { 'access-control-allow-origin': '*' } }),
    'GET /notifications': { unread: 1, items: [{ id: 9, kind: 'file_shared', title: 'New SHE file: Audit findings', message: 'Rudo Chikore shared findings.pdf (view only)',
      link: '/she-files', resource: 'she_files', resource_id: 1, created_at: new Date().toISOString(), read_at: null }] },
  });
  await signIn(page, { role: 'site_manager', site_id: 1, full_name: 'Tendai Moyo' });
  await page.locator('#app-sidebar').getByRole('link', { name: 'SHE Files' }).click();
  await expect(page.getByRole('heading', { name: 'SHE Files' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Share a file' })).toHaveCount(0);   // managers receive, they don't share

  const restricted = page.locator('.files-row').filter({ hasText: 'Audit findings' });
  await expect(restricted.getByText('NEW', { exact: true })).toBeVisible();
  await expect(restricted.getByRole('button', { name: 'Download Audit findings' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Download Permit form' })).toBeVisible();     // an ordinary file
  await expect(page.getByRole('button', { name: 'Open Permit form' })).toHaveCount(0);        // Word files are downloaded

  await restricted.getByRole('button', { name: 'Open Audit findings' }).click();
  const viewer = page.getByRole('dialog', { name: 'Audit findings' });
  await expect(viewer.getByRole('img', { name: 'Page 1 of 1' })).toBeVisible();              // drawn by the app, not the browser's PDF viewer
  await expect(viewer.getByRole('button', { name: 'Download' })).toHaveCount(0);
  await expect(viewer.locator('iframe, embed, object')).toHaveCount(0);
  await expect(viewer.locator('.viewer-watermark')).toContainText('Tendai Moyo');
  // the page is really drawn (not blank)
  const inked = await viewer.locator('canvas').evaluate((c) => {
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let dark = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] < 128) dark += 1;
    return dark;
  });
  expect(inked).toBeGreaterThan(100);
  await page.keyboard.press('Escape');
  await expect(viewer).toHaveCount(0);
});

test('a file that may be downloaded is saved with its own name', async ({ page }) => {
  await mockApi(page, {
    'GET /she-files': [file({ view_only: false, can_download: true })],
    'GET /she-files/1/download': (route) => route.fulfill({ status: 200, contentType: 'application/pdf', body: PDF,
      headers: { 'access-control-allow-origin': '*' } }),
  });
  await signIn(page, { role: 'site_manager', site_id: 1 });
  await page.goto('/she-files');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download Audit findings' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('findings.pdf');
});
