// Builds the app pointing at the fake API host the tests intercept (works on Windows, Mac and Linux).
const { spawnSync } = require('child_process');
const r = spawnSync('npx', ['react-scripts', 'build'], {
  stdio: 'inherit', shell: true, env: { ...process.env, REACT_APP_API_URL: 'http://api.test', CI: 'false' },
});
process.exit(r.status === null ? 1 : r.status);
