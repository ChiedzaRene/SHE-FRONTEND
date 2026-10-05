const path = require('path');

module.exports = {
  API_PORT: 8001,
  UI_PORT: 4174,
  ADMIN: { email: 'grace.admin@glowtest.com', password: 'Admin-pass-123', name: 'Grace Admin' },
  BACKEND_DIR: path.resolve(process.env.BACKEND_DIR || path.join(__dirname, '..', '..', '..', 'SHE-BACKEND')),
  PYTHON: process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3'),
};
