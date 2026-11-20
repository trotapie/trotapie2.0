import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAdminIdleSession, isAdminUrl, readSessionId} from '../src/app/core/utils/admin-idle-session.ts';

const minute = 60_000;
const warningAt = 29 * minute;

function setup() {
  let now = 0;
  const storage = new Map();
  const windows = [];

  function tab(inAdmin = () => true) {
    const window = new EventTarget();
    window.document = Object.assign(new EventTarget(), {hidden: false});
    const timers = new Map();
    const states = [];
    window.setTimeout = (callback, delay) => {
      const id = Symbol();
      timers.set(id, {callback, due: now + delay});
      return id;
    };
    window.clearTimeout = id => timers.delete(id);
    window.localStorage = {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => {
        storage.set(key, value);
        for (const other of windows) {
          if (other.window !== window) {
            other.window.dispatchEvent(Object.assign(new Event('storage'), {key}));
          }
        }
      },
    };
    const idle = createAdminIdleSession(window, inAdmin, state => states.push(state), () => now);
    const result = {window, idle, timers, states, type(trusted = true) {
      const event = new Event('keydown', {cancelable: true});
      Object.defineProperty(event, 'isTrusted', {value: trusted});
      return window.document.dispatchEvent(event);
    }};
    windows.push(result);
    return result;
  }

  return {tab, advance(time, runTimers = true) {
    now += time;
    if (!runTimers) return;
    for (const {timers} of windows) {
      for (const [id, {callback, due}] of [...timers]) {
        if (due <= now && timers.delete(id)) callback();
      }
    }
  }};
}

test('the panel warns at minute 29 and expires at minute 30', () => {
  const clock = setup();
  const tab = clock.tab();
  assert.equal(tab.idle.start('session'), 'active');
  clock.advance(warningAt - 1);
  assert.deepEqual(tab.states, ['active']);
  clock.advance(1);
  assert.deepEqual(tab.states, ['active', 'warning']);
  clock.advance(minute - 1);
  assert.equal(tab.idle.check(), 'warning');
  clock.advance(1);
  assert.equal(tab.idle.check(), 'expired');
  assert.equal(tab.idle.keepAlive(), 'expired');
  assert.deepEqual(tab.states, ['active', 'warning', 'expired']);
});

test('real activity extends the deadline before the warning; continuing dismisses it in both tabs', () => {
  const clock = setup();
  const first = clock.tab();
  const second = clock.tab();
  first.idle.start('same-session');
  second.idle.start('same-session');
  clock.advance(120_000);
  first.type();
  clock.advance(warningAt);
  assert.equal(first.states.at(-1), 'warning');
  assert.equal(second.states.at(-1), 'warning');
  clock.advance(30_000);
  second.type();
  assert.equal(second.states.at(-1), 'warning');
  first.idle.keepAlive();
  assert.equal(first.states.at(-1), 'active');
  assert.equal(second.states.at(-1), 'active');
  clock.advance(30 * minute);
  assert.equal(first.states.at(-1), 'expired');
  assert.equal(second.states.at(-1), 'expired');
});

test('activity outside the panel, in a hidden tab or from synthetic events does not extend the deadline', () => {
  const clock = setup();
  let inAdmin = false;
  const tab = clock.tab(() => inAdmin);
  tab.idle.start('session');
  clock.advance(100_000);
  tab.type();
  inAdmin = true;
  tab.window.document.hidden = true;
  tab.type();
  tab.window.document.hidden = false;
  tab.type(false);
  clock.advance(30 * minute - 100_000);
  assert.equal(tab.states.at(-1), 'expired');
});

test('reloading does not extend the deadline; a new login has a fresh deadline', () => {
  const clock = setup();
  const first = clock.tab();
  first.idle.start('previous');
  clock.advance(warningAt + 30_000);
  first.idle.stop();
  const second = clock.tab();
  assert.equal(second.idle.start('previous'), 'warning');
  clock.advance(30_000);
  assert.equal(second.states.at(-1), 'expired');
  assert.equal(second.idle.start('new'), 'active');
});

test('the first input after the device wakes cannot revive or use an expired session', () => {
  const clock = setup();
  const tab = clock.tab();
  tab.idle.start('session');
  clock.advance(40 * minute, false);
  assert.equal(tab.type(), false);
  assert.deepEqual(tab.states, ['active', 'expired']);
});

test('only admin URLs are tracked and auth token refreshes reuse the same session ID', () => {
  assert.equal(isAdminUrl('/admin?test=1'), true);
  assert.equal(isAdminUrl('/admin/catalogos#title'), true);
  assert.equal(isAdminUrl('/administer'), false);
  assert.equal(isAdminUrl('/vista-previa/dashboard'), false);
  const token = claims => `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`;
  assert.equal(readSessionId(token({session_id: 'same', exp: 3})), 'same');
  assert.equal(readSessionId(token({session_id: 'same', exp: 9})), 'same');
  assert.equal(readSessionId('not-a-jwt'), undefined);
});
