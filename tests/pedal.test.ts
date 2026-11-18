import test from 'node:test';
import assert from 'node:assert/strict';
import { pedalKey, pedalStep, atEnd, DEFAULT_PEDAL } from '../src/pages/v2/notes/pedal';

test('down keys always, up keys only with a second pedal', () => {
  for (const k of ['PageDown', 'ArrowDown', 'ArrowRight', ' ', 'Enter', 'MediaTrackNext']) assert.equal(pedalKey(k, DEFAULT_PEDAL), 'down', k);
  for (const k of ['PageUp', 'ArrowUp', 'ArrowLeft', 'MediaTrackPrevious']) {
    assert.equal(pedalKey(k, DEFAULT_PEDAL), null, k);
    assert.equal(pedalKey(k, { ...DEFAULT_PEDAL, back: true }), 'up', k);
  }
  assert.equal(pedalKey('a', { ...DEFAULT_PEDAL, back: true }), null);
  assert.equal(pedalKey('AudioVolumeDown', DEFAULT_PEDAL), null);
});

test('a step is a screen less two lines, or half a screen', () => {
  assert.equal(pedalStep(700, DEFAULT_PEDAL), 652);
  assert.equal(pedalStep(700, { ...DEFAULT_PEDAL, step: 'half' }), 350);
  assert.equal(pedalStep(30, DEFAULT_PEDAL), 0);
});

test('the end is within 4 px of the bottom', () => {
  assert.equal(atEnd(300, 700, 1000), true);
  assert.equal(atEnd(297, 700, 1000), true);
  assert.equal(atEnd(290, 700, 1000), false);
});
