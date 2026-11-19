import React, { useState } from 'react';
import { Baby, CalendarClock, Ellipsis, EyeOff, Info, X } from 'lucide-react';
import { Button, Choice, Dot, Helper, Note, RoundButton, Row, Rows, SectionLabel, Sheet, ToggleRow, TopBar, Val, cx } from '../../../components/ui2';
import { useSectionsEditor } from '../../../components/admin/SectionsTab';
import { EXTRA_SWITCHES, SECTIONS, type SectionId, type SectionState, type SwitchId } from '../../../data/sections';
import { shortDate } from '../../../utils/dateNames';
import { tbilisiToday } from '../../../utils/hangi';
import { useAdmin } from './ctx';
import { Screen } from './parts';
import { ChevIcon } from './Home';

// each state's word and mark (never colour alone: the word is always there)
const LOOK: Record<SectionState, { label: string; dot: string; word: string }> = {
  open: { label: 'ღია', dot: 'bg-leaf', word: 'text-leaf-ink' },
  soon: { label: 'მალე', dot: 'bg-gold', word: 'text-gold-ink' },
  hidden: { label: 'დამალული', dot: 'bg-dim', word: 'text-mut' },
};

const StateWord: React.FC<{ st: SectionState }> = ({ st }) => (
  <span className={cx('flex shrink-0 items-center gap-1.5 text-meta font-bold', LOOK[st].word)}>
    <span aria-hidden="true" className={cx('size-2 rounded-full', LOOK[st].dot)} />{LOOK[st].label}
  </span>
);

/** x-skola-ganyopilebebi — every section a line (its name, „ბავშვებს“ and its state); a tap opens its three choices,
 *  „ბავშვებს“ and the opening day. The site's other parts below (open or hidden). „ყველას დამალვა“ waits in ⋯. */
export const SectionsScreen: React.FC = () => {
  const { back, say } = useAdmin();
  const { saved, state, kids, setSection, hideAll, setDay, toggleKids, ALL } = useSectionsEditor(say);
  const [open, setOpen] = useState<SwitchId | null>(null);
  const [more, setMore] = useState(false);
  const today = tbilisiToday();
  const count = (st: SectionState) => ALL.filter(id => state[id] === st).length;
  const sec = SECTIONS.find(s => s.id === open);
  const extra = EXTRA_SWITCHES.find(s => s.id === open);
  // a built section still „მალე“ may get its day
  const day = sec && state[sec.id] === 'soon' && sec.page ? saved.openOn[sec.id] || '' : null;

  return (
    <Screen>
      <TopBar title="განყოფილებები" onBack={back}
        right={<RoundButton label="მეტი" onClick={() => setMore(true)}><Ellipsis /></RoundButton>} />
      <Note>
        {[`${count('open')} ღია`, count('soon') ? `${count('soon')} მალე` : '', count('hidden') ? `${count('hidden')} დამალული` : ''].filter(Boolean).join(' · ')}.
        {' '}ადმინები ყველაფერს ყოველთვის ხედავენ.
      </Note>
      <Rows>
        {SECTIONS.map(s => {
          const when = state[s.id] === 'soon' && s.page ? saved.openOn[s.id] : '';
          return (
            <Row key={s.id} title={s.label} sub={when ? `იხსნება ${shortDate(`${when}T12:00:00`)}` : undefined} onClick={() => setOpen(s.id)}
              right={(
                <span className="flex shrink-0 items-center gap-2.5">
                  {s.page && kids.includes(s.id) && <Baby aria-label="ბავშვებს" className="size-4 text-mut" />}
                  <StateWord st={state[s.id]} />
                  <ChevIcon />
                </span>
              )} />
          );
        })}
      </Rows>
      <SectionLabel label="საიტის სხვა ნაწილები" />
      <Rows>
        {EXTRA_SWITCHES.map(x => (
          <Row key={x.id} title={x.label} sub={x.hint} onClick={() => setOpen(x.id)}
            right={<span className="flex shrink-0 items-center gap-2.5"><StateWord st={state[x.id] === 'open' ? 'open' : 'hidden'} /><ChevIcon /></span>} />
        ))}
      </Rows>
      <Helper icon={<Baby />}>„ბავშვებს“ — განყოფილება ჩანს საბავშვო რეჟიმშიც (ახლად ჩართული რეჟიმის საწყისი სია).</Helper>
      <Helper icon={<Info />}>ყოველი შეხება მაშინვე ინახება და ყველასთან იცვლება; რამდენიმე წამი „გაუქმება“ ჩანს.</Helper>

      <Sheet open={!!sec} onClose={() => setOpen(null)} title={sec?.label || ''}>
        {sec && (
          <>
            {sec.hint && <Note>{sec.hint}</Note>}
            <Rows role="radiogroup" aria-label="მდგომარეობა">
              {(['open', 'soon', 'hidden'] as SectionState[]).map(st => (
                <Choice key={st} title={LOOK[st].label} on={state[sec.id] === st} disabled={st === 'open' && !sec.page}
                  sub={st === 'open' ? (sec.page ? 'ყველას უჩანს' : 'ჯერ არ არის აწყობილი') : st === 'soon' ? 'ჩანს „მალე“-ს ნიშნით' : 'ადმინების გარდა არავის უჩანს'}
                  onClick={() => void setSection(sec.id, st)} />
              ))}
            </Rows>
            {sec.page && (
              <Rows>
                <ToggleRow lead={<Dot icon={<Baby />} />} title="ბავშვებს" sub="საბავშვო რეჟიმშიც ჩანს" on={kids.includes(sec.id)}
                  onChange={() => void toggleKids(sec.id as SectionId)} />
              </Rows>
            )}
            {day !== null && <OpenDay id={sec.id} day={day} today={today} onSet={(id, v) => void setDay(id, v)} />}
          </>
        )}
      </Sheet>

      <Sheet open={!!extra} onClose={() => setOpen(null)} title={extra?.label || ''}>
        {extra && (
          <>
            <Note>{extra.hint}</Note>
            <Rows role="radiogroup" aria-label="მდგომარეობა">
              {(['open', 'hidden'] as SectionState[]).map(st => (
                <Choice key={st} title={LOOK[st].label} on={(state[extra.id] === 'open') === (st === 'open')}
                  sub={st === 'open' ? 'ყველას უჩანს' : 'ადმინების გარდა არავის უჩანს'}
                  onClick={() => { if ((state[extra.id] === 'open') !== (st === 'open')) void setSection(extra.id, st); }} />
              ))}
            </Rows>
          </>
        )}
      </Sheet>

      <Sheet open={more} onClose={() => setMore(false)} title="განყოფილებები">
        <Rows>
          <Row lead={<Dot icon={<EyeOff />} color="soft" />} title="ყველას დამალვა" tone="danger" wrap
            sub="ყველა განყოფილება და ნაწილი დაიმალება ყველასთვის, ადმინების გარდა"
            onClick={() => { setMore(false); void hideAll(); }} />
        </Rows>
      </Sheet>
    </Screen>
  );
};

/** „გახსნის დღე“: a „მალე“ section opens by itself that day in Georgia; any other state set by hand clears it. */
const OpenDay: React.FC<{ id: SectionId; day: string; today: string; onSet: (id: SectionId, day: string) => void }> = ({ id, day, today, onSet }) => (
  <>
    <Rows>
      <div className="relative">
        <Row lead={<Dot icon={<CalendarClock />} />} title="გახსნის დღე" sub="იმ დღეს თავისით გაიხსნება"
          right={<Val tone={day ? 'gold' : 'mut'}>{day ? shortDate(`${day}T12:00:00`) : 'არჩევა'}</Val>} />
        <input type="date" min={today} value={day} aria-label="გახსნის დღე"
          onChange={e => { const v = e.target.value; if (/^\d{4}-\d{2}-\d{2}$/.test(v) && v >= today) onSet(id, v); }}
          className="absolute inset-0 size-full cursor-pointer opacity-0" />
      </div>
    </Rows>
    {day && <Button kind="quiet" icon={<X />} className="self-start" onClick={() => onSet(id, '')}>გახსნის დღის მოხსნა</Button>}
  </>
);
