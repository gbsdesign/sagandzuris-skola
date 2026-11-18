import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Pause, Pencil, Play } from 'lucide-react';
import { useNavigation, useRealAuth } from '../../../context';
import { Button, Card, Dot, Duo, Note, Row, Rows, SectionLabel, Sheet, ToggleRow, TopBar } from '../../../components/ui2';
import { MemberPathEditor } from '../../../components/admin/MemberPathEditor';
import { learnPieceOf } from '../../../components/learn/openLearning';
import { usePathItemOpener } from '../../../hooks/usePathItemOpener';
import { saveConfirmation, useConfirmations } from '../../../hooks/useConfirmations';
import { saveMarksLock, useMarksLock } from '../../../hooks/usePathMarks';
import { takeUrl, usePearlTakes } from '../../../hooks/usePearls';
import type { PearlTake } from '../../../hooks/usePearls';
import { parseLearnTakeId } from '../../../utils/learn';
import { errorText } from '../../../utils/errorText';
import { categoryOf, sortPathItems, usesVoices, voicesOf } from '../../../utils/pathItems';
import type { PathItem, Voice } from '../../../utils/pathItems';
import { ROMAN, markedCount, usePathItems } from './useStudent';
import type { StudentData } from './useStudent';

// „ნასწავლი საგალობლები“ of a student (board x-mostsavle-gza): what the old path editor's „გზა“ tab did, as a screen.
// A voice goes: not known → marked by the student → confirmed by the teacher („ჩათვლა“, confirmations/{uid}) — the cards
// on top wait for the confirming; the confirmed ones are the rows below. Adding, removing, reordering and taking a
// confirmation back stay in the old editor, one tap away („გზის რედაქტირება“). Not stored: the day a voice was marked
// and the day a teacher confirmed it — the record keeps only what is marked and what is confirmed.

const voiceName = (it: PathItem, v: Voice) => (usesVoices(it.variantId) ? `${ROMAN[v]} ხმა` : 'ნასწავლი');

export const StudentGza: React.FC<{ s: StudentData }> = ({ s }) => {
  const { handleGoBack } = useNavigation();
  const { user } = useRealAuth();
  const conf = useConfirmations(s.uid);
  const lock = useMarksLock(s.uid);
  const takes = usePearlTakes(s.uid, true);
  const opener = usePathItemOpener();
  const [editor, setEditor] = useState(false);
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState<string | null>(null);
  const audio = useRef<{ a: HTMLAudioElement; url: string } | null>(null);

  const raw = usePathItems(s.data);
  const items = useMemo(() => sortPathItems(raw), [raw]);
  const stop = () => {
    if (audio.current) { audio.current.a.pause(); URL.revokeObjectURL(audio.current.url); audio.current = null; }
    setPlaying(null);
  };
  useEffect(() => stop, []);

  // the student's newest take of this item (the asked voice first)
  const takeOf = (it: PathItem, v: Voice): PearlTake | null => {
    const piece = learnPieceOf(it.variantId);
    if (!piece) return null;
    const mine = Object.values(takes).filter(t => parseLearnTakeId(t.id)?.piece === piece);
    const pick = (xs: PearlTake[]) => xs.sort((a, b) => b.at.localeCompare(a.at))[0] ?? null;
    return pick(mine.filter(t => t.voice === v)) ?? pick(mine);
  };
  const play = (t: PearlTake) => {
    if (playing === t.id) { stop(); return; }
    stop();
    const url = takeUrl(t);
    const a = new Audio(url);
    a.onended = stop;
    audio.current = { a, url };
    setPlaying(t.id);
    a.play().catch(stop);
  };

  const confirm = (it: PathItem, v: Voice) => {
    const cur = conf[it.variantId] || [];
    const next = cur.includes(v) ? cur : [...cur, v].sort() as Voice[];
    saveConfirmation(s.uid, it.variantId, next, user?.email || '').catch(e => setError('ჩათვლა ვერ შეინახა: ' + errorText(e)));
  };
  const setLocked = (on: boolean) =>
    saveMarksLock(s.uid, on, user?.displayName || '').catch(e => setError('ვერ შეინახა: ' + errorText(e)));

  const waiting = items.flatMap(it => voicesOf(it, it.variantId).filter(v => !(conf[it.variantId] || []).includes(v)).map(v => ({ it, v })));
  const done = items.filter(it => (conf[it.variantId] || []).length > 0);
  const marked = markedCount(items);

  return (
    <div className="flex w-full flex-col gap-3 pb-6">
      <TopBar
        title="ნასწავლი საგალობლები"
        sub={`${s.name} · ${items.length} საგალობელი · ${marked} ხმა`}
        onBack={handleGoBack}
      />

      <Rows>
        <ToggleRow
          title="მოსწავლე თავად ნიშნავს"
          sub={lock?.on ? 'გამორთულია: ხმებს მხოლოდ მასწავლებელი ნიშნავს' : 'ის ნიშნავს — შენ ჩათვალე'}
          on={!lock?.on}
          onChange={on => setLocked(!on)}
          wrap
        />
      </Rows>

      {error && <p className="px-1.5 text-meta font-semibold text-danger">{error}</p>}
      {items.length === 0 && <Note>საგანძურის გზა ცარიელია.</Note>}

      {waiting.length > 0 && (
        <>
          <SectionLabel label={`ელოდება ჩათვლას · ${waiting.length}`} />
          {waiting.map(({ it, v }) => {
            const take = takeOf(it, v);
            return (
              <Card key={`${it.variantId}-${v}`} className="flex flex-col gap-3">
                <div className="min-w-0">
                  <div className="text-lead font-bold wrap-break-word">{it.chantName} · {voiceName(it, v)}</div>
                  <div className="text-meta text-mut">მოსწავლემ მონიშნა</div>
                </div>
                <Duo>
                  {take && (
                    <Button kind="ghost" size="md" icon={playing === take.id ? <Pause /> : <Play />} onClick={() => play(take)}>
                      {playing === take.id ? 'გაჩერება' : 'მოუსმინე'}
                    </Button>
                  )}
                  <Button size="md" icon={<CheckCircle2 />} onClick={() => confirm(it, v)}>ჩათვალე</Button>
                </Duo>
              </Card>
            );
          })}
        </>
      )}

      {done.length > 0 && (
        <>
          <SectionLabel label="ჩათვლილია" />
          <Rows>
            {done.map(it => {
              const go = opener(it.variantId);
              const vs = (conf[it.variantId] || []).filter(v => usesVoices(it.variantId) || v === '1');
              const line = usesVoices(it.variantId) ? vs.map(v => ROMAN[v]).join(', ') : '';
              return (
                <Row
                  key={it.variantId}
                  title={line ? `${it.chantName} · ${line}` : it.chantName}
                  sub={categoryOf(it.variantId) === 'galoba' ? it.code : undefined}
                  onClick={go ?? undefined}
                  right={go ? 'chev' : null}
                  wrap
                />
              );
            })}
          </Rows>
        </>
      )}

      <Rows>
        <Row
          lead={<Dot icon={<Pencil />} />}
          title="გზის რედაქტირება"
          sub="დამატება · მოხსნა · რიგი · ჩათვლის მოხსნა"
          onClick={() => setEditor(true)}
        />
      </Rows>

      <Sheet open={editor} onClose={() => setEditor(false)} title="გზის რედაქტირება">
        <MemberPathEditor uid={s.uid} name={s.name} onError={setError} />
      </Sheet>
    </div>
  );
};
