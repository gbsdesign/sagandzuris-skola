import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, BookOpen, CalendarDays, CircleCheck, Hourglass, Loader2, Mic, Sparkles, WifiOff, X } from 'lucide-react';
import { useAuth } from '../../../context';
import { useAccess } from '../../../hooks/useAccess';
import { Card, Dot, H2, Note, RoundButton, Row, Rows, SectionLabel, TopBar } from '../../../components/ui2';
import { MK_ANSWERS, MK_FREQUENT, MK_TEXT, MK_TOPICS, mkAnswer, type MkTopicId } from '../../../data/mkitkhe';
import { keepMkAnswer, matchQuestion, relatedOf } from '../../../utils/mkitkhe';
import { useVoiceSearch, voiceSupported } from '../../shell/voiceSearch';
import { VoiceSheet } from '../../shell/search/VoiceSheet';
import { askMkitkheAi, MK_AI_PROBLEM, MkAiError } from './ai';
import { useGoTarget } from './goTo';
import { AnswerBody, GoButton, MyBubble, Pills, QuestionRows, ReplyBubble, TopicRows } from './parts';

// „მკითხე“ (boards x-ultra-mkitkhe-1 start · x-ultra-mkitkhe ready answer · -3 AI's answer · -4 not about the app · -5 the AI's
// day is over): a question typed, said or picked → a ready answer first (free, offline too), only when none is near → the AI
// (while „ავტომატური სასწავლო პროგრამა“ is open for the person, ten a day). Every answer: one to three short sentences and
// „გადამიყვანე იქ“. A question of faith is not answered — the priest's matter.

type Reply =
  | { kind: 'ready'; id: number }
  | { kind: 'thinking' }
  | { kind: 'ai'; text: string; target: number | null; at: number; helped?: boolean }
  | { kind: 'faith' }
  | { kind: 'none'; note?: string }
  | { kind: 'limit' }
  | { kind: 'offline' };

interface Turn { key: number; q: string; reply: Reply }

let turnKey = 0;

export const MkitkheScreen: React.FC<{ query?: string; onClose: (then?: () => void) => void }> = ({ query, onClose }) => {
  const { user } = useAuth();
  const access = useAccess();
  const aiOn = !!user && access.on('aiTeacher');
  const goTarget = useGoTarget();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [topic, setTopic] = useState<MkTopicId | null>(null);
  const [text, setText] = useState('');
  const end = useRef<HTMLDivElement>(null);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const setReply = (key: number, reply: Reply) => setTurns(ts => ts.map(t => (t.key === key ? { ...t, reply } : t)));

  const ask = async (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    setText('');
    setTopic(null);
    const key = ++turnKey;
    const m = matchQuestion(q);
    if (m.kind === 'answer') { setTurns(ts => [...ts, { key, q, reply: { kind: 'ready', id: m.id } }]); return; }
    if (m.kind === 'faith') { setTurns(ts => [...ts, { key, q, reply: { kind: 'faith' } }]); return; }
    // without the AI (not open for the person, or a guest): the ready answers' topics
    if (!aiOn || !user) { setTurns(ts => [...ts, { key, q, reply: { kind: 'none' } }]); return; }
    setTurns(ts => [...ts, { key, q, reply: { kind: 'thinking' } }]);
    try {
      const r = await askMkitkheAi(user.uid, q);
      if (!alive.current) return;
      if (!r.app) { setReply(key, { kind: 'faith' }); return; }
      const at = Date.now();
      keepMkAnswer({ q, a: r.text, target: r.target, at });
      setReply(key, { kind: 'ai', text: r.text, target: r.target, at });
    } catch (err) {
      if (!alive.current) return;
      const kind = err instanceof MkAiError ? err.kind : 'failed';
      if (kind === 'limit') setReply(key, { kind: 'limit' });
      else if (kind === 'offline') setReply(key, { kind: 'offline' });
      else setReply(key, { kind: 'none', note: MK_AI_PROBLEM[kind] });
    }
  };

  // the words the search came with are asked at once
  useEffect(() => { if (query?.trim()) void ask(query); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [query]);
  // the newest reply in view
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [turns]);

  const go = (id: number) => onClose(() => goTarget(id));
  const helped = (key: number, at: number, yes: boolean) => {
    setTurns(ts => ts.map(t => {
      if (t.key !== key || t.reply.kind !== 'ai') return t;
      keepMkAnswer({ q: t.q, a: t.reply.text, target: t.reply.target, at, helped: yes });
      return { ...t, reply: { ...t.reply, helped: yes } };
    }));
  };

  // speech: the sheet listens, the words are asked as they were heard
  const canVoice = useMemo(voiceSupported, []);
  const [listening, setListening] = useState(false);
  const voice = useVoiceSearch(heard => { setListening(false); void ask(heard); });
  const stopVoice = () => { voice.stop(); setListening(false); };

  const back = () => {
    if (topic) setTopic(null);
    else onClose();
  };

  const last = turns[turns.length - 1];
  const topicChips = MK_TOPICS.map(t => ({ key: t.id, label: t.chip, onClick: () => setTopic(t.id) }));

  const replyOf = (t: Turn): React.ReactNode => {
    const r = t.reply;
    switch (r.kind) {
      case 'ready': {
        const a = mkAnswer(r.id);
        return a && (
          <ReplyBubble>
            <AnswerBody a={a} tone="chat" />
            <GoButton onClick={() => go(a.id)} />
          </ReplyBubble>
        );
      }
      case 'thinking':
        return (
          <ReplyBubble className="flex-row items-center">
            <Loader2 aria-hidden="true" className="size-[18px] shrink-0 animate-spin text-wine" />
            <span role="status" className="text-body text-mut">ვეძებ პასუხს…</span>
          </ReplyBubble>
        );
      case 'ai':
        return (
          <>
            <ReplyBubble>
              <p className="text-body leading-normal wrap-break-word">{r.text}</p>
              {r.target !== null && <GoButton onClick={() => go(r.target!)} />}
              <div className="flex items-center gap-1.5 text-cap text-mut">
                <Sparkles aria-hidden="true" className="size-3.5 shrink-0" />{MK_TEXT.aiLine}
              </div>
            </ReplyBubble>
            {r.helped === undefined ? (
              <div className="flex shrink-0 items-center gap-2 pl-1.5">
                <span className="shrink-0 text-meta font-semibold whitespace-nowrap text-mut">{MK_TEXT.helped}</span>
                <RoundButton label="კი, დამეხმარა" onClick={() => helped(t.key, r.at, true)}><CircleCheck strokeWidth={1.75} /></RoundButton>
                <RoundButton label="არა, არ დამეხმარა" onClick={() => helped(t.key, r.at, false)}><X strokeWidth={2} /></RoundButton>
              </div>
            ) : (
              <Note>{r.helped ? 'მადლობა!' : 'მადლობა. სცადე სხვა სიტყვებით ან აირჩიე თემა.'}</Note>
            )}
          </>
        );
      case 'faith':
        return (
          <>
            <ReplyBubble>
              <p className="text-body leading-normal">{MK_TEXT.notApp}</p>
              <p className="text-body leading-normal">{MK_TEXT.notAppLinks}</p>
            </ReplyBubble>
            <Rows>
              <Row lead={<Dot icon={<CalendarDays />} />} title="კალენდარი" sub="დღესასწაულები და დღის საკითხავი" onClick={() => go(23)} />
              <Row lead={<Dot icon={<BookOpen />} />} title="ლოცვანი" sub="დილის, საღამოს და სხვა ლოცვები" onClick={() => go(18)} />
            </Rows>
          </>
        );
      case 'none':
        return (
          <>
            <ReplyBubble>
              <p className="text-body leading-normal">{MK_TEXT.notUnderstood}</p>
            </ReplyBubble>
            {r.note && <Note>{r.note}</Note>}
          </>
        );
      case 'limit':
      case 'offline':
        return (
          <Card className="flex items-center gap-3 bg-tint">
            <Dot icon={r.kind === 'limit' ? <Hourglass /> : <WifiOff />} size={40} />
            <div className="min-w-0">
              {r.kind === 'limit' ? (
                <>
                  <div className="text-lead font-bold">{MK_TEXT.limitTitle}</div>
                  <div className="text-meta leading-snug text-mut">{MK_TEXT.limitSub}</div>
                </>
              ) : (
                <div className="text-lead leading-snug font-bold">{MK_TEXT.offline}</div>
              )}
            </div>
          </Card>
        );
    }
  };

  // what follows the last reply: more of its topic, the topics, or the ready answers' list
  const after = (() => {
    if (!last) return null;
    const r = last.reply;
    if (r.kind === 'ready') {
      const more = relatedOf(r.id);
      return (
        <>
          <SectionLabel label={MK_TEXT.frequent} className="mt-auto" />
          <Pills label={MK_TEXT.frequent} items={more.map(id => ({ key: id, label: mkAnswer(id)!.question, onClick: () => void ask(mkAnswer(id)!.question) }))} />
        </>
      );
    }
    if (r.kind === 'limit' || r.kind === 'offline') {
      return <><SectionLabel label={MK_TEXT.ready} /><TopicRows onPick={setTopic} /></>;
    }
    if (r.kind === 'none' || (r.kind === 'ai' && r.helped === false)) {
      return <><SectionLabel label={MK_TEXT.topics} className="mt-auto" /><Pills label={MK_TEXT.topics} items={topicChips} /></>;
    }
    return null;
  })();

  const topicNow = topic ? MK_TOPICS.find(t => t.id === topic) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mx-auto w-full max-w-[560px] shrink-0 px-4">
        <TopBar title={MK_TEXT.title} sub={MK_TEXT.sub} onBack={back} />
      </div>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex min-h-full w-full max-w-[560px] flex-col gap-3 px-3.5 pt-1.5 pb-4">
          {topicNow ? (
            <>
              <H2>{topicNow.title}</H2>
              <QuestionRows ids={MK_ANSWERS.filter(a => a.topic === topicNow.id).map(a => a.id)} onPick={id => void ask(mkAnswer(id)!.question)} />
            </>
          ) : turns.length === 0 ? (
            <>
              <H2 big className="px-1.5 pt-1.5">{MK_TEXT.startTitle}</H2>
              <Note className="-mt-1">{MK_TEXT.startSub}</Note>
              <SectionLabel label={MK_TEXT.frequent} />
              <QuestionRows label={MK_TEXT.frequent} ids={MK_FREQUENT} onPick={id => void ask(mkAnswer(id)!.question)} />
              <SectionLabel label={MK_TEXT.topics} />
              <Pills label={MK_TEXT.topics} items={topicChips} />
            </>
          ) : (
            <>
              <div aria-live="polite" className="flex flex-col gap-3">
                {turns.map(t => (
                  <React.Fragment key={t.key}>
                    <MyBubble>{t.q}</MyBubble>
                    {replyOf(t)}
                  </React.Fragment>
                ))}
              </div>
              {after}
            </>
          )}
          <div ref={end} />
        </div>
      </main>

      {/* the field: typed, or said (the round 🎤 while it is empty) */}
      <form
        onSubmit={e => { e.preventDefault(); void ask(text); }}
        className="mx-auto flex w-full max-w-[560px] shrink-0 items-center gap-2 px-3 pt-1.5 pb-[max(14px,env(safe-area-inset-bottom))]"
      >
        <label className="flex h-tap-lg min-w-0 flex-1 items-center rounded-full bg-surf px-[18px]">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={MK_TEXT.placeholder}
            aria-label={MK_TEXT.placeholder}
            enterKeyHint="send"
            maxLength={300}
            className="min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-faint"
          />
        </label>
        {text.trim() || !canVoice ? (
          <RoundButton size={48} tone="wine" type="submit" label="გაგზავნა" disabled={!text.trim()}><ArrowUp strokeWidth={2} /></RoundButton>
        ) : (
          <RoundButton size={48} tone="wine" label="ხმით კითხვა" onClick={() => { setListening(true); voice.start(); }}><Mic /></RoundButton>
        )}
      </form>

      <VoiceSheet open={listening} state={voice.state} heard={voice.heard} error={voice.error} onClose={stopVoice} onRetry={voice.start} />
    </div>
  );
};
