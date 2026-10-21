// Starts the real backend on an empty SQLite database for the UI tests, seeded with one admin.
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { API_PORT, UI_PORT, ADMIN, BACKEND_DIR, PYTHON } = require('./settings');

if (!fs.existsSync(path.join(BACKEND_DIR, 'main.py'))) {
  console.error(`Backend not found at ${BACKEND_DIR}. Set BACKEND_DIR to your SHE-BACKEND folder.`);
  process.exit(1);
}
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'glow-she-ui-tests-'));
const env = {
  ...process.env,
  BACKEND_DIR,
  DATABASE_URL: `sqlite:///${path.join(work, 'ui-tests.db').replace(/\\/g, '/')}`,
  SECRET_KEY: 'ui-tests-only-secret-key-0123456789abcdef',
  EXTRA_CORS_ORIGINS: `http://127.0.0.1:${UI_PORT}`,
  E2E_ADMIN_EMAIL: ADMIN.email,
  E2E_ADMIN_PASSWORD: ADMIN.password,
  PYTHONUNBUFFERED: '1',
};

const seed = spawnSync(PYTHON, [path.join(__dirname, 'seed_admin.py')], { env, cwd: work, stdio: 'inherit' });
if (seed.status !== 0) process.exit(seed.status || 1);

const server = spawn(PYTHON, ['-m', 'uvicorn', 'main:app', '--app-dir', BACKEND_DIR, '--host', '127.0.0.1', '--port', String(API_PORT)],
  { env, cwd: work, stdio: 'inherit' });
const stop = () => { server.kill(); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
server.on('exit', (code) => process.exit(code || 0));
