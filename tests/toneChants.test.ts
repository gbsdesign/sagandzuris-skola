import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toneChants, versionTone } from '../src/utils/toneChants';
import { findVersion, hasBookNotes } from '../src/data/chantLookup';

test('a version label names its tone', () => {
  assert.equal(versionTone('ჴმაჲ ა'), 1);
  assert.equal(versionTone('ხმა დ'), 4);
  assert.equal(versionTone('ბრწყინვალე იგი, ხმა დ'), 4);
  assert.equal(versionTone('ჴმაჲ ჱ'), 8);
  assert.equal(versionTone('კურიაკესა, ჴმაჲ ჱ'), 8);
  assert.equal(versionTone('ჴმაჲ დ, I'), null);
  assert.equal(versionTone('ალილუიაჲ'), null);
  assert.equal(versionTone(''), null);
  assert.equal(versionTone(undefined), null);
});

test('every tone has its Sunday chants, each opening notes of that tone', () => {
  for (let tone = 1; tone <= 8; tone++) {
    const groups = toneChants(tone);
    assert.deepEqual(groups.map(g => g.service), ['ლიტურგიაზე', 'ცისკარზე', 'მწუხრზე'], `tone ${tone}`);
    const titles = groups.flatMap(g => g.rows.map(r => r.title));
    for (const t of ['წარდგომა', 'ალილუია', 'ღმერთი უფალი', 'აღდგომის ტროპარი', 'უფალო, ღაღადვყავ', 'აღდგომის დასდებელი', 'დოგმატიკი']) {
      assert.ok(titles.includes(t), `tone ${tone}: ${t}`);
    }
    for (const row of groups.flatMap(g => g.rows)) {
      assert.ok(row.versions.length > 0, `tone ${tone}: ${row.title}`);
      // the Gelati school book (vol. I) comes first where it has the chant
      for (const v of row.versions) {
        const info = findVersion(v.vid);
        assert.ok(info, `tone ${tone}: ${v.vid} opens`);
        assert.ok(hasBookNotes(info!.variant), `tone ${tone}: ${v.vid} has notes`);
        assert.equal(versionTone(info!.variant.version), tone, `tone ${tone}: ${v.vid} is in the tone`);
      }
    }
  }
});

test('tone IV: the books\' own numbers', () => {
  const rows = Object.fromEntries(toneChants(4).flatMap(g => g.rows).map(r => [r.title, r.versions]));
  assert.deepEqual(rows['ღმერთი უფალი'].map(v => [v.book, v.num]), [['გელათური', 90], ['ქართლ-კახური', 105], ['გელათური, ანთ. XIV', 99]]);
  assert.deepEqual(rows['აღდგომის ტროპარი'].map(v => v.book), ['გელათური', 'ქართლ-კახური', 'გელათური, IX ტ.']);
  assert.deepEqual(rows['აღდგომის ტროპარი'].map(v => v.num), [91, 106, 87]);
  assert.deepEqual(rows['წარდგომა'].map(v => v.num), [171, 159, 100, 94, 102, 21, 22, 23, 24, 25]);
  assert.deepEqual(rows['წარდგომა'].map(v => v.book).slice(5), Array(5).fill('ქართლ-კახური, ანთ. III'));
  assert.deepEqual(rows['ალილუია'].map(v => v.num).slice(0, 1), [179]);
});
