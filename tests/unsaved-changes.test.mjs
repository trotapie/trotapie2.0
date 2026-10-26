import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createUnsavedChangesProtection} from '../src/app/core/utils/unsaved-changes.ts';

class TestWindow extends EventTarget {
  answer = false;
  prompts = 0;
  listeners = 0;
  confirm() { this.prompts++; return this.answer; }
  addEventListener(...args) { this.listeners++; super.addEventListener(...args); }
  removeEventListener(...args) { this.listeners--; super.removeEventListener(...args); }
}

test('a clean form leaves without a prompt or unload listener', () => {
  const window = new TestWindow();
  const protection = createUnsavedChangesProtection(window, () => false);
  protection.sync();
  assert.equal(window.listeners, 0);
  assert.equal(protection.confirm(), true);
  assert.equal(window.prompts, 0);
});

test('cancel keeps the form pending, accepting leaves without modifying its data', () => {
  const window = new TestWindow();
  const model = {text: 'Pending'};
  const protection = createUnsavedChangesProtection(window, () => true);
  assert.equal(protection.confirm(), false);
  window.answer = true;
  assert.equal(protection.confirm(), true);
  assert.deepEqual(model, {text: 'Pending'});
  assert.equal(window.prompts, 2);
});

test('unload listener is attached once, removed after save, and cleaned up on destruction', () => {
  const window = new TestWindow();
  let dirty = true;
  const protection = createUnsavedChangesProtection(window, () => dirty);
  protection.sync();
  protection.sync();
  assert.equal(window.listeners, 1);
  const pendingUnload = new Event('beforeunload', {cancelable: true});
  window.dispatchEvent(pendingUnload);
  assert.equal(pendingUnload.defaultPrevented, true);
  dirty = false;
  protection.sync();
  assert.equal(window.listeners, 0);
  assert.equal(protection.confirm(), true);
  dirty = true;
  protection.sync();
  protection.destroy();
  assert.equal(window.listeners, 0);
});

test('an ongoing save blocks navigation without asking to discard', () => {
  const window = new TestWindow();
  const protection = createUnsavedChangesProtection(window, () => false, () => true);
  assert.equal(protection.confirm(), false);
  assert.equal(window.prompts, 0);
  protection.sync();
  const event = new Event('beforeunload', {cancelable: true});
  window.dispatchEvent(event);
  assert.equal(event.defaultPrevented, true);
});

test('a modal checks its own pending data without discarding the parent form', () => {
  const window = new TestWindow();
  const protection = createUnsavedChangesProtection(window, () => true);
  assert.equal(protection.confirm(() => false), true);
  assert.equal(window.prompts, 0);
  assert.equal(protection.confirm(), false);
});

test('a non-browser context allows clean forms but does not silently discard edits', () => {
  assert.equal(createUnsavedChangesProtection(null, () => false).confirm(), true);
  const protection = createUnsavedChangesProtection(null, () => true);
  protection.sync();
  assert.equal(protection.confirm(), false);
  protection.destroy();
});
