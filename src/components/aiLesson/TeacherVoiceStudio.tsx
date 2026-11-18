import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, AudioLines, Mic, Play, RotateCcw, Square } from 'lucide-react';
import { useAuth } from '../../context';
import { MONTHS_SHORT_GE } from '../../utils/dateNames';
import { Bar, Button, Dot, Note, RoundButton, Row, Rows, Seg } from '../ui2';
import { VOICE_SENTENCES, VOICE_WORD, sentenceHash, type VoiceKind } from '../../utils/teacherVoice';
import { clipUrl, loadVoiceIndex, useVoiceIndex, type VoiceIndex } from './TeacherVoice';
import { MAKE_PROBLEM_TEXT, MakeError, makeVoiceClip } from './TeacherVoiceMake';

// „მასწავლებლის ხმის სახელოსნო“ — the owner's alone (⚙ „სკოლა“ → AI მასწავლებელი): every ready sentence in a woman's and
// a man's voice, made by Gemini's Live API (TeacherVoiceMake) and kept in aiVoice/*; each one heard and made again at will,
// „ყველა დარჩენილის ჩაწერა“ goes through the rest one by one. A count „N / M ჩაწერილია“ on top.

const dayOf = (at: number) => { const d = new Date(at); return `${d.getDate()} ${MONTHS_SHORT_GE[d.getMonth()]}`; };

/** The row in the AI rules' window that opens the studio (the owner's only). */
export const TeacherVoiceStudioRow: React.FC = () => {
  const { isOwner } = useAuth();
  const [open, setOpen] = useState(false);
  if (!isOwner) return null;
  return (
    <>
      <Rows>
        <Row lead={<Dot icon={<AudioLines />} />} title="მასწავლებლის ხმის სახელოსნო" sub="მზა ფრაზების ჩაწერა · მხოლოდ შენ" onClick={() => setOpen(true)} />
      </Rows>
      {/* over the window it opens from (a sheet's rise would hold a fixed screen inside it) */}
      {open && createPortal(<TeacherVoiceStudio onClose={() => setOpen(false)} />, document.body)}
    </>
  );
};

export const TeacherVoiceStudio: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user } = useAuth();
  const index = useVoiceIndex();
  useEffect(() => { void loadVoiceIndex(true); }, []);
  const make = async (text: string, voice: VoiceKind) => {
    if (!user) throw new MakeError('setup');
    return makeVoiceClip(user.uid, text, voice);
  };
  return <TeacherVoiceStudioView index={index} onClose={onClose} onMake={make} />;
};

type RowState = { busy?: boolean; error?: string };

/** The studio itself, from what is given (so it can be looked at without the database). */
export const TeacherVoiceStudioView: React.FC<{
  index: VoiceIndex; onClose: () => void; onMake: (text: string, voice: VoiceKind) => Promise<Blob>;
}> = ({ index, onClose, onMake }) => {
  const [voice, setVoice] = useState<VoiceKind>('female');
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [all, setAll] = useState<{ done: number; of: number } | null>(null);
  const [problem, setProblem] = useState('');
  const stopAll = useRef(false);
  const player = useRef<HTMLAudioElement | null>(null);
  const has = (s: string) => index[voice]?.[sentenceHash(s)] ?? 0;
  const done = VOICE_SENTENCES.filter(has).length;
  const left = VOICE_SENTENCES.filter(s => !has(s));

  // Escape closes the studio, not the window under it
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => { window.removeEventListener('keydown', onKey, true); player.current?.pause(); };
  }, [onClose]);

  const hear = (src: string) => {
    const a = player.current ?? new Audio();
    player.current = a;
    a.src = src;
    void a.play().catch(() => undefined);
  };
  const hearKept = async (s: string) => { const url = await clipUrl(voice, s); if (url) hear(url); };

  const one = async (s: string, v: VoiceKind, play: boolean) => {
    const key = `${v}|${s}`;
    setRows(r => ({ ...r, [key]: { busy: true } }));
    try {
      const mp3 = await onMake(s, v);
      setRows(r => ({ ...r, [key]: {} }));
      setProblem('');
      if (play) hear(URL.createObjectURL(mp3));
      return true;
    } catch (e) {
      const text = MAKE_PROBLEM_TEXT[e instanceof MakeError ? e.kind : 'failed'];
      setRows(r => ({ ...r, [key]: { error: text } }));
      if (e instanceof MakeError && (e.kind === 'setup' || e.kind === 'no-credits' || e.kind === 'offline')) setProblem(text);
      return !(e instanceof MakeError && (e.kind === 'setup' || e.kind === 'no-credits' || e.kind === 'offline'));
    }
  };

  const makeAll = async () => {
    if (all) { stopAll.current = true; return; }
    stopAll.current = false;
    const list = left.slice();
    const v = voice;
    setAll({ done: 0, of: list.length });
    for (let i = 0; i < list.length; i++) {
      if (stopAll.current) break;
      const goOn = await one(list[i], v, false);
      setAll({ done: i + 1, of: list.length });
      if (!goOn) break;
    }
    setAll(null);
  };

  return (
    <div className="fixed inset-0 z-[90] flex flex-col overflow-y-auto overscroll-contain bg-page pt-[env(safe-area-inset-top)] text-ink safe-x">
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-3 px-4 pb-[max(24px,env(safe-area-inset-bottom))]">
        <header className="flex shrink-0 items-center gap-2.5 pt-3.5 pb-1">
          <RoundButton label="უკან" onClick={onClose}><ArrowLeft /></RoundButton>
          <div className="min-w-0 flex-1 pl-0.5">
            <h1 className="line-clamp-2 text-title font-bold leading-tight tracking-tight">მასწავლებლის ხმის სახელოსნო</h1>
            <div className="truncate text-meta text-mut">{done} / {VOICE_SENTENCES.length} ჩაწერილია · {VOICE_WORD[voice]} ხმა</div>
          </div>
        </header>
        <Seg label="ხმა" items={[{ id: 'female', label: 'ქალის ხმა' }, { id: 'male', label: 'კაცის ხმა' }]} value={voice}
          onChange={v => { if (!all) setVoice(v); }} />
        <Bar value={done / VOICE_SENTENCES.length} h={8} label="ჩაწერილია" />
        {problem && <p role="alert" className="shrink-0 px-1.5 text-meta leading-normal text-gold-ink">{problem}</p>}
        {left.length > 0 && (
          <Button full icon={all ? <Square fill="currentColor" /> : <Mic />} kind={all ? 'ghost' : 'primary'} onClick={() => void makeAll()}>
            {all ? `შეჩერება · ${all.done} / ${all.of}` : `ყველა დარჩენილის ჩაწერა · ${left.length}`}
          </Button>
        )}
        <Note>თითო ფრაზას Gemini ერთხელ კითხულობს (≈ 0.01 $), ტელეფონები მერე ინახავენ. მოუსმინე — თუ არ მოგეწონა, თავიდან ჩაწერე.</Note>
        <Rows>
          {VOICE_SENTENCES.map(s => {
            const at = has(s);
            const st = rows[`${voice}|${s}`] ?? {};
            return (
              <Row key={s} wrap title={<span className="font-normal">{s}</span>}
                sub={st.busy ? 'იწერება…' : st.error ? <span className="text-gold-ink">{st.error}</span> : at ? `ჩაწერილია · ${dayOf(at)}` : 'ჯერ არ არის'}
                right={(
                  <span className="flex shrink-0 items-center gap-1">
                    {at > 0 && !st.busy && <RoundButton label="მოსმენა" size={36} tone="page" onClick={() => void hearKept(s)}><Play /></RoundButton>}
                    <RoundButton label={at ? 'თავიდან ჩაწერა' : 'ჩაწერა'} size={36} tone={at ? 'page' : 'wine'} disabled={!!st.busy || !!all}
                      onClick={() => void one(s, voice, true)}>
                      {at ? <RotateCcw /> : <Mic />}
                    </RoundButton>
                  </span>
                )} />
            );
          })}
        </Rows>
      </div>
    </div>
  );
};
