import React from 'react';
import { Check, Minus } from 'lucide-react';
import { Card, Dot, Note, Row, Rows, SectionLabel, Sheet, Small, Stats } from '../../../components/ui2';
import type { AttendanceDay } from '../../../hooks/useTeaching';
import { shortDate, weekdayOf } from '../../../hooks/useTeaching';
import { WEEKDAYS_GE } from '../../../utils/dateNames';
import { SAMOSI_PARTS, SAMOSI_TOTAL, samosiDone } from '../../../data/samosiData';
import { KABA_PARTS, KABA_TOTAL } from '../../../data/kabaData';

// „დასწრება“ and „სამოსი“ of the student's page: two small windows (board x-mostsavle's rows).

/** The student's latest lessons, newest first: came or not (what the old AttendanceStrip showed). */
export const AttendanceSheet: React.FC<{ open: boolean; onClose: () => void; uid: string; days: AttendanceDay[] }> = ({
  open, onClose, uid, days,
}) => {
  const last = days.slice(0, 8);
  const came = last.filter(d => d.present.includes(uid)).length;
  return (
    <Sheet open={open} onClose={onClose} title="დასწრება">
      {last.length === 0 ? (
        <Note>ჯერ არ მონიშნულა.</Note>
      ) : (
        <>
          <Stats items={[{ value: `${came} / ${last.length}`, label: `ბოლო ${last.length} გაკვეთილი` }]} />
          <Rows>
            {last.map(d => {
              const on = d.present.includes(uid);
              return (
                <Row
                  key={d.date}
                  lead={<Dot icon={on ? <Check /> : <Minus />} color={on ? 'leaf' : 'soft'} />}
                  title={`${WEEKDAYS_GE[weekdayOf(d.date)]}, ${shortDate(d.date)}`}
                  right={<Small tone={on ? 'leaf' : 'mut'}>{on ? 'მოვიდა' : 'არ მოსულა'}</Small>}
                />
              );
            })}
          </Rows>
        </>
      )}
    </Sheet>
  );
};

/** The student's outfit: which parts they photographed for real (students.samosiReal / kabaReal). */
export const OutfitSheet: React.FC<{ open: boolean; onClose: () => void; data: Record<string, any> | null }> = ({ open, onClose, data }) => {
  const real: string[] = Array.isArray(data?.samosiReal) ? data!.samosiReal : [];
  const kaba: string[] = Array.isArray(data?.kabaReal) ? data!.kabaReal : [];
  const hat = SAMOSI_PARTS.find(p => p.extraHat && real.includes(p.id));
  return (
    <Sheet open={open} onClose={onClose} title="სამოსი">
      <SectionLabel label={`ჩოხა · ${samosiDone(real)} / ${SAMOSI_TOTAL}`} />
      <Rows>
        {SAMOSI_PARTS.filter(p => !p.extraHat).map(p => <PartRow key={p.id} label={p.label} on={real.includes(p.id)} />)}
        <PartRow label={hat ? hat.label : 'ქუდი'} on={!!hat} />
      </Rows>
      {kaba.length > 0 && (
        <>
          <SectionLabel label={`ქართული კაბა · ${KABA_PARTS.filter(p => kaba.includes(p.id)).length} / ${KABA_TOTAL}`} />
          <Rows>
            {KABA_PARTS.map(p => <PartRow key={p.id} label={p.label} on={kaba.includes(p.id)} />)}
          </Rows>
        </>
      )}
      <Card pad="sm"><Note>ჩანს ის ნაწილები, რომლებიც მოსწავლემ საკუთარ ფოტოზე დაადასტურა.</Note></Card>
    </Sheet>
  );
};

const PartRow: React.FC<{ label: string; on: boolean }> = ({ label, on }) => (
  <Row
    lead={<Dot icon={on ? <Check /> : <Minus />} color={on ? 'leaf' : 'soft'} />}
    title={label}
    right={<Small tone={on ? 'leaf' : 'mut'}>{on ? 'ნამდვილი' : 'ჯერ არა'}</Small>}
  />
);
