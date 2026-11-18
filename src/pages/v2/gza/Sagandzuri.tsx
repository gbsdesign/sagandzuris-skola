import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, GraduationCap, Lock, Mic, Music, Pencil, Share, X } from 'lucide-react';
import { useAuth, useChants, useNavigation, useViewing } from '../../../context';
import {
  Bar, Button, Card, Chips, Dot, Helper, Pill, Press, Row, Rows, RoundButton, SectionLabel, Sheet, TopBar, cx, FOCUS,
} from '../../../components/ui2';
import { PearlIcon } from '../../../components/pearls/PearlIcon';
import { TokenIcon } from '../../../components/pearls/Tokens';
import { PearlFlight, type Flight } from '../../../components/pearls/PearlFlight';
import { chestIdOf } from '../../../components/pearls/LearnChests';
import { useNewWork } from '../../../components/teacher/MyClassWork';
import { triggerFireworks } from '../../../components/views/StudentBookmarkView';
import { useMasteryPath } from '../../../components/mastery/useMasteryPath';
import { usePathMarks } from '../../../hooks/usePathMarks';
import { usePathItemOpener } from '../../../hooks/usePathItemOpener';
import { useAccess } from '../../../hooks/useAccess';
import { pearlOf, type PearlState } from '../../../utils/pathPearls';
import { OTHER_CHANTS } from '../../../utils/pathChests';
import { sortPathItems, usesVoices, voicesOf, type PathItem, type Voice } from '../../../utils/pathItems';
import { SERVICE_LISTS, findVersion } from '../../../data/chantLookup';
import { aiVoices } from '../../../utils/aiPass';
import { openExam } from '../gamocda/open';
import { useExamRecord } from '../gamocda/useExamRecord';
import { useLearnCount } from './useGza';
import { WorkSection } from './Work';
import { ShareLayer } from '../barati';
import { learnedItemOf } from '../barati/useLearned';

// „საგანძური“ (board x-sagandzuri; the canvas's note: „ზემოთ ორი რიცხვი და ერთი დავალება მთავარი ღილაკით. ქვემოთ შენი
// საგალობლები ხმებით. სკივრების სურათები ჩიპებმა შეცვალა“): the two numbers and their bar, the first assignment, then every
// item of the path with its pearl and its voices 1 · 2 · 3 — chips by service (the old chests' grouping, utils/pathChests).
// A voice marked flies as before (PearlFlight: up, shines, into its chest, back); a tap on the pearl says who counted it.
// ✎ swaps the voices for ✕ to take items off the path.

export type VoiceMark = 'off' | 'on' | 'ok';
export type TokenKind = 'pearl' | 'grape' | 'scroll';

export interface TreasureItem {
  id: string;
  name: string;
  /** the grey line: a chant's book code, else what it is */
  sub: string;
  token: TokenKind;
  pearl: PearlState;
  /** voices 1 · 2 · 3 (a chant, a song) or one ✓ (a poem, an instrument) */
  voiced: boolean;
  marks: VoiceMark[];
  /** its chip (a service, the songs, the poems) */
  chip: string;
  /** a tap on its name: the chant's notes, the song… */
  onOpen?: () => void;
}

export interface PearlInfo {
  id?: string;
  name: string;
  /** voices the AI teacher passed (shown as „ჩათვალა AI მასწავლებელმა“) */
  aiVoices?: Voice[];
  /** voices marked and not yet counted that the member can sit the AI teacher's exam in */
  examVoices?: Voice[];
  token: TokenKind;
  pearl: PearlState;
  voiced: boolean;
  marks: VoiceMark[];
}

const SHOWN = 30;

const Token: React.FC<{ kind: TokenKind; state: PearlState; size: number; seed?: string }> = ({ kind, state, size, seed }) =>
  kind === 'pearl'
    ? <PearlIcon state={state} size={size} seed={seed} />
    : <TokenIcon kind={kind} state={state} size={size} />;

const MARK_LOOK: Record<VoiceMark, string> = {
  ok: 'bg-leaf text-white',
  on: 'bg-wine text-white',
  off: 'border-[1.5px] border-dim text-mut',
};

const MARK_WORD: Record<VoiceMark, string> = {
  ok: 'მასწავლებელმა ჩათვალა',
  on: 'შენ მონიშნე',
  off: 'ჯერ არ არის მონიშნული',
};

/** A voice's round, drawn only (34px). */
const Round: React.FC<{ mark: VoiceMark; children: React.ReactNode; className?: string }> = ({ mark, children, className }) => (
  <span className={cx('flex size-[34px] shrink-0 items-center justify-center rounded-full text-meta font-bold tabular-nums transition [&_svg]:size-4', MARK_LOOK[mark], className)}>
    {children}
  </span>
);

const Stat: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <div className="flex flex-col">
    <span className="text-hero leading-[1.1] font-bold tracking-tight tabular-nums">{value}</span>
    <span className="text-meta text-mut">{label}</span>
  </div>
);

/** The page as the board draws it — everything by props. */
export const SagandzuriView: React.FC<{
  onBack: () => void;
  learned: number;
  total: number;
  voices: number;
  voiceSlots: number;
  /** a voice just marked: „+1“ for a moment (the flight's last frame) */
  plus?: boolean;
  /** „დავალება“ (WorkSection) */
  work?: React.ReactNode;
  chips: { id: string; label: string }[];
  chip: string;
  onChip: (id: string) => void;
  items: TreasureItem[];
  onFirstStep: () => void;
  locked: boolean;
  editing: boolean;
  onEdit: () => void;
  onVoice: (id: string, index: number, el: HTMLElement) => void;
  onRemove: (id: string) => void;
  onPearl: (id: string) => void;
  pearl: PearlInfo | null;
  onClosePearl: () => void;
  /** a shining pearl's „გაზიარება“ (the card of a learned chant) */
  onSharePearl?: () => void;
  /** a row „გამოცდა · II ხმა ›“ in the pearl's sheet */
  onExam?: (id: string, voice: Voice) => void;
  mastery?: { level: number; pct: number; onOpen: () => void };
}> = ({
  onBack, learned, total, voices, voiceSlots, plus, work, chips, chip, onChip, items, onFirstStep, locked, editing, onEdit,
  onVoice, onRemove, onPearl, pearl, onClosePearl, onSharePearl, onExam, mastery,
}) => {
  const [more, setMore] = useState(false);
  const shown = chip === 'all' ? items : items.filter(it => it.chip === chip);
  const list = more ? shown : shown.slice(0, SHOWN);
  const share = voiceSlots ? voices / voiceSlots : total ? learned / total : 0;

  const row = (it: TreasureItem) => {
    const name = (
      <span className="flex min-w-0 flex-col">
        <span className="line-clamp-2 text-body leading-tight font-semibold wrap-break-word">{it.name}</span>
        {it.sub && <span className="truncate text-meta text-mut">{it.sub}</span>}
      </span>
    );
    return (
      <div key={it.id} className="flex min-h-[60px] items-center gap-2.5 py-1 pr-2 pl-4">
        <Press onClick={() => onPearl(it.id)} aria-label={`${it.name} — ვინ ჩათვალა`}
          className={cx('-mx-[13px] flex size-tap shrink-0 cursor-pointer items-center justify-center rounded-full', FOCUS)}>
          <span data-token={it.id} className="inline-flex"><Token kind={it.token} state={it.pearl} size={18} seed={it.id} /></span>
        </Press>
        {it.onOpen ? (
          <Press onClick={it.onOpen} className={cx('flex min-h-tap min-w-0 flex-1 cursor-pointer items-center rounded-field text-left', FOCUS)}>{name}</Press>
        ) : (
          <span className="flex min-w-0 flex-1 items-center">{name}</span>
        )}
        {editing ? (
          <RoundButton size={36} tone="page" label={`${it.name} — სიიდან ამოშლა`} onClick={() => onRemove(it.id)} className="mr-1 text-danger">
            <X strokeWidth={2} />
          </RoundButton>
        ) : (
          <span role="group" aria-label="ნასწავლი ხმები" className="flex shrink-0">
            {it.marks.map((m, i) => (
              <Press
                key={i}
                aria-pressed={m !== 'off'}
                aria-label={it.voiced ? `${it.name} — ${i + 1} ხმა` : `${it.name} — ნასწავლი`}
                title={m === 'ok' ? 'მასწავლებელმა ჩათვალა' : locked ? 'მონიშვნას მასწავლებელი აკეთებს' : m === 'on' ? 'ნასწავლია — შეეხე მოსახსნელად' : 'შეეხე, როცა ისწავლი'}
                disabled={locked || m === 'ok'}
                onClick={e => onVoice(it.id, i, (e.currentTarget.firstElementChild as HTMLElement | null) ?? e.currentTarget)}
                className={cx('flex h-tap w-10 cursor-pointer items-center justify-center rounded-full disabled:cursor-default', 'active:[&>span]:scale-90', FOCUS)}
              >
                <Round mark={m} className={locked && m !== 'ok' ? 'opacity-60' : undefined}>
                  {it.voiced ? i + 1 : <Check strokeWidth={2.6} />}
                </Round>
              </Press>
            ))}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="flex w-full flex-col pb-4">
      <TopBar title="საგანძური" onBack={onBack} right={items.length ? (
        <RoundButton label={editing ? 'მზადაა' : 'სიის შეცვლა'} tone={editing ? 'wine' : 'surf'} aria-pressed={editing} onClick={onEdit}
          className="[&_svg]:size-[18px]">
          {editing ? <Check strokeWidth={2.4} /> : <Pencil strokeWidth={1.75} />}
        </RoundButton>
      ) : undefined} />

      <div className="flex flex-col gap-2 pt-0.5">
        <Card pad="none" className="flex flex-col gap-2.5 px-[18px] py-4">
          <div className="flex items-start gap-7">
            <Stat value={`${learned} / ${total}`} label="საგალობელი" />
            {voiceSlots > 0 && <Stat value={`${voices} / ${voiceSlots}`} label="ხმა" />}
            {plus && <Pill className="sg-in mt-1 ml-auto">+1</Pill>}
          </div>
          <Bar value={share} h={8} />
          <p className="text-meta leading-snug text-mut">მონიშნე ხმა, როცა ისწავლი. როცა AI ან მასწავლებელი ჩათვლის, მარგალიტი იბრწყინებს.</p>
        </Card>

        {work}

        <SectionLabel label="ჩემი საგალობლები" />
        {items.length > 0 ? (
          <>
            {chips.length > 2 && <Chips items={chips} value={chip} onChange={id => { setMore(false); onChip(id); }} label="ჩემი საგალობლები" />}
            {locked && !editing && <Helper icon={<Lock />}>მონიშვნას ახლა მასწავლებელი აკეთებს</Helper>}
            <Rows>{list.map(row)}</Rows>
            {shown.length > SHOWN && (
              <Button kind="quiet" size="md" className="self-start" onClick={() => setMore(m => !m)}>
                {more ? 'ნაკლები' : `კიდევ ${shown.length - SHOWN}`}
              </Button>
            )}
          </>
        ) : (
          <Card className="flex flex-col items-start gap-3">
            <p className="text-body text-mut">გზა ჯერ ცარიელია. აირჩიე საგალობელი — აქ გამოჩნდება, რას სწავლობ და რამდენი ისწავლე.</p>
            <Button icon={<Music strokeWidth={2} />} onClick={onFirstStep}>საგალობლები</Button>
          </Card>
        )}

        {mastery && (
          <Rows className="mt-2">
            <Row lead={<Dot icon={<GraduationCap />} />} title="ოსტატობა" sub={`დონე ${mastery.level} · ${Math.round(mastery.pct)}%`} onClick={mastery.onOpen} />
          </Rows>
        )}
      </div>

      <Sheet open={!!pearl} title={pearl?.name ?? ''} onClose={onClosePearl}>
        {pearl && (
          <>
            <Card className="flex items-center gap-3.5">
              <span className="flex size-14 shrink-0 items-center justify-center"><Token kind={pearl.token} state={pearl.pearl} size={52} /></span>
              <span className="flex min-w-0 flex-col">
                <span className="text-lead font-bold">{(() => {
                  const ok = pearl.marks.flatMap((m, i) => (m === 'ok' ? [String(i + 1) as Voice] : []));
                  const byAi = ok.filter(v => pearl.aiVoices?.includes(v));
                  return ok.length === 0 ? 'ჯერ არავის ჩაუთვლია' : byAi.length === ok.length ? 'AI მასწავლებელმა ჩათვალა' : 'მასწავლებელმა ჩათვალა';
                })()}</span>
                <span className="text-meta text-mut">
                  {pearl.pearl === 'shining' ? 'მარგალიტი ბრწყინავს' : pearl.pearl === 'polished' ? 'გაპრიალებულია — შენ მონიშნე' : 'ჯერ არ არის ნასწავლი'}
                </span>
              </span>
            </Card>
            <Rows>
              {pearl.marks.map((m, i) => (
                <Row key={i} lead={<Round mark={m}>{pearl.voiced ? i + 1 : <Check strokeWidth={2.6} />}</Round>}
                  title={pearl.voiced ? `${['I', 'II', 'III'][i]} ხმა` : 'ნასწავლი'} sub={MARK_WORD[m]} />
              ))}
            </Rows>
            {pearl.id && onExam && !!pearl.examVoices?.length && (
              <Rows>
                {pearl.examVoices.map(v => (
                  <Row key={v} lead={<Dot icon={<Mic />} />} title={`გამოცდა · ${['I', 'II', 'III'][Number(v) - 1]} ხმა`} sub="AI მასწავლებელი ჩათვლის"
                    onClick={() => onExam(pearl.id as string, v)} />
                ))}
              </Rows>
            )}
            {pearl.pearl === 'shining' && onSharePearl && (
              <Button full icon={<Share strokeWidth={2} />} onClick={onSharePearl}>გაზიარე</Button>
            )}
          </>
        )}
      </Sheet>
    </div>
  );
};

const KIND_WORD: Record<string, string> = { simghera: 'სიმღერა', mtkmeli: 'მთქმელი', sakravebi: 'საკრავი' };
const CHIP_ORDER = [...SERVICE_LISTS.map(([s]) => `s:${s}`), 'other', 'songs', 'poems'];
const chipLabel = (id: string) =>
  id.startsWith('s:') ? id.slice(2) : id === 'other' ? OTHER_CHANTS : id === 'songs' ? 'სიმღერები' : id === 'poems' ? 'მთქმელი' : id;

/** „საგანძური“ with the member's own path (a guest's device path too). */
export const SagandzuriPage: React.FC<{ onBack: () => void; onMastery: () => void }> = ({ onBack, onMastery }) => {
  const { stats, count } = useLearnCount();
  const { selectedChantVariants, saveVariantsToFirestoreAndStorage } = useChants();
  const { navigateTo } = useNavigation();
  const { locked, confirmed, toggle } = usePathMarks(triggerFireworks);
  const { user } = useAuth();
  const viewing = useViewing();
  const examRec = useExamRecord(user?.uid);
  const openerOf = usePathItemOpener();
  const newWork = useNewWork();
  const access = useAccess();
  const mastery = useMasteryPath().summary;
  const [chip, setChip] = useState('all');
  const [editing, setEditing] = useState(false);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [plus, setPlus] = useState(false);
  const plusTimer = useRef<number | undefined>(undefined);
  const [pearlId, setPearlId] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);

  // the number on „საგანძური“ goes once this page shows the new assignments (also ones coming while it is open)
  useEffect(() => {
    newWork.markSeen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newWork.count]);
  useEffect(() => () => window.clearTimeout(plusTimer.current), []);

  // every item of the path in one steady order (a mark never moves a row): the kinds, then the catalogue's order
  const items = useMemo((): (TreasureItem & { it: PathItem })[] => stats.categories.flatMap(c =>
    sortPathItems([...c.done, ...c.todo]).map(it => {
      const id = it.variantId;
      const voiced = usesVoices(id);
      const have = voicesOf(it, id);
      const ok = confirmed[id] || [];
      return {
        it,
        id,
        name: it.chantName,
        sub: c.id === 'galoba' ? it.code || '' : KIND_WORD[c.id] ?? '',
        token: c.id === 'galoba' ? 'pearl' : c.id === 'mtkmeli' ? 'scroll' : 'grape',
        pearl: pearlOf(it, ok),
        voiced,
        marks: (voiced ? (['1', '2', '3'] as Voice[]) : (['1'] as Voice[])).map((v): VoiceMark => (ok.includes(v) ? 'ok' : have.includes(v) ? 'on' : 'off')),
        chip: chestIdOf(id),
        onOpen: openerOf(id) ?? undefined,
      };
    })), [stats, confirmed, openerOf]);

  const chips = useMemo(() => {
    const n = new Map<string, number>();
    for (const it of items) n.set(it.chip, (n.get(it.chip) ?? 0) + 1);
    return [
      { id: 'all', label: 'ყველა' },
      ...CHIP_ORDER.filter(id => n.has(id)).map(id => ({ id, label: `${chipLabel(id)} · ${n.get(id)}` })),
    ];
  }, [items]);
  const current = chips.some(c => c.id === chip) ? chip : 'all';

  const endFlight = useCallback(() => setFlight(null), []);
  const onVoice = (id: string, index: number, el: HTMLElement) => {
    const item = items.find(x => x.id === id);
    if (!item || locked) return;
    const v = (item.voiced ? ['1', '2', '3'][index] : '1') as Voice;
    const mark = item.marks[index];
    if (mark === 'ok') return;
    toggle(id, v);
    if (mark !== 'off') return;
    // a voice just marked: its pearl rises from the round, shines, drops into its chest and hops back into the row
    setFlight({ n: Date.now(), id, from: el.getBoundingClientRect(), chestId: item.chip, token: item.token, state: item.pearl === 'shining' ? 'shining' : 'polished' });
    if (item.voiced) {
      window.clearTimeout(plusTimer.current);
      plusTimer.current = window.setTimeout(() => {
        setPlus(true);
        plusTimer.current = window.setTimeout(() => setPlus(false), 2400);
      }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 3400);
    }
  };

  const remove = (id: string) => {
    const next = { ...selectedChantVariants };
    delete next[id];
    saveVariantsToFirestoreAndStorage(next);
  };

  const shareItem = shareId ? items.find(x => x.id === shareId) : undefined;
  const shareOf = shareItem ? learnedItemOf(shareItem.id, { chantName: shareItem.name, label: shareItem.it.label }, (confirmed[shareItem.id] || []).filter(v => v) as Voice[]) : null;

  const shownPearl = pearlId ? items.find(x => x.id === pearlId) : undefined;

  return (
    <>
      <SagandzuriView
        onBack={onBack}
        learned={count.learned}
        total={count.total}
        voices={stats.voices}
        voiceSlots={stats.voiceSlots}
        plus={plus}
        work={<WorkSection />}
        chips={chips}
        chip={current}
        onChip={setChip}
        items={items}
        onFirstStep={() => navigateTo('galoba')}
        locked={locked}
        editing={editing}
        onEdit={() => setEditing(e => !e)}
        onVoice={onVoice}
        onRemove={remove}
        onPearl={setPearlId}
        pearl={shownPearl ? {
          id: shownPearl.id, name: shownPearl.name, token: shownPearl.token, pearl: shownPearl.pearl, voiced: shownPearl.voiced, marks: shownPearl.marks,
          aiVoices: aiVoices(examRec.pass, shownPearl.id),
          // a chant with book notes, a voice marked and not counted yet; none on a teacher's look or for a guest
          // the exam belongs to the AI teacher: shown while its switch is open for the person (useAccess)
          examVoices: user && !viewing && access.on('aiTeacher') && shownPearl.voiced && shownPearl.it && findVersion(shownPearl.id)?.variant.bookNums?.length
            ? shownPearl.marks.flatMap((m, i) => (m === 'on' ? [String(i + 1) as Voice] : [])) : [],
        } : null}
        onExam={(id, v) => { setPearlId(null); openExam(id, v); }}
        onClosePearl={() => setPearlId(null)}
        onSharePearl={() => { setShareId(pearlId); setPearlId(null); }}
        mastery={access.on('manera') ? { level: mastery.level, pct: mastery.pct, onOpen: onMastery } : undefined}
      />
      <PearlFlight flight={flight} onDone={endFlight} />
      {shareOf && <ShareLayer item={shareOf} onClose={() => setShareId(null)} />}
    </>
  );
};
