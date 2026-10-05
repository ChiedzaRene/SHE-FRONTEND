import { useEffect, useState } from "react";
import { settingsApi } from "../api/endpoints";

// Used until the server answers (or if it can't be reached): the original fixed limits.
export const DEFAULT_TARGETS = { trir_limit: 1.5, ltifr_limit: 0.5 };

let pending = null; // one shared request, so every screen on a page load doesn't ask again

const load = () => {
  if (!pending) {
    pending = settingsApi
      .getTargets()
      .then((res) => res.data)
      .catch((err) => {
        pending = null; // never cache a failure
        throw err;
      });
  }
  return pending;
};

// Call after saving new limits so the dashboards pick them up straight away
export const invalidateSafetyTargets = () => {
  pending = null;
};

// The TRIR / LTIFR limits set by an admin in Settings > Safety targets
export default function useSafetyTargets() {
  const [targets, setTargets] = useState(DEFAULT_TARGETS);
  useEffect(() => {
    let alive = true;
    load()
      .then((t) => alive && setTargets(t))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return targets;
}
