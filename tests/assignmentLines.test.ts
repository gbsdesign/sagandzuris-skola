import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assignmentLines, splitTitle } from '../src/utils/assignmentLines';

test('a group chant: its own name big, kind · tone · style · service on the line, the book apart', () => {
  assert.deepEqual(assignmentLines('mx-v-4-4', ''), {
    name: 'ნათლისმცემელო ქრისტესო',
    line: 'ტროპარი · ხმა ვ · გამშვენებული · ყველიერის კვირის მწუხრი',
    book: 'გ.ს. IV ტომი · №20 · გვ. 17',
  });
});

test('a version whose source is its chant keeps the source on the line', () => {
  const l = assignmentLines('ds-v-14-1', '');
  assert.equal(l.name, 'ა დასდებელი');
  assert.equal(l.line, 'ნათლისმცემელო ქრისტესო · ხმა ა · სამშაბათი — სხვანი');
  assert.match(l.book, /^ჰ\.კ\. კრებული II · გვ\. 295$/);
});

test('an unknown id falls back to the stored title, its closing bracket as the line', () => {
  assert.deepEqual(assignmentLines('no-such-id', 'ჩაკრულო (კახეთი)'), { name: 'ჩაკრულო', line: 'კახეთი', book: '' });
  assert.deepEqual(splitTitle('ოდოია'), { name: 'ოდოია', line: '', book: '' });
});
