import React, { useMemo, useRef, useState } from 'react';
import { ChevronDown, GripVertical, Music } from 'lucide-react';
import { Check, Note, Num, Press, Rows, SectionLabel, Two, cx } from '../../../components/ui2';
import { useAuth } from '../../../context';
import { useNotes } from '../../../context/NotesContext';
import { SERVICE_LISTS, hasBookNotes, type ServiceName } from '../../../data/chantLookup';
import type { ChantItem, ChantVariant } from '../../../data/tsirvaChants';
import { dayText, toneName } from '../../../utils/dayReadings';
import { rankLabel } from '../../../utils/dayService';
import { triggerHaptic } from '../../../utils/haptics';
import { bookOf, versionTone } from '../../../utils/toneChants';
import { aiGate } from '../../../utils/aiRules';
import {
  autoChants, moveItem, parsePlan, planKey, planList, saveChantPicks, saveDayPlan, useDayPlanStore,
} from '../../../utils/dayPlan';
import { askLado, whyOf, ASSISTANT_PROBLEM_TEXT } from '../damkhmare/ask';
import { AiTeacherError } from '../../../utils/aiTeacher';
import { GearSpark } from '../damkhmare/GearSpark';
import { dayMonthGe, weekdayGe } from '../../../data/churchCalendar';
import type { DayServiceState } from '../../medavitneoba/DayService';

// „საგალობლები“ of the day's open service (2026-11-22, the user: „ტიპიკონის მიხედვით თავიდან თავად ალაგებდეს … მე შემეძლოს
// დალაგება … ლადოს ღილაკი … ვერსიებიდან მოვნიშნავ სასურველს და მონიშნულები დარჩება“): the list starts as the Typikon sets the
// steps; a handle drags a chant up or down (kept for that day's service); „ლადოს პროგრამა“ (superadmins) reads the day's calendar
// and lays the chants out itself; a tap on a chant unfolds its versions — the ticked ones stay for every day and open the notes.

const CHANTS = new Map<string, ChantItem>(SERVICE_LISTS.flatMap(([, list]) => list.map(c => [c.id, c] as const)));
const LIST = new Map(SERVICE_LISTS);
const clean = (t: string) => t.replace(/;\s*$/, '');
const versionLabel = (v: ChantVariant) => `${bookOf(v)}${v.bookNums?.[0] ? ` №${v.bookNums[0]}` : v.numLabel ? ` №${v.numLabel}` : ''}`;
const versionSub = (v: ChantVariant) => [v.version, v.source].filter(Boolean).join(' · ');

/** the lists Lado may pick from, by service */
const OFFER: Record<string, ServiceName[]> = {
  liturgy: ['წირვა', 'მომიხსენენი', 'სადღესასწაულო', 'მარხვანი', 'ზატიკი'],
  vespers: ['მწუხრი', 'დასადებლები', 'სადღესასწაულო', 'მარხვანი', 'ზატიკი'],
  matins: ['ცისკარი', 'ძლისპირები', 'კატაბასიები', 'სადღესასწაულო', 'მარხვანი', 'ზატიკი'],
  hours: ['მარხვანი', 'სადღესასწაულო'],
  compline: ['მარხვანი'],
};

const SHOWN = 8;

export const DayPlan: React.FC<{ d: DayServiceState }> = ({ d }) => {
  const { user, isSuperAdmin } = useAuth();
  const { openNotes } = useNotes();
  const store = useDayPlanStore(user?.uid);
  const [local, setLocal] = useState<Record<string, string[]>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [all, setAll] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; why?: string } | null>(null);
  const list = useRef<HTMLDivElement>(null);

  const key = planKey(d.iso, d.service.id);
  const auto = useMemo(() => autoChants(d.service.steps).filter(id => CHANTS.get(id)?.variants.some(hasBookNotes)), [d.service.steps]);
  const saved = user ? store.plans[key] : local[key];
  const ids = planList(saved, auto, id => CHANTS.has(id));
  // the week's tone first under a chant its step sings in that tone
  const toned = useMemo(() => new Set(d.service.steps.filter(s => s.toned).flatMap(s => s.chants ?? [])), [d.service.steps]);

  const keep = (next: string[] | null) => {
    if (user) void saveDayPlan(user.uid, key, next);
    else setLocal(l => { const c = { ...l }; if (next) c[key] = next; else delete c[key]; return c; });
  };
  const picksOf = (id: string) => store.picks[id] ?? [];
  const flipPick = (id: string, vid: string) => {
    if (!user) return;
    triggerHaptic(8);
    const cur = picksOf(id);
    void saveChantPicks(user.uid, id, cur.includes(vid) ? cur.filter(x => x !== vid) : [...cur, vid]);
  };

  // drag the handle: the others step aside while the finger moves (as the regent's program)
  const startDrag = (e: React.PointerEvent<HTMLElement>) => {
    if (!list.current) return;
    e.preventDefault();
    e.stopPropagation();
    setOpen(null);
    const handle = e.currentTarget;
    const li = handle.closest<HTMLElement>('[data-dp]');
    if (!li) return;
    const rows = [...list.current.querySelectorAll<HTMLElement>('[data-dp]')];
    const from = rows.indexOf(li);
    const step = li.offsetHeight;
    const y0 = e.clientY;
    let to = from;
    li.style.position = 'relative';
    li.style.zIndex = '2';
    li.style.opacity = '0.92';
    try { handle.setPointerCapture(e.pointerId); } catch { /* the finger is gone */ }
    const move = (ev: PointerEvent) => {
      const dy = ev.clientY - y0;
      li.style.transform = `translateY(${dy}px)`;
      to = Math.max(0, Math.min(rows.length - 1, from + Math.round(dy / step)));
      rows.forEach((r, j) => {
        if (r === li) return;
        const off = j > from && j <= to ? -step : j < from && j >= to ? step : 0;
        r.style.transition = 'transform 0.15s';
        r.style.transform = off ? `translateY(${off}px)` : '';
      });
    };
    const up = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
      rows.forEach(r => { r.style.transform = ''; r.style.transition = ''; });
      li.style.position = '';
      li.style.zIndex = '';
      li.style.opacity = '';
      if (to !== from) { triggerHaptic(10); keep(moveItem(ids, from, to)); }
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  };

  // „ლადოს პროგრამა“: the day's calendar, the service's steps and the chants on offer → the chants to sing, in order
  const askPlan = async () => {
    if (!user || busy) return;
    triggerHaptic(10);
    setBusy(true);
    setMsg(null);
    try {
      const stop = await aiGate(user.uid);
      if (stop) throw new AiTeacherError(stop);
      const offer = new Map<string, string>();
      for (const id of auto) offer.set(id, clean(CHANTS.get(id)!.title));
      for (const name of OFFER[d.service.id] ?? []) {
        for (const c of LIST.get(name) ?? []) if (!offer.has(c.id) && c.variants.some(hasBookNotes)) offer.set(c.id, `${clean(c.title)} (${name})`);
      }
      const steps = d.service.steps.map((s, i) => `${i + 1}. ${s.title}${s.chants?.length ? ` → ${s.chants.filter(id => offer.has(id)).join(', ')}` : ''}`).join('\n');
      const prompt = [
        'შენ ხარ მართლმადიდებელი ეკლესიის გამოცდილი რეგენტი და ტიპიკონის მცოდნე (ქართული ეკლესია).',
        `დღე: ${weekdayGe(d.iso)}, ${dayMonthGe(d.iso)} (${d.iso}).${d.tone ? ` კვირის ${toneName(d.tone)}.` : ''} რანგი: ${rankLabel(d.rank)}.${d.great ? ` დღესასწაული: ${d.great.name}.` : ''}`,
        d.day ? `ეკლესიის კალენდარი ამ დღისთვის:\n${dayText(d.day).slice(0, 2500)}` : 'კალენდრის ტექსტი ამ დღისთვის არ არის.',
        `მსახურება: ${d.service.title}. მისი ნაწილები ტიპიკონით (→ საგალობლები, რომლებიც აპმა ამ ნაწილს მიაბა):\n${steps}`,
        `შესაძლო საგალობლები (id | სახელი):\n${[...offer].map(([id, t]) => `${id} | ${t}`).join('\n')}`,
        'დაალაგე, რა იგალობება ამ დღის ამ მსახურებაზე, იმ რიგით, როგორც იგალობება — კალენდრისა და ტიპიკონის მიხედვით (დღესასწაულის, წმიდანის, ხმის, მარხვის თუ ზატიკის წესი). აირჩიე მხოლოდ სიიდან; რაც ამ დღეს არ იგალობება, არ ჩასვა.',
        'უპასუხე მხოლოდ JSON-ით: {"ids": ["id", ...], "note": "ერთი-ორი მოკლე წინადადება ქართულად — რატომ ასე"}',
      ].join('\n\n');
      const plan = parsePlan(await askLado(prompt), new Set(offer.keys()));
      if (!plan) throw Object.assign(new AiTeacherError('failed'), { why: 'პასუხში საგალობლები ვერ ვიპოვე' });
      keep(plan.ids);
      setMsg({ text: plan.note || 'ლადომ დაალაგა.' });
    } catch (e) {
      const problem = e instanceof AiTeacherError ? e.kind : 'failed';
      setMsg({ text: ASSISTANT_PROBLEM_TEXT[problem] ?? ASSISTANT_PROBLEM_TEXT.failed, why: whyOf(e) || undefined });
    } finally {
      setBusy(false);
    }
  };

  if (!auto.length && !ids.length) return null;
  const custom = !!saved;

  return (
    <div className="flex flex-col gap-1.5">
      <SectionLabel
        label={`საგალობლები · ${ids.length}`}
        right={isSuperAdmin && user ? (
          <Press onClick={askPlan} disabled={busy} aria-busy={busy}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-wine px-3.5 text-meta font-bold text-white transition active:scale-[0.97] disabled:opacity-60">
            <GearSpark className={cx('size-4', busy && 'animate-spin')} />
            {busy ? 'ლადო ალაგებს…' : 'ლადოს პროგრამა'}
          </Press>
        ) : undefined}
      />
      {msg && (
        <Note>
          {msg.text}
          {msg.why && <span className="mt-0.5 block text-meta text-faint">{msg.why}</span>}
        </Note>
      )}
      <Rows aria-label="საგალობლები">
        <div ref={list} className="divide-y divide-line">
          {ids.map((id, n) => {
            const c = CHANTS.get(id)!;
            const picks = picksOf(id);
            const versions = c.variants.filter(hasBookNotes);
            const tone = toned.has(id) && d.tone ? d.tone : null;
            const sorted = [...versions].sort((a, b) =>
              Number(picks.includes(b.id)) - Number(picks.includes(a.id))
              || Number(!!tone && versionTone(b.version) === tone) - Number(!!tone && versionTone(a.version) === tone));
            const isOpen = open === id;
            const shown = all === id ? sorted : sorted.slice(0, Math.max(SHOWN, picks.length));
            const pickedNames = versions.filter(v => picks.includes(v.id)).map(versionLabel);
            const sub = pickedNames.length ? `✓ ${pickedNames.join(' · ')}` : `${versions.length} ვერსია${tone ? ` · ${toneName(tone)}` : ''}`;
            return (
              <div key={id} data-dp className="flex flex-col bg-surf">
                <div className="flex items-center">
                  <Press onClick={() => { triggerHaptic(8); setOpen(isOpen ? null : id); }} aria-expanded={isOpen}
                    className="flex min-h-row min-w-0 flex-1 cursor-pointer items-center gap-2.5 py-2 pr-1 pl-4 text-left transition-colors active:bg-soft">
                    <Num n={n + 1} on={isOpen} />
                    <Two title={clean(c.title)} sub={<span className={cx(pickedNames.length > 0 && 'font-semibold text-wine')}>{sub}</span>} wrap />
                    <ChevronDown aria-hidden="true" className={cx('size-[18px] shrink-0 text-mut transition-transform', isOpen ? 'rotate-180' : '-rotate-90')} strokeWidth={2} />
                  </Press>
                  <span role="button" aria-label={`${clean(c.title)}: გადაადგილება`} title="გადაადგილება" onPointerDown={startDrag}
                    className="flex size-tap shrink-0 cursor-grab touch-none items-center justify-center text-faint select-none">
                    <GripVertical aria-hidden="true" className="size-5" strokeWidth={1.75} />
                  </span>
                </div>
                {isOpen && (
                  <div className="sg-in flex flex-col pb-2">
                    {shown.map(v => {
                      const on = picks.includes(v.id);
                      const vs = versionSub(v);
                      return (
                        <div key={v.id} className="flex items-center gap-1 pr-2 pl-3">
                          <Press onClick={() => flipPick(id, v.id)} disabled={!user} aria-pressed={on}
                            className="flex min-h-tap min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-tile py-1.5 pl-1 text-left active:bg-soft disabled:cursor-default">
                            <Check on={on} size={26} />
                            <span className="flex min-w-0 flex-1 flex-col">
                              <span className={cx('text-body leading-snug font-bold wrap-break-word', on && 'text-wine')}>{versionLabel(v)}</span>
                              {vs && <span className="text-meta text-mut wrap-break-word">{vs}</span>}
                            </span>
                          </Press>
                          <Press onClick={() => { triggerHaptic(10); openNotes(v.id, 'list'); }} aria-label={`${versionLabel(v)} — ნოტები`}
                            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-tint text-wine active:brightness-95">
                            <Music className="size-4" strokeWidth={1.9} aria-hidden="true" />
                          </Press>
                        </div>
                      );
                    })}
                    {sorted.length > shown.length && (
                      <Press onClick={() => setAll(id)} className="mx-4 mt-1 min-h-tap cursor-pointer text-left text-meta font-bold text-wine">
                        ყველა ვერსია · {sorted.length}
                      </Press>
                    )}
                    {!user && <p className="px-4 pt-1 text-meta text-mut">მონიშვნა შესვლის შემდეგ შეგიძლია.</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Rows>
      <div className="flex flex-wrap items-center gap-x-3 px-1.5">
        <p className="min-w-0 flex-1 text-meta leading-normal text-mut">
          {custom ? 'შენი რიგია.' : 'რიგი ტიპიკონითაა.'} გადაადგილება — ⋮⋮-ით; შეხებით — ვერსიები, მონიშნული რჩება.
        </p>
        {custom && (
          <Press onClick={() => { triggerHaptic(8); keep(null); setMsg(null); }} className="min-h-tap cursor-pointer text-meta font-bold text-wine">
            ტიპიკონით დალაგება
          </Press>
        )}
      </div>
    </div>
  );
};
