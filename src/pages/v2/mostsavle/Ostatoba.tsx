import React, { useMemo, useState } from 'react';
import { deleteField, doc, updateDoc } from 'firebase/firestore';
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { db } from '../../../firebase';
import { useNavigation, useRealAuth } from '../../../context';
import { Area, Bar, Button, Card, Duo, Note, Num, Press, Row, Rows, SectionLabel, Sheet, Small, TopBar, cx, FOCUS } from '../../../components/ui2';
import { MANERA_ITEMS } from '../../../data/habitsAndManera';
import { MASTERY_LEVELS } from '../../../data/masteryPath';
import { lineMarks, pathSummary, recordFromDoc } from '../../../utils/masteryPath';
import { markDate, readManeraReview } from '../../../components/views/ManeraPanel';
import type { ManeraMark } from '../../../components/views/ManeraPanel';
import { triggerHaptic } from '../../../utils/haptics';
import type { StudentData } from './useStudent';

// „ოსტატობის შეფასება“ of a student (board x-mostsavle-ostatoba): the four lines of the mastery path with a bar and a word,
// and the performance tips with the teacher's marks. A tap on a tip sets the mark as the old ManeraReviewEditor did:
// 0–100 in steps of 25 and an optional note, kept in students/{uid}.maneraReview.<num> with who wrote it and when.

/** a share in a word, never in per cent */
const word = (v: number) => (v >= 80 ? 'კარგია' : v >= 50 ? 'იზრდება' : 'სავარჯიშოა');
const STEPS = [0, 25, 50, 75, 100];
const SHOWN = 3;

export const StudentOstatoba: React.FC<{ s: StudentData }> = ({ s }) => {
  const { handleGoBack } = useNavigation();
  const [more, setMore] = useState(false);
  const [openNum, setOpenNum] = useState<string | null>(null);

  const record = useMemo(() => recordFromDoc(s.data), [s.data]);
  const level = pathSummary(record).level;
  const lines = lineMarks(MASTERY_LEVELS[level], record);
  const review = useMemo(() => readManeraReview(s.data?.maneraReview), [s.data]);
  const given = MANERA_ITEMS.filter(it => review[it.num]).length;
  const shown = more ? MANERA_ITEMS : MANERA_ITEMS.slice(0, SHOWN);
  const tip = openNum ? MANERA_ITEMS.find(it => it.num === openNum) : undefined;

  return (
    <div className="flex w-full flex-col gap-3 pb-6">
      <TopBar
        title="ოსტატობის შეფასება"
        sub={`${s.name} · დონე ${level} · ${MASTERY_LEVELS[level].name}`}
        onBack={handleGoBack}
      />

      <Card className="flex flex-col gap-3.5">
        {lines.map(l => {
          const v = l.total ? l.passed / l.total : 0;
          return (
            <div key={l.line} className="flex items-center gap-3">
              <span className="w-[68px] shrink-0 text-body font-bold">{l.name}</span>
              <Bar value={v} label={l.name} className="flex-1" />
              <Small className="w-[88px] text-right">{word(v * 100)}</Small>
            </div>
          );
        })}
      </Card>

      <SectionLabel label={`შენი შეფასება · ${given} / ${MANERA_ITEMS.length}`} />
      <Rows>
        {shown.map(it => {
          const m = review[it.num];
          const i = MANERA_ITEMS.indexOf(it);
          return (
            <Row
              key={it.num}
              lead={<Num n={i + 1} on={!!m} />}
              title={it.title}
              sub={m?.at ? `${m.by || 'მასწავლებელი'} · ${markDate(m.at)}` : undefined}
              wrap
              onClick={() => { triggerHaptic(8); setOpenNum(it.num); }}
              right={
                <span className="flex shrink-0 items-center gap-1">
                  {m ? <Small>{word(m.v)}</Small> : <Small tone="wine">შეაფასე</Small>}
                  <ChevronRight aria-hidden="true" className="size-[18px] text-mut" strokeWidth={2} />
                </span>
              }
            />
          );
        })}
      </Rows>
      {MANERA_ITEMS.length > SHOWN && (
        <Press
          aria-expanded={more}
          onClick={() => setMore(o => !o)}
          className={cx(
            'flex h-tap w-full cursor-pointer items-center justify-center gap-2 rounded-card bg-surf text-body font-bold transition active:bg-soft',
            FOCUS,
          )}
        >
          <ChevronDown aria-hidden="true" className={cx('size-[18px] transition-transform', more && 'rotate-180')} />
          {more ? 'ნაკლები' : `კიდევ ${MANERA_ITEMS.length - SHOWN} გაკვეთილი`}
        </Press>
      )}

      {tip && (
        <MarkSheet
          key={tip.num}
          uid={s.uid}
          num={tip.num}
          title={tip.title}
          mark={review[tip.num]}
          onClose={() => setOpenNum(null)}
        />
      )}
    </div>
  );
};

/** One tip's mark: a step and a note, saved or taken away (as the old editor did). */
const MarkSheet: React.FC<{ uid: string; num: string; title: string; mark?: ManeraMark; onClose: () => void }> = ({
  uid, num, title, mark, onClose,
}) => {
  const { user } = useRealAuth();
  const [v, setV] = useState<number | null>(mark?.v ?? null);
  const [text, setText] = useState(mark?.note ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const write = async (value: object) => {
    setBusy(true);
    setError('');
    try {
      await updateDoc(doc(db, 'students', uid), { [`maneraReview.${num}`]: value });
      onClose();
    } catch {
      setError('ვერ შეინახა — მოსწავლის მონაცემებზე წვდომა ჯერ არ არის.');
    } finally {
      setBusy(false);
    }
  };
  const save = () => {
    if (v === null) return;
    const note = text.trim();
    void write({ v, ...(note ? { note } : {}), by: user?.displayName || 'მასწავლებელი', byUid: user?.uid || '', at: Date.now() });
  };
  const clear = () => void write(deleteField());

  return (
    <Sheet open onClose={onClose} title={title}>
      {mark?.at && <Note>{mark.by || 'მასწავლებელი'} · {markDate(mark.at)}</Note>}
      <div role="radiogroup" aria-label={`${title} — შეფასება`} className="grid grid-cols-5 gap-2">
        {STEPS.map(q => (
          <Press
            key={q}
            role="radio"
            aria-checked={v === q}
            onClick={() => setV(q)}
            className={cx(
              'h-tap cursor-pointer rounded-full text-body font-bold tabular-nums transition active:scale-[0.97]',
              v === q ? 'bg-wine text-white' : 'bg-surf text-ink',
              FOCUS,
            )}
          >
            {q}%
          </Press>
        ))}
      </div>
      <Area label="შენიშვნა" value={text} onChange={setText} placeholder="რა გამოსდის, რაზე იმუშაოს" />
      {error && <p className="px-1.5 text-meta font-semibold text-danger">{error}</p>}
      <Duo>
        {mark && <Button kind="ghost" icon={<Trash2 />} disabled={busy} onClick={clear}>წაშლა</Button>}
        <Button disabled={busy || v === null} onClick={save}>{v === null ? 'აირჩიე' : 'შენახვა'}</Button>
      </Duo>
    </Sheet>
  );
};
