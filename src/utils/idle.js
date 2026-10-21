// Signing people out after a period without activity.
// The limit can be changed without touching code: set REACT_APP_IDLE_MINUTES in Netlify (default 30).
const configured = Number(process.env.REACT_APP_IDLE_MINUTES);
export const IDLE_MINUTES = Number.isFinite(configured) && configured >= 2 ? configured : 30;
export const IDLE_MS = IDLE_MINUTES * 60 * 1000;
export const WARNING_MS = 60 * 1000; // the "you'll be signed out" box shows for the last minute

// Shared by every open tab, so working in one tab keeps the others signed in too
const KEY = 'last_activity';

export const markActive = (at = Date.now()) => {
  try { localStorage.setItem(KEY, String(at)); } catch (e) { /* storage blocked */ }
};

export const lastActive = () => {
  try {
    const v = Number(localStorage.getItem(KEY));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch (e) {
    return null;
  }
};

export const clearActivity = () => {
  try { localStorage.removeItem(KEY); } catch (e) { /* storage blocked */ }
};

export const idleNotice = () =>
  `You were signed out after ${IDLE_MINUTES} minutes without activity. Please sign in again.`;
