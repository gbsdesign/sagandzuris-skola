import React, { useMemo, useState } from 'react';
import { Brush, Check, ChevronDown, ImageDown, Loader2, PenLine, Send, Shuffle } from 'lucide-react';
import { useAuth } from '../../../context';
import { NAKHATI_WORDS, nakhatiTheme } from '../../../data/nakhatiWords';
import { classChatBase, sendDrawMessage, useChat, type ChatAuthor } from '../../../hooks/useClassChat';
import type { SchoolClass } from '../../../hooks/useClasses';
import { threeToDraw } from '../../../utils/nakhati';
import { LATIN_TO_GEORGIAN } from '../../../utils/sitqva';
import { triggerHaptic } from '../../../utils/haptics';
import { TableScreen } from '../../../components/games/TableScreen';
import { Chip } from '../../../components/games/Chip';
import { InkPad, InkView, inkPng, inkWidth } from '../../../components/games/Ink';
import { useMine } from '../../../components/games/useMine';
import { DrawRiddle } from '../../../components/classes/DrawRiddle';
import { Btn, Card, askConfirm } from '../../../components/ui/kit';
import { DRAW_RULE, NakhatiOptions, SHORT_SIDE, ThemeTag, UNCHECKED, useShort } from './parts';
import { readDraft, readSeen, rememberSeen, saveDraft, useThemes, type Draft } from './store';

// „ნახატობანა“ alone (its first tab, 2026-11-01): a word of three — or one's own — drawn on the whole screen, then sent to the
// class's chat as a riddle (hooks/useClassChat.ts `sendDrawMessage`: the lines, the word folded, the theme's name): every
// classmate sees it drawn from its first line and types the word (components/classes/DrawRiddle.tsx). Without a class the
// drawing is saved or shared as a picture. The drawing not sent yet stays on this phone; under it, the classmates' drawings
// from the class chats.

const toGeorgian = (s: string) => [...s].map(c => LATIN_TO_GEORGIAN[c] ?? c).join('');
const OWN_MAX = 24;

/** the picture to a friend (a phone's share), else saved */
const sharePicture = async (ink: string): Promise<'shared' | 'saved' | 'none'> => {
  const blob = await inkPng(ink, 900);
  if (!blob) return 'none';
  const file = new File([blob], 'nakhatobana.png', { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (typeof nav.share === 'function' && nav.canShare?.({ files: [file] })) {
    try { await nav.share({ files: [file], text: 'გამოიცანი, რა დავხატე! · ნახატობანა' }); return 'shared'; } catch { return 'none'; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'nakhatobana.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'saved';
};

/** the word to draw, over the pad (the artist's own) */
const WordStrip: React.FC<{ d: Draft }> = ({ d }) => (
  <div className="rounded-2xl bg-[#7a2028] text-white px-4 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
    <span className="text-[12.5px] font-bold text-[#f0d9a0]">დახატე:</span>
    <span className="font-serif-ge text-[22px] font-bold leading-tight [overflow-wrap:anywhere]">{d.w}</span>
    {d.theme && <span className="ml-auto"><ThemeTag theme={d.theme} light /></span>}
  </div>
);

/** to a class's chat: the class picked when there are more */
const SendToClass: React.FC<{ d: Draft; classes: SchoolClass[]; onSent: (name: string) => void }> = ({ d, classes, onSent }) => {
  const { user, isAdmin } = useAuth();
  const [picked, setPicked] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'error'>('idle');
  if (!user) return null;
  const uid = user.uid;
  const cls = classes.find(c => c.id === picked) ?? (classes.length === 1 ? classes[0] : null);
  const send = async () => {
    if (!cls) return;
    setState('sending');
    try {
      const p = cls.members.find(m => m.uid === uid) || cls.teachers.find(m => m.uid === uid);
      const author: ChatAuthor = {
        uid, name: p?.name || user.displayName || 'მგალობელი', photoURL: p?.photoURL || user.photoURL || '',
        teacher: isAdmin || cls.teachers.some(t => t.uid === uid),
      };
      await sendDrawMessage(cls.id, author, { ink: d.ink, word: d.w, theme: nakhatiTheme(d.theme)?.label ?? '' });
      triggerHaptic(20);
      onSent(cls.name);
    } catch {
      setState('error');
    }
  };
  return (
    <div className="space-y-2.5">
      {classes.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="რომელ კლასს">
          {classes.map(c => <Chip key={c.id} on={cls?.id === c.id} onClick={() => setPicked(c.id)}>{c.name}</Chip>)}
        </div>
      )}
      <Btn full size="lg" disabled={!cls || state === 'sending' || !d.ink} onClick={() => { void send(); }}
        icon={state === 'sending' ? <Loader2 className="animate-spin" /> : <Send />} className="!h-14 !text-[15.5px]">
        {state === 'sending' ? 'იგზავნება…' : cls ? 'კლასის ჩატში გაგზავნა' : 'აირჩიე კლასი'}
      </Btn>
      {state === 'error' && <p className="text-[13.5px] font-bold text-[#b3261e]" role="alert">ვერ გაიგზავნა — სცადე ხელახლა.</p>}
    </div>
  );
};

/** one class's drawings from its chat, the newest first */
const ClassDrawings: React.FC<{ cls: SchoolClass; uid: string; titled: boolean }> = ({ cls, uid, titled }) => {
  const { messages, loading } = useChat(classChatBase(cls.id));
  const draws = messages.filter(m => m.kind === 'draw' && m.ink).reverse().slice(0, 6);
  return (
    <section className="space-y-2">
      {titled && <p className="text-[13px] font-bold text-[#7a2028]">{cls.name}</p>}
      {loading ? <p className="text-[13px] text-[#9a8b7b]">იტვირთება…</p>
        : !draws.length ? <p className="text-[13px] leading-snug text-[#9a8b7b]">ჯერ არავის გაუგზავნია ნახატი — იყავი პირველი!</p>
          : (
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {draws.map(m => {
                const mine = m.uid === uid;
                return (
                  <li key={m.id} className={`rounded-[20px] px-3.5 py-2.5 ${mine ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#2a2017]'}`}>
                    <p className={`mb-1 text-[12.5px] font-bold ${mine ? 'text-[#f0d9a0]' : 'text-[#7a2028]'}`}>{mine ? 'შენ' : m.name || 'კლასელი'}</p>
                    <DrawRiddle m={m} mine={mine} />
                  </li>
                );
              })}
            </ul>
          )}
    </section>
  );
};

export const NakhatiRiddle: React.FC = () => {
  const { user } = useAuth();
  const uid = user?.uid || '';
  const { classes } = useMine();
  const live = classes.filter(c => !c.archived);
  const short = useShort();
  const themes = useThemes();
  const [roll, setRoll] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const three = useMemo(() => threeToDraw(NAKHATI_WORDS, themes, readSeen()), [themes, roll]);
  const [draft, setDraftState] = useState<Draft | null>(() => { const d = readDraft(); return d && d.ink ? d : null; });
  const setDraft = (d: Draft | null) => { setDraftState(d); saveDraft(d); };
  const [drawing, setDrawing] = useState(false);
  const [own, setOwn] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [saved, setSaved] = useState<'shared' | 'saved' | 'none' | 'busy' | null>(null);
  const [showAll, setShowAll] = useState(false);

  const begin = (w: string, theme: string) => {
    triggerHaptic(10);
    rememberSeen([w]);
    setDraft({ w, theme, ink: '' });
    setSentTo(null);
    setSaved(null);
    setDrawing(true);
  };
  const ownWord = own.replace(/\s+/g, ' ').trim();
  const fresh = async () => {
    if (draft?.ink && !sentTo && !(await askConfirm({ title: 'ნახატი წაიშალოს?', text: 'ჯერ არ გაგიგზავნია — ახალ სიტყვას აირჩევ.', ok: 'წაშლა' }))) return;
    setDraft(null);
    setSentTo(null);
    setSaved(null);
    setRoll(r => r + 1);
  };
  const keep = async () => {
    if (!draft?.ink) return;
    setSaved('busy');
    setSaved(await sharePicture(draft.ink));
  };

  if (drawing && draft) {
    const done = (big: boolean) => (
      <Btn size={big ? 'lg' : 'md'} full icon={<Check />} disabled={!draft.ink} onClick={() => { triggerHaptic(12); setDrawing(false); }} className={big ? '!h-14 !text-[16px]' : ''}>
        მზადაა
      </Btn>
    );
    const pad = (
      <InkPad
        initial={draft.ink}
        onChange={(ink, end) => { if (end) setDraft({ ...draft, ink }); }}
        width={short ? SHORT_SIDE : inkWidth(390)}
        aside={short}
        extra={short ? done(false) : undefined}
      />
    );
    return (
      <TableScreen
        title="ნახატობანა · დახატე"
        onClose={() => { setDrawing(false); if (!draft.ink) setDraft(null); }}
        footer={short ? undefined : done(true)}
      >
        {short ? (
          <div className="flex-1 flex items-start justify-center gap-3 py-1">
            <div className="w-[168px] shrink-0 space-y-2 pt-1">
              <p className="text-[12.5px] font-bold text-[#7a2028]">დახატე:</p>
              <p className="font-serif-ge text-[22px] font-bold leading-tight text-[#4a3426] [overflow-wrap:anywhere]">{draft.w}</p>
              {draft.theme && <ThemeTag theme={draft.theme} />}
              <p className="text-[12px] leading-snug text-[#9a8b7b]">{DRAW_RULE}</p>
            </div>
            {pad}
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-2.5 py-1 w-full max-w-2xl mx-auto">
            <WordStrip d={draft} />
            {pad}
            <p className="text-center text-[12px] leading-snug text-[#9a8b7b]">{DRAW_RULE}</p>
          </div>
        )}
      </TableScreen>
    );
  }

  return (
    <div className="space-y-4">
      {draft ? (
        <Card className="!p-4 sm:!p-5 space-y-4">
          <p className="flex items-center gap-2 font-serif-ge text-[18px] font-bold text-[#4a3426]"><Brush className="w-5 h-5 text-[#7a2028]" />შენი ნახატი</p>
          <div className="flex flex-wrap items-start gap-3.5">
            <InkView ink={draft.ink} width="min(100%, 220px)" label={`შენი ნახატი: ${draft.w}`} />
            <div className="min-w-0 flex-1 basis-40 space-y-2">
              {draft.theme && <ThemeTag theme={draft.theme} />}
              <p className="font-serif-ge text-[24px] font-bold leading-tight text-[#4a3426] [overflow-wrap:anywhere]">{draft.w}</p>
              {!sentTo && <Btn kind="ghost" icon={<PenLine />} onClick={() => setDrawing(true)}>ხატვის გაგრძელება</Btn>}
            </div>
          </div>
          {sentTo ? (
            <p className="flex items-start gap-2 rounded-2xl bg-[#2f7d4f]/10 px-3.5 py-2.5 text-[14px] font-bold leading-snug text-[#2f7d4f]" role="status">
              <Check className="w-5 h-5 shrink-0" />გაიგზავნა „{sentTo}“-ის ჩატში — კლასელები ნახავენ, როგორ ხატავდი, და გამოიცნობენ.
            </p>
          ) : user && live.length ? (
            <SendToClass d={draft} classes={live} onSent={name => { setSentTo(name); saveDraft(null); }} />
          ) : (
            <p className="text-[13px] leading-snug text-[#75685a]">კლასის ჩატში გაგზავნა კლასის წევრებს შეუძლიათ. სურათი შეინახე ან მეგობარს გაუზიარე — სიტყვას ნუ ეტყვი!</p>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            <Btn kind="ghost" full icon={saved === 'busy' ? <Loader2 className="animate-spin" /> : <ImageDown />} disabled={saved === 'busy'} onClick={() => { void keep(); }}>
              {saved === 'saved' ? 'შეინახა' : saved === 'shared' ? 'გაზიარდა' : 'სურათად შენახვა'}
            </Btn>
            <Btn kind="ghost" full icon={<Brush />} onClick={() => { void fresh(); }}>ახალი ნახატი</Btn>
          </div>
        </Card>
      ) : (
        <Card className="!p-4 sm:!p-5 space-y-4">
          <div>
            <p className="flex items-center gap-2 font-serif-ge text-[18px] font-bold text-[#4a3426]"><Brush className="w-5 h-5 text-[#7a2028]" />დახატე გამოცანა</p>
            <p className="mt-1.5 text-[13px] leading-snug text-[#75685a]">
              აირჩიე სიტყვა და დახატე. ნახატი კლასის ჩატში წავა: კლასელები ნახავენ, როგორ ხატავდი, და სიტყვას ჩაწერენ. ასოები და ციფრები არ შეიძლება — მხოლოდ ნახატი.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13.5px] font-bold text-[#4a3426]">აირჩიე სიტყვა</p>
              <button type="button" onClick={() => { triggerHaptic(6); setRoll(r => r + 1); }} className="h-9 px-3 -mr-1 rounded-full inline-flex items-center gap-1.5 text-[13px] font-bold text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer">
                <Shuffle className="w-4 h-4" />სხვა სამი
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {three.map(x => (
                <button
                  key={x.w}
                  type="button"
                  onClick={() => begin(x.w, x.theme)}
                  className="min-h-[76px] rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] px-3 py-2.5 text-left flex flex-col items-start gap-1.5 hover:ring-[#7a2028]/40 active:scale-[0.99] transition cursor-pointer"
                >
                  <ThemeTag theme={x.theme} />
                  <span className="font-serif-ge text-[19px] font-bold leading-tight text-[#4a3426] [overflow-wrap:anywhere]">{x.w}</span>
                </button>
              ))}
            </div>
          </div>
          <form className="space-y-1.5" onSubmit={e => { e.preventDefault(); if (ownWord.length >= 2) begin(ownWord, ''); }}>
            <label htmlFor="nakhati-own" className="block text-[13.5px] font-bold text-[#4a3426]">ან შენი სიტყვა</label>
            <div className="flex gap-2">
              <input
                id="nakhati-own"
                value={own}
                onChange={e => setOwn(toGeorgian(e.target.value).replace(/[^ა-ჰ ]/g, '').slice(0, OWN_MAX))}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
                placeholder="მაგ.: ჩურჩხელა"
                className="min-w-0 flex-1 h-12 rounded-2xl bg-white ring-1 ring-[#e0d2bb] px-3.5 text-[16px] font-bold text-[#4a3426] placeholder:font-normal placeholder:text-[14px] placeholder:text-[#b3a48f] outline-none focus:ring-2 focus:ring-[#7a2028]/40"
              />
              <Btn type="submit" size="lg" icon={<Brush />} disabled={ownWord.length < 2} className="!h-12 shrink-0">ხატვა</Btn>
            </div>
          </form>
          <NakhatiOptions />
        </Card>
      )}

      {user && live.length > 0 && (
        <Card className="!p-4 sm:!p-5 space-y-3">
          <button
            type="button"
            aria-expanded={showAll}
            onClick={() => { triggerHaptic(6); setShowAll(v => !v); }}
            className="w-full flex items-center gap-2 text-left cursor-pointer"
          >
            <span className="min-w-0 flex-1">
              <span className="block font-serif-ge text-[16px] font-bold text-[#4a3426]">კლასელების ნახატები</span>
              <span className="block text-[12.5px] leading-snug text-[#75685a]">გამოიცანი, რა დახატეს — აქაც და ჩატშიც</span>
            </span>
            <ChevronDown className={`w-5 h-5 shrink-0 text-[#7a2028] transition-transform ${showAll ? 'rotate-180' : ''}`} />
          </button>
          {showAll && live.map(c => <ClassDrawings key={c.id} cls={c} uid={uid} titled={live.length > 1} />)}
        </Card>
      )}
      <p className="px-1 text-[12px] leading-snug text-[#9a8b7b]">{UNCHECKED}</p>
    </div>
  );
};
