import { initSession, startAutosave } from './session';
import { startSiteHistory } from './siteHistory';
import { initSiteSession, startSiteAutosave } from './siteSession';

/**
 * Loads the stored plan and template (and a shared link), then saves both as they change and records the
 * template's undo history. Returns a function that stops all of it, flushing pending saves; stopping
 * before loading finished just skips starting.
 */
export function startSessions(): () => void {
  let stop: (() => void) | undefined;
  let stopSite: (() => void) | undefined;
  let stopHistory: (() => void) | undefined;
  let cancelled = false;
  void initSession().then(() => {
    if (!cancelled) stop = startAutosave();
  });
  void initSiteSession().then(() => {
    if (cancelled) return;
    stopSite = startSiteAutosave();
    // Loading the stored template is not an undo step.
    stopHistory = startSiteHistory();
  });
  return () => {
    cancelled = true;
    stop?.();
    stopSite?.();
    stopHistory?.();
  };
}
