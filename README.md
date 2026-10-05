# SHE Dashboard - Frontend

React app for the Glow Petroleum Safety, Health & Environment dashboard. It talks to the
SHE backend API.

## Development

```bash
npm ci
echo "REACT_APP_API_URL=http://localhost:8000" > .env.local
npm start          # http://localhost:3000
npm run build
```

* Pages are lazy-loaded per route (`src/App.js`).
* TRIR / LTIFR come from the server; a site with no hours entered shows **N/A**. Hours are
  entered on the **Hours Worked** page (SHE team and admins).
* **Reports** page: monthly performance, compliance status, incident register and site comparison,
  viewable on screen or downloaded as PDF / CSV. Site managers see only their own site.
* **Settings** page: *My account* (everyone: name and password), *Safety targets* (admins: the TRIR/LTIFR
  warning limits the dashboards and reports use) and *Audit log* (super admins: pick a person to see everything they did and when).
* A user on a temporary password (new account, or reset by an admin) is sent to **Settings > My account**
  and cannot use anything else until they choose their own password. Changing a password signs the user out
  of their other devices.
* On screens up to 900px wide the sidebar becomes a slide-in menu opened from a top bar (`components/Layout.js`,
  the RESPONSIVE section of `index.css`).
* The dashboard site map is one shared component (`components/SitesMap.js`): it zooms to fit the sites, falls
  back from the Carto to the OpenStreetMap background (and shows a message if neither loads), and lists any
  site that has no coordinates.
* The list of sites is cached for 60 seconds across pages (`src/api/endpoints.js`).

---

# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

## Signing out after inactivity

People are signed out after **30 minutes** without mouse, keyboard, touch or scrolling, with a one-minute "Are you still there?" warning first. Coming back to a closed browser after longer than that also means signing in again, and signing out in one tab signs out the others. To change the limit, set `REACT_APP_IDLE_MINUTES` (e.g. `15`) in Netlify's environment variables and redeploy. Separately, every sign-in ends after 8 hours (`ACCESS_TOKEN_EXPIRE_MINUTES` on the server).

## UI tests

The app is tested the way people use it: signing in through the sign-in form, clicking the menu, filling in forms and checking what appears on screen. Nothing skips the screens.

**Real-server tests** (`e2e/full/`) start the real backend on a fresh, empty database (one admin account is created to begin with) and walk through a working day: the admin adds sites and users; a site manager signs in with a temporary password, chooses their own and logs an incident; the SHE officer enters hours and sees TRIR/LTIFR; the admin reads the incident, runs a report, resets a password, deactivates an account and checks the audit log; plus the phone menu and the account lock after repeated wrong passwords.

They need the backend folder next to this one (or set `BACKEND_DIR`) with its Python packages installed:

```
npx playwright install chromium     # first time only
npm run build:ui-tests
npm run ui-tests
```

In PowerShell, if the backend is somewhere else: `$env:BACKEND_DIR = "C:\path\to\SHE-BACKEND"` before `npm run ui-tests`.

**Simulated-server tests** (`e2e/*.spec.js`) cover what a real server can't do on demand: being unreachable, very slow, or an older version. They still drive the screens.

```
npm run build:ui-tests:simulated
npm run ui-tests:simulated
```

Both run automatically on every pull request (see `.github/workflows/ci.yml`). When the real-server tests fail there, the report with screenshots is attached to the run as `ui-test-report`.
