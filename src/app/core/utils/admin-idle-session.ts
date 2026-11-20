export const ADMIN_IDLE_LIMIT_MS = 30 * 60_000;
export const ADMIN_IDLE_WARNING_MS = 60_000;
export const ADMIN_IDLE_REASON = 'inactividad';
export type IdleState = 'active' | 'warning' | 'expired';

const activityKey = 'trotapie-admin-activity';

export function isAdminUrl(url: string) {
  const path = url.split(/[?#]/, 1)[0];
  return path === '/admin' || path.startsWith('/admin/');
}

// Used only to group activity across tabs, not to authenticate the JWT.
export function readSessionId(token: string): string | undefined {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.session_id === 'string' && payload.session_id ? payload.session_id : undefined;
  } catch {
    return undefined;
  }
}

export function createAdminIdleSession(
  window: Window,
  inAdmin: () => boolean,
  onState: (state: IdleState, sessionId: string) => void,
  now = Date.now,
) {
  let sessionId: string | undefined;
  let lastActivity = 0;
  let state: IdleState = 'active';
  let timer: number | undefined;

  function readActivity() {
    try {
      const value = JSON.parse(window.localStorage.getItem(activityKey) ?? 'null');
      if (value?.sessionId === sessionId && Number.isFinite(value.lastActivity)) {
        return value.lastActivity as number;
      }
    } catch { /* The timer still works in memory when storage is unavailable. */ }
    return undefined;
  }

  function saveActivity() {
    try {
      window.localStorage.setItem(activityKey, JSON.stringify({sessionId, lastActivity}));
    } catch { /* Keep the in-memory timestamp. */ }
  }

  function check(renew?: 'activity' | 'confirm'): IdleState {
    window.clearTimeout(timer);
    if (!sessionId || state === 'expired') return state;

    const currentTime = now();
    lastActivity = Math.max(lastActivity, readActivity() ?? lastActivity);
    let remaining = ADMIN_IDLE_LIMIT_MS - (currentTime - lastActivity);
    if (remaining > 0 && (renew === 'confirm' || (renew === 'activity' && remaining > ADMIN_IDLE_WARNING_MS))) {
      lastActivity = currentTime;
      saveActivity();
      remaining = ADMIN_IDLE_LIMIT_MS;
    }

    const next = remaining <= 0 ? 'expired' : remaining <= ADMIN_IDLE_WARNING_MS ? 'warning' : 'active';
    if (next !== state) {
      state = next;
      onState(next, sessionId);
    }
    if (next !== 'expired') {
      timer = window.setTimeout(() => check(), next === 'warning' ? remaining : remaining - ADMIN_IDLE_WARNING_MS);
    }
    return next;
  }

  const wake = () => check();
  const storageChanged = (event: StorageEvent) => {
    if (event.key === activityKey || event.key === null) check();
  };
  const activity = (event: Event) => {
    if (!event.isTrusted || window.document.hidden || !inAdmin()) return;
    if (check('activity') === 'expired') {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };
  const activityEvents = ['pointerdown', 'keydown', 'input', 'click'];

  function stop() {
    window.clearTimeout(timer);
    window.removeEventListener('storage', storageChanged);
    window.removeEventListener('pageshow', wake);
    window.removeEventListener('focus', wake);
    window.document.removeEventListener('visibilitychange', wake);
    for (const event of activityEvents) window.document.removeEventListener(event, activity, true);
    sessionId = undefined;
    state = 'active';
  }

  return {
    start(id: string) {
      if (sessionId !== id) {
        stop();
        sessionId = id;
        const storedActivity = readActivity();
        lastActivity = storedActivity ?? now();
        if (storedActivity === undefined) saveActivity();
        window.addEventListener('storage', storageChanged);
        window.addEventListener('pageshow', wake);
        window.addEventListener('focus', wake);
        window.document.addEventListener('visibilitychange', wake);
        for (const event of activityEvents) window.document.addEventListener(event, activity, true);
        onState('active', id);
      }
      return check();
    },
    check: () => check(),
    keepAlive: () => check('confirm'),
    stop,
  };
}
