import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Headphones, Loader2, Mic, MicVocal, Play, RotateCcw, Square, Trophy } from 'lucide-react';
import { makeTimeMap } from '../../../utils/chantSynth';
import { singingSupported } from '../../../utils/singCapture';
import { partShares, placeOf } from '../../../utils/trio';
import type { VoiceTake } from '../../../utils/voiceRecorder';
import { Bar, Btn, Card, Pill, Toggle } from '../../../components/ui/kit';
import { Chip } from '../../../components/games/Chip';
import { TableScreen } from '../../../components/games/TableScreen';
import { PartPicture } from '../../../components/learn/PartPicture';
import { pctTone } from '../turniri/Sing';
import { trioChants } from './chants';
import { ChantPicker } from './ChantPicker';
import { ClassSend } from '../../../components/games/ClassSend';
import { Lane, hintOf } from './Lane';
import { trioMix } from './mix';
import { SLOW, VOICE_LABELS, VOICE_SHORT, lengthText, openingIsWhole, sectionOf, systemAt, trioVoices, useChantScore, type LoadedChant, type Section } from './plan';
import { keepBest, readConf, saveConf, useBest, type TrioConf } from './store';
import { useMine } from '../../../components/games/useMine';
import { useTrioTake, type TrioTake } from './useTrioTake';

// „მესამე ხმა“ alone (the plan's „ონლაინ“: in the app, in earphones): a chant, my voice, its opening or the whole, the
// speed. The phone sings the other two voices, I sing mine, the mirror shows how I follow; then the score, how each line
// went, the three voices heard together, and the trio to the class chat. The best take of each chant and voice stays on
// this phone.

const HINT = {
  ok: { text: 'ზუსტად!', cls: 'bg-[#2f7d4f] text-white' },
  up: { text: '↑ უფრო მაღლა', cls: 'bg-[#a0703c] text-white' },
  down: { text: '↓ უფრო დაბლა', cls: 'bg-[#a0703c] text-white' },
} as const;

const clock = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;

/** the take's screen: counting in, singing with the mirror, then the score and what can be done with it */
const SingScreen: React.FC<{
  take: TrioTake; title: string; loaded: LoadedChant; section: Section; voice: number; speed: number; guide: boolean; whole: boolean;
  chantId: string; onClose: () => void;
}> = ({ take, title, loaded, section, voice, speed, guide, whole, chantId, onClose }) => {
  const [record, setRecord] = useState<boolean | null>(null);
  const [mixUrl, setMixUrl] = useState<string | null>(null);
  const [mixing, setMixing] = useState(false);
  const [mixFailed, setMixFailed] = useState(false);
  const mixRef = useRef<Promise<VoiceTake> | null>(null);
  const toBeat = useMemo(() => makeTimeMap(loaded.score.tempos).toBeat, [loaded.score]);
  const plan = { score: loaded.score, voice, from: section.from, to: section.to, speed, guide, notes: section.notes };

  // a new take (in the tap: the phone lets sound start only there)
  const begin = () => {
    mixRef.current = null;
    setMixUrl(u => { if (u) URL.revokeObjectURL(u); return null; });
    setMixFailed(false);
    setRecord(null);
    void take.start(plan);
  };
  useEffect(() => () => { if (mixUrl) URL.revokeObjectURL(mixUrl); }, [mixUrl]);

  const r = take.result;
  useEffect(() => {
    if (r && r.complete) setRecord(keepBest(chantId, voice, whole, r.pct));
  }, [r]); // eslint-disable-line react-hooks/exhaustive-deps

  const mix = () => {
    if (!r?.mp3) return Promise.reject(new Error('no take'));
    mixRef.current ??= trioMix({ score: loaded.score, voice, from: section.from, to: Math.min(section.to, r.until), speed }, r.mp3, r.delay);
    return mixRef.current;
  };
  const listen = async () => {
    setMixing(true);
    setMixFailed(false);
    try {
      const t = await mix();
      setMixUrl(URL.createObjectURL(t.mp3));
    } catch {
      mixRef.current = null;
      setMixFailed(true);
    } finally {
      setMixing(false);
    }
  };

  const live = take.live();
  const frames = r ? r.frames : (live?.frames ?? []).map(f => ({ t: f.t / 1000, midi: f.midi }));
  const place = r ? placeOf(section.from, r.delay, speed) : live?.place ?? (() => -1e9);
  const hint = take.state === 'sing' ? hintOf(section.notes, frames, place) : null;
  const beat = take.state === 'sing' ? toBeat(take.now) : null;
  const sys = beat !== null ? systemAt(loaded.score, beat) : null;
  const lines = loaded.parts.filter(p => p.s0 < section.to - 0.05);
  const shares = r ? partShares(section.notes, r.credits, lines, r.until) : [];
  const hits = r ? r.credits.filter((c, i) => c >= 0.5 && section.notes[i][0] < r.until).length : 0;
  const counted = r ? section.notes.filter(n => n[0] < r.until).length : 0;
  const busy = take.state === 'count' || take.state === 'sing';

  return (
    <TableScreen title={title} onClose={onClose} right={<Pill>{VOICE_SHORT[voice]}</Pill>}
      footer={busy ? (
        <Btn full size="lg" kind="ghost" icon={<Square />} onClick={take.stop}>{take.state === 'count' ? 'გაუქმება' : 'დასრულება'}</Btn>
      ) : take.state === 'done' ? (
        <div className="grid grid-cols-2 gap-2.5">
          <Btn size="lg" kind="ghost" icon={<RotateCcw />} onClick={begin}>ხელახლა</Btn>
          <Btn size="lg" onClick={onClose}>დახურვა</Btn>
        </div>
      ) : take.state === 'idle' ? (
        <Btn full size="lg" icon={<Mic />} onClick={begin}>დაწყება</Btn>
      ) : undefined}
    >
      <div className="mx-auto w-full max-w-xl flex flex-col gap-3 pt-1">
        {take.problem && <p className="rounded-2xl bg-red-50 ring-1 ring-red-200 px-4 py-3 text-[14px] font-bold leading-snug text-[#b3261e]" role="alert">{take.problem}</p>}
        {(busy || take.state === 'idle') && (
          <>
            <div className="flex items-center justify-between gap-2 min-h-9">
              {hint ? (
                <span className={`inline-flex items-center h-9 px-3.5 rounded-full text-[14px] font-bold ${HINT[hint].cls}`} role="status">{HINT[hint].text}</span>
              ) : (
                <span className="text-[13.5px] font-bold text-[#75685a]">{take.state === 'count' ? 'მოემზადე — შენი პირველი ნოტი ჟღერს' : take.state === 'sing' ? 'იმღერე შენი ხმა' : ''}</span>
              )}
              {take.state === 'sing' && (
                <span className="text-[13px] font-bold tabular-nums text-[#75685a]">{clock((take.now - section.from) / speed)} / {clock((section.to - section.from) / speed)}</span>
              )}
            </div>
            <div className="relative rounded-3xl bg-white ring-1 ring-[#e8dcc8] shadow-[0_1px_2px_rgba(74,52,38,0.05)] overflow-hidden">
              <Lane notes={section.notes} now={take.state === 'sing' ? take.now : section.from} speed={speed} frames={frames} place={place} height={200} />
              {take.state === 'count' && (
                <span className="absolute inset-0 flex items-center justify-center bg-white/60" aria-live="assertive">
                  <span key={take.count} className="font-serif-ge text-[72px] font-bold leading-none text-[#7a2028] animate-[samosi-pop_0.45s_ease-out]">{take.count}</span>
                </span>
              )}
            </div>
            <Bar value={Math.max(0, take.now - section.from)} max={section.to - section.from} />
            {sys !== null && <PartPicture score={loaded.score} sys={[sys]} beat={beat} />}
          </>
        )}
        {take.state === 'score' && (
          <p className="flex items-center justify-center gap-2 py-16 text-[15px] font-bold text-[#75685a]"><Loader2 className="w-5 h-5 animate-spin" />ვითვლი…</p>
        )}
        {take.state === 'done' && r && (
          <>
            <div className="text-center pt-2" role="status">
              <p className={`font-serif-ge text-[56px] font-bold leading-none tabular-nums ${pctTone(r.pct)}`}>{r.pct}%</p>
              <p className="mt-2 text-[14px] font-bold text-[#75685a]">{hits} / {counted} ნოტი სწორად</p>
              {record === true && <p className="mt-2 inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[#c9962a]/15 text-[13.5px] font-bold text-[#8a6d12]"><Trophy className="w-4 h-4" />ახალი რეკორდი!</p>}
              {!r.complete && <p className="mt-2 text-[13px] leading-snug text-[#75685a]">შუაში გაჩერდი: ქულა ნამღერს ითვლის, რეკორდი — მხოლოდ ბოლომდე ნამღერს.</p>}
            </div>
            <div className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] overflow-hidden">
              <Lane notes={section.notes.filter(n => n[0] < r.until)} now={null} speed={speed} frames={frames} place={place}
                credits={r.credits} height={150} />
            </div>
            {shares.filter(x => x !== null).length > 1 && (
              <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3 space-y-2">
                <p className="text-[13px] font-bold text-[#75685a]">სტრიქონები</p>
                {shares.map((s, i) => s === null ? null : (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-6 shrink-0 text-[13px] font-bold tabular-nums text-[#4a3426]">{i + 1}</span>
                    <div className="flex-1"><Bar value={s} max={100} tone={s >= 80 ? 'green' : 'wine'} /></div>
                    <span className={`w-11 shrink-0 text-right text-[13.5px] font-bold tabular-nums ${pctTone(s)}`}>{s}%</span>
                  </div>
                ))}
              </section>
            )}
            {(r.mp3 || r.making) && (
              <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3.5 space-y-3">
                <p className="text-[13px] font-bold text-[#75685a]">სამივე ხმა ერთად — ტელეფონის ორი და შენი</p>
                {mixUrl ? (
                  <audio controls autoPlay src={mixUrl} className="w-full" />
                ) : (
                  <Btn full size="lg" kind="soft" disabled={mixing || r.making} onClick={() => { void listen(); }}
                    icon={mixing || r.making ? <Loader2 className="animate-spin" /> : <Play />}>
                    {r.making ? 'ჩანაწერი მზადდება…' : mixing ? 'ვამზადებ…' : 'მოუსმინე სამივეს'}
                  </Btn>
                )}
                {mixFailed && <p className="text-[13px] font-bold text-[#b3261e]">ვერ მომზადდა — სცადე ხელახლა.</p>}
                {r.mp3 && <ClassSend text={`🎵 მესამე ხმა — ${title}\n${VOICE_SHORT[voice]}${whole ? '' : ' · დასაწყისი'} · ${r.pct}%`} make={mix} />}
              </section>
            )}
          </>
        )}
      </div>
    </TableScreen>
  );
};

export const TrioSolo: React.FC = () => {
  const { program } = useMine();
  const chants = useMemo(() => trioChants(program), [program]);
  const [conf, setConfState] = useState<TrioConf>(readConf);
  const setConf = (patch: Partial<TrioConf>) => setConfState(c => { const n = { ...c, ...patch }; saveConf(n); return n; });
  const chant = chants.find(c => c.id === conf.chant) ?? chants[0] ?? null;
  const { loaded, failed } = useChantScore(chant?.book, chant?.num);
  const voices = trioVoices(loaded);
  const voice = Math.min(conf.voice, voices - 1);
  const speed = conf.slow ? SLOW : 1;
  // a short chant's opening is all of it: no choice, and it counts as sung whole
  const short = loaded ? openingIsWhole(loaded) : false;
  const whole = conf.whole || short;
  const opening = loaded ? sectionOf(loaded, voice, false) : null;
  const section = loaded ? sectionOf(loaded, voice, whole) : null;
  const best = useBest(chant?.id ?? '', voice, whole);
  const [open, setOpen] = useState(false);
  const can = singingSupported();
  const take = useTrioTake();
  const start = () => {
    if (!loaded || !section) return;
    setOpen(true);
    void take.start({ score: loaded.score, voice, from: section.from, to: section.to, speed, guide: conf.guide, notes: section.notes });
  };

  return (
    <>
      <Card className="!p-4 sm:!p-5 space-y-4">
        <div className="flex items-start gap-3">
          <span className="w-11 h-11 shrink-0 rounded-full bg-[#7a2028]/[0.08] text-[#7a2028] flex items-center justify-center"><MicVocal className="w-5 h-5" /></span>
          <div className="min-w-0">
            <p className="font-serif-ge text-[17px] font-bold leading-snug text-[#4a3426]">მესამე ხმა — შენ</p>
            <p className="mt-0.5 text-[13px] leading-snug text-[#75685a]">ტელეფონი საგალობლის ორ ხმას გალობს, მესამეს შენ ამბობ. ეკრანზე ჩანს, როგორ მიჰყვები; ბოლოს სამივე ხმას ერთად მოისმენ.</p>
          </div>
        </div>
        <ChantPicker chants={chants} value={chant} onChange={c => setConf({ chant: c.id })} />
        <div className="space-y-2">
          <p className="text-[13px] font-bold text-[#75685a]">შენი ხმა</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="შენი ხმა">
            {VOICE_LABELS.slice(0, voices).map((label, v) => <Chip key={v} on={voice === v} onClick={() => setConf({ voice: v })}>{label}</Chip>)}
          </div>
        </div>
        {short && loaded ? (
          <p className="text-[13px] font-bold text-[#75685a]">მოკლე საგალობელია — მთლიანად, {lengthText(loaded.duration / speed)}</p>
        ) : (
          <div className="space-y-2">
            <p className="text-[13px] font-bold text-[#75685a]">რამდენი</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="რამდენი">
              <Chip on={!conf.whole} onClick={() => setConf({ whole: false })}>დასაწყისი{opening ? ` · ${lengthText((opening.to - opening.from) / speed)}` : ''}</Chip>
              <Chip on={conf.whole} onClick={() => setConf({ whole: true })}>მთლიანად{loaded ? ` · ${lengthText(loaded.duration / speed)}` : ''}</Chip>
            </div>
          </div>
        )}
        <div className="space-y-2">
          <p className="text-[13px] font-bold text-[#75685a]">ტემპი</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="ტემპი">
            <Chip on={!conf.slow} onClick={() => setConf({ slow: false })}>ჩვეულებრივ</Chip>
            <Chip on={conf.slow} onClick={() => setConf({ slow: true })}>ნელა</Chip>
          </div>
        </div>
        <div className="border-t border-[#efe5d4] pt-1">
          <Toggle on={conf.guide} onChange={g => setConf({ guide: g })} label="ჩემი ხმაც ჩუმად ჟღერდეს" hint="მინიშნებად, სანამ ისწავლი" />
        </div>
        <p className="flex items-start gap-2 text-[13px] leading-snug text-[#75685a]">
          <Headphones className="w-5 h-5 shrink-0 text-[#7a2028]" />
          ყურსასმენი გაიკეთე: ორ ხმას ყურში გაიგებ, მიკროფონი კი მხოლოდ შენსას მოისმენს.
        </p>
        {!can && <p className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 px-4 py-3 text-[13.5px] font-bold leading-snug text-amber-900">ამ ბრაუზერში მიკროფონი არ მუშაობს — სცადე Chrome ან Safari.</p>}
        {failed && <p className="text-[13.5px] font-bold text-[#b3261e]">ნოტები ვერ ჩაიტვირთა — შეამოწმე ინტერნეტი.</p>}
        {section && !section.notes.length && <p className="text-[13.5px] font-bold text-[#a0703c]">ამ ხმას აქ ნოტები არ აქვს — სხვა ხმა აირჩიე.</p>}
        <div className="flex items-center gap-3">
          <Btn size="lg" className="flex-1" icon={loaded || failed ? <Mic /> : <Loader2 className="animate-spin" />}
            disabled={!can || !loaded || !section?.notes.length} onClick={start}>
            დაწყება
          </Btn>
          {best !== null && (
            <span className="shrink-0 flex flex-col items-end">
              <span className="text-[12px] font-bold text-[#8a7a6a]">საუკეთესო</span>
              <span className={`font-serif-ge text-[20px] font-bold leading-none tabular-nums ${pctTone(best)}`}>{best}%</span>
            </span>
          )}
        </div>
      </Card>
      {open && loaded && section && chant && (
        <SingScreen take={take} title={chant.title} loaded={loaded} section={section} voice={voice} speed={speed} guide={conf.guide}
          whole={whole} chantId={chant.id} onClose={() => { take.reset(); setOpen(false); }} />
      )}
    </>
  );
};
