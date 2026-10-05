// Builds the app for the browser tests (works on Windows, Mac and Linux).
//   node e2e/build.js        -> build/       pointed at the fake API the simulated-server tests intercept
//   node e2e/build.js full   -> build-full/  pointed at the real test backend
const { spawnSync } = require('child_process');
const full = process.argv[2] === 'full';
const env = { ...process.env, CI: 'false' };
if (full) {
  const { API_PORT } = require('./full/settings');
  env.REACT_APP_API_URL = `http://127.0.0.1:${API_PORT}`;
  env.BUILD_PATH = 'build-full';
} else {
  env.REACT_APP_API_URL = 'http://api.test';
}
const r = spawnSync('npx', ['react-scripts', 'build'], { stdio: 'inherit', shell: true, env });
process.exit(r.status === null ? 1 : r.status);
