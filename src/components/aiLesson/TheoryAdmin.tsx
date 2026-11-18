import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { AI_THEORY } from '../../data/aiTheory';
import { MEANING_MAX, TERM_MAX, placeWords, theoryEntry, type TheoryId, type TheoryText } from '../../utils/aiTheory';
import { Area, Button, Card, Dot, Duo, Field, Note, Press, cx } from '../ui2';
import { THEORY_ICON } from './Theory';

// „პატარა თეორია“ in the school's AI rules (admins): every rule the lesson may name, each folded — unfolded, its term and
// meaning can be reworded (settings/aiTheory) or given back to the app's own words. The place sentence is the app's.

export const TheoryAdminList: React.FC<{
  over: Partial<Record<TheoryId, TheoryText>>;
  onSave: (id: TheoryId, t: TheoryText | null) => Promise<void> | void;
}> = ({ over, onSave }) => {
  const [openId, setOpenId] = useState<TheoryId | null>(null);
  return (
    <>
      <Note>გაკვეთილი ამ წესებს ახალ ფრაზაში ასახელებს, როცა ფრაზაში ჩანს — თითოს ერთხელ, თითო წინადადებით.</Note>
      <Card pad="none" className="divide-y divide-line">
        {AI_THEORY.map(t => (
          <TheoryFold key={t.id} id={t.id} over={over[t.id]} open={openId === t.id}
            onToggle={() => setOpenId(o => (o === t.id ? null : t.id))} onSave={onSave} />
        ))}
      </Card>
    </>
  );
};

const TheoryFold: React.FC<{
  id: TheoryId; over?: TheoryText; open: boolean; onToggle: () => void;
  onSave: (id: TheoryId, t: TheoryText | null) => Promise<void> | void;
}> = ({ id, over, open, onToggle, onSave }) => {
  const entry = theoryEntry(id, over ? { [id]: over } : {});
  const own = theoryEntry(id);
  const [term, setTerm] = useState(entry.term);
  const [meaning, setMeaning] = useState(entry.meaning);
  const [busy, setBusy] = useState(false);
  const changed = term.trim() !== entry.term || meaning.trim() !== entry.meaning;
  const save = async (t: TheoryText | null) => {
    setBusy(true);
    try { await onSave(id, t); } finally { setBusy(false); }
    if (!t) { setTerm(own.term); setMeaning(own.meaning); }
  };
  return (
    <div>
      <Press aria-expanded={open} onClick={onToggle}
        className="flex min-h-row w-full cursor-pointer items-center gap-2.5 py-2 pr-3 pl-4 text-left active:bg-soft">
        <Dot icon={THEORY_ICON[id]} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-lead font-bold">{entry.term}</span>
          <span className={cx('text-meta text-mut', open ? 'wrap-break-word' : 'truncate')}>{over ? 'სკოლის ტექსტი' : entry.meaning}</span>
        </span>
        <ChevronDown aria-hidden="true" className={cx('size-[18px] shrink-0 text-mut transition-transform', open && 'rotate-180')} />
      </Press>
      {open && (
        <div className="flex flex-col gap-3 bg-page px-4 pt-3 pb-4">
          <Field label="სახელი" value={term} maxLength={TERM_MAX} onChange={setTerm} />
          <Area label="რას ნიშნავს — ერთი წინადადება" value={meaning} maxLength={MEANING_MAX} onChange={setMeaning} />
          <Note>ადგილს გაკვეთილი თვითონ წერს, მაგალითად: „{own.where.replace(/\{(on|between|after)\}/, (_, k: 'on' | 'between' | 'after') => placeWords({ at: 2, place: k }, 6))}“</Note>
          <Duo>
            <Button kind="ghost" size="md" disabled={busy || !over} onClick={() => save(null)}>აპის ტექსტი</Button>
            <Button size="md" disabled={busy || !changed || !term.trim() || !meaning.trim()}
              onClick={() => save({ term: term.trim(), meaning: meaning.trim() })}>შენახვა</Button>
          </Duo>
        </div>
      )}
    </div>
  );
};
