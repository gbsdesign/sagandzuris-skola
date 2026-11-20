// npx tsx --test tests/backToClose.test.ts
// The phone's back closes what is open (utils/backToClose.ts), tried on a small stand-in for the browser's history.
import test from 'node:test';
import assert from 'node:assert/strict';
import { leaveOverlaySteps, openOverlay, overlaySteps } from '../src/utils/backToClose';

type Pop = (e: { state: unknown }) => void;
const listeners: Pop[] = [];

class FakeHistory {
  entries: { state: unknown }[] = [{ state: null }];
  idx = 0;
  get state() { return this.entries[this.idx].state; }
  pushState(s: unknown) { this.entries.splice(this.idx + 1); this.entries.push({ state: s }); this.idx++; }
  replaceState(s: unknown) { this.entries[this.idx] = { state: s }; }
  /** a traversal as the browser does it: later, from wherever history stands then */
  raw(n: number) {
    setTimeout(() => {
      const t = this.idx + n;
      if (!n || t < 0 || t >= this.entries.length) return;
      this.idx = t;
      for (const l of [...listeners]) l({ state: this.state });
    }, 0);
  }
  go(n = 0) { this.raw(n); }
  back() { this.raw(-1); }
}

const h = new FakeHistory();
(globalThis as unknown as { window: unknown }).window = {
  history: h,
  addEventListener: (_: string, fn: Pop) => { listeners.push(fn); },
  removeEventListener: (_: string, fn: Pop) => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); },
};

const tick = () => new Promise<void>(r => setTimeout(r, 8));
const userBack = async () => { h.raw(-1); await tick(); };
const reset = async (state: unknown = { sgNav: { page: 'home' }, sgDepth: 0 }) => {
  await tick();
  h.entries = [{ state }];
  h.idx = 0;
};
const keys = () => Object.keys((h.state as Record<string, unknown>) || {});

test('one entry while open; the phone\'s back closes it', async () => {
  await reset();
  let closed = 0;
  openOverlay(() => { closed++; });
  await tick();
  assert.equal(h.entries.length, 2);
  assert.ok(keys().includes('sgOv') && keys().includes('sgNav'), 'the page\'s state is copied');
  assert.equal(overlaySteps(), 1);
  await userBack();
  assert.equal(closed, 1);
  assert.equal(h.idx, 0);
  assert.equal(overlaySteps(), 0);
});

test('closed by its own button: the entry goes, no empty step is left', async () => {
  await reset();
  let closed = 0;
  const release = openOverlay(() => { closed++; });
  await tick();
  release();
  await tick();
  assert.equal(h.idx, 0);
  assert.equal(closed, 0, 'the app closed it, the back did not');
});

test('one closes and another opens in the same moment: the entry is reused', async () => {
  await reset();
  const a = openOverlay(() => {});
  await tick();
  let closedB = 0;
  a();
  openOverlay(() => { closedB++; });
  await tick();
  assert.equal(h.idx, 1);
  assert.equal(h.entries.length, 2);
  await userBack();
  assert.equal(closedB, 1);
  assert.equal(h.idx, 0);
});

test('two open: the back closes the upper one first', async () => {
  await reset();
  const order: string[] = [];
  openOverlay(() => { order.push('a'); });
  await tick();
  openOverlay(() => { order.push('b'); });
  await tick();
  assert.equal(h.idx, 2);
  assert.equal(overlaySteps(), 2);
  await userBack();
  assert.deepEqual(order, ['b']);
  await userBack();
  assert.deepEqual(order, ['b', 'a']);
  assert.equal(h.idx, 0);
});

test('another part\'s entry on top (a copy of the state): never stepped back by us; ours is skipped later', async () => {
  await reset();
  const release = openOverlay(() => {});
  await tick();
  // a window of the app opens from inside the sheet with its own step, as they all do
  h.pushState({ ...(h.state as object), sgLesson: 1 });
  release(); // the sheet closes at the same moment
  await tick();
  assert.equal(h.idx, 2, 'the lesson\'s entry stays');
  assert.ok(!keys().includes('sgOv'), 'the copied mark is cleaned');
  await userBack(); // the lesson closes: history lands on our old entry…
  await tick();
  assert.equal(h.idx, 0, '…which is skipped at once');
});

test('the app\'s own history.back() leaves its entry together with the sheet on top of it', async () => {
  await reset();
  h.pushState({ ...(h.state as object), sgLesson: 1 }); // a full-screen window with its own step
  let closed = 0;
  openOverlay(() => { closed++; }); // a sheet inside it
  await tick();
  assert.equal(h.idx, 2);
  (globalThis as unknown as { window: { history: FakeHistory } }).window.history.back(); // „დასრულება“ inside the sheet
  await tick();
  assert.equal(h.idx, 0, 'both entries are left in one step');
  assert.equal(closed, 1);
});

test('close(left): false for the person\'s own back, true when the app stepped back past it', async () => {
  await reset();
  const seen: boolean[] = [];
  openOverlay(left => { seen.push(left); });
  await tick();
  await userBack(); // the phone's back: closed by hand
  assert.deepEqual(seen, [false]);
  h.pushState({ ...(h.state as object), sgNotes: 1 }); // a page with its own step
  openOverlay(left => { seen.push(left); }); // its player, open
  await tick();
  (globalThis as unknown as { window: { history: FakeHistory } }).window.history.back(); // the page's own „უკან“
  await tick();
  assert.deepEqual(seen, [false, true], 'the player was left, not folded by hand');
  // and the next back of the person is their own again
  openOverlay(left => { seen.push(left); });
  await tick();
  await userBack();
  assert.deepEqual(seen, [false, true, false]);
});

test('going on to another page from inside a sheet: coming back skips the sheet\'s old entry', async () => {
  await reset();
  const release = openOverlay(() => {});
  await tick();
  // the page changes (NavigationContext): this entry keeps the old page + its scroll, a fresh one is pushed
  h.replaceState({ ...(h.state as object), sgScroll: 120 });
  h.pushState({ sgNav: { page: 'class' }, sgDepth: 1 });
  release();
  await tick();
  assert.equal(h.idx, 2);
  await userBack();
  await tick();
  assert.equal(h.idx, 0, 'one press brings the first page back');
});

test('leaveOverlaySteps: the entry under the open ones, then the caller\'s own leaving', async () => {
  await reset({ sgNotes: 'v-1', sgBase: 1 });
  const release = openOverlay(() => {});
  await tick();
  assert.equal(h.idx, 1);
  let at = -1;
  leaveOverlaySteps(() => { at = h.idx; });
  await tick();
  assert.equal(at, 0, 'the page closes itself on its own entry');
  assert.equal(h.idx, 0, 'nothing is pushed again while the page goes away');
  release();
  await tick();
  assert.equal(h.idx, 0);
});

test('an entry with a mark nobody knows (left by an earlier load): cleaned on landing, then all works as usual', async () => {
  await reset();
  h.entries.push({ state: { sgNav: { page: 'gz' }, sgDepth: 1, sgOv: { d: 1, r: 1, id: 'old' } } });
  h.raw(1); // forward into it
  await tick();
  await tick();
  assert.equal(h.idx, 1);
  assert.ok(!keys().includes('sgOv'), 'the stale mark is cleaned, the entry itself stays');
  let closed = 0;
  openOverlay(() => { closed++; });
  await tick();
  assert.equal(h.idx, 2);
  await userBack();
  assert.equal(closed, 1);
  assert.equal(h.idx, 1);
});
