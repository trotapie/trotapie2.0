import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ChangeTracker, changeSnapshot} from '../src/app/core/utils/change-snapshot.ts';

test('does not flag loading as an unsaved form', () => {
  const changes = new ChangeTracker();
  assert.equal(changes.hasChanges({name: ''}), false);
});

test('detects nested edits on the same mutable model and recognizes reverting them', () => {
  const model = {name: 'Hotel', rooms: [{adults: 2, ages: [5]}]};
  const changes = new ChangeTracker();
  changes.capture(model);
  assert.equal(changes.hasChanges(model), false);
  model.rooms[0].ages[0] = 8;
  assert.equal(changes.hasChanges(model), true);
  model.rooms[0].ages[0] = 5;
  assert.equal(changes.hasChanges(model), false);
});

test('only accepting a new saved snapshot clears changes', () => {
  const changes = new ChangeTracker();
  changes.capture({text: 'Original'});
  const edited = {text: 'Edited'};
  assert.equal(changes.hasChanges(edited), true);
  assert.equal(changes.hasChanges(edited), true);
  changes.capture(edited);
  assert.equal(changes.hasChanges(edited), false);
  assert.equal(changes.hasChanges({text: 'Later edit'}), true);
});

test('snapshots retain ordering, booleans and empty values', () => {
  assert.notEqual(changeSnapshot([1, 2]), changeSnapshot([2, 1]));
  assert.notEqual(changeSnapshot({active: false}), changeSnapshot({active: true}));
  assert.notEqual(changeSnapshot({id: null}), changeSnapshot({id: ''}));
  assert.equal(changeSnapshot(undefined), '');
});

test('a partial save accepts only persisted fields, not other pending edits', () => {
  const model = {text: 'Original', images: [{id: 1, title: 'Old'}]};
  const changes = new ChangeTracker();
  changes.capture(model);
  model.text = 'Unsaved text';
  model.images[0].title = 'Saved image';
  changes.acceptSaved(saved => { saved.images[0].title = 'Saved image'; });
  assert.equal(changes.hasChanges(model), true);
  model.text = 'Original';
  assert.equal(changes.hasChanges(model), false);
});
