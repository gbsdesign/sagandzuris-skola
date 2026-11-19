import React, { useEffect, useState } from 'react';
import { ChevronDown, Globe, Heart, Info } from 'lucide-react';
import { Button, CheckButton, Dot, Helper, Press, Row, Rows, SectionLabel, Sheet, TopBar, cx, FOCUS_IN } from '../../../components/ui2';
import { useNavigation } from '../../../context';
import { DOCUMENTS, REASONS, UNIVERSITY_PAGE } from '../../../data/abituriProgram';
import type { AbituriProgressApi } from '../../../hooks/useAbituriProgress';
import { triggerHaptic } from '../../../utils/haptics';
import { Page, scrollToId, takePendingFocus } from './parts';

// x-abituri-registratsia — the registration in the new look: the documents as a list to tick with short names (a tap on a
// name unfolds its full words), the national exams as one line, „რატომ გალობის უნივერსიტეტი“ (7 reasons) folded into one line.
// The ticks are the old tab's (pages/abituri/AdmissionTab.tsx, `progress.docs`).

// the documents' short names, in DOCUMENTS' order (the full words unfold under them)
const SHORT = [
  'ატესტატი ან დამოწმებული ასლი',
  'პირადობის მოწმობის ასლი',
  'ეროვნული გამოცდების საგამოცდო ბარათი',
  '4 ფოტოსურათი (3×4)',
  'ვაჟებს — სამხედრო მოწმობის ასლი',
];

export const AdmissionScreen: React.FC<{ api: AbituriProgressApi }> = ({ api }) => {
  const { handleGoBack } = useNavigation();
  const ready = api.progress.docs;
  const [open, setOpen] = useState<number[]>([]);
  const [why, setWhy] = useState(false);
  useEffect(() => { const id = takePendingFocus(); if (id) scrollToId(id); }, []);
  const count = ready.filter(i => i < DOCUMENTS.length).length;

  return (
    <Page>
      <TopBar title="რეგისტრაცია" sub="ორი რეგისტრაცია: შიდა და ეროვნული" onBack={handleGoBack} />

      <SectionLabel label={`შიდა გამოცდები · საბუთები ${count} / ${DOCUMENTS.length}`} />
      <div id="docs" className="flex shrink-0 scroll-mt-24 flex-col divide-y divide-line overflow-hidden rounded-card bg-surf">
        {DOCUMENTS.map((d, i) => {
          const on = ready.includes(i);
          const full = open.includes(i);
          const short = SHORT[i] ?? d;
          return (
            <div key={d} className="flex min-h-14 items-start gap-1 py-1 pr-3 pl-1.5">
              <CheckButton on={on} label={on ? `${short} — მზადაა, მოხსნა` : `${short} — მზადაა`} onChange={() => { triggerHaptic(10); api.toggleDoc(i); }} />
              <Press
                onClick={() => { triggerHaptic(8); setOpen(o => (o.includes(i) ? o.filter(x => x !== i) : [...o, i])); }}
                aria-expanded={full}
                className={cx('flex min-h-tap min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-field py-1.5 text-left', FOCUS_IN)}
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className={cx('text-body leading-snug font-bold wrap-break-word', on && 'text-mut')}>{short}</span>
                  {full && <span className="sg-in text-meta leading-snug text-mut wrap-break-word">{d}</span>}
                </span>
                <ChevronDown aria-hidden="true" className={cx('size-4 shrink-0 text-mut transition-transform', full && 'rotate-180')} />
              </Press>
            </div>
          );
        })}
      </div>

      <SectionLabel label="ეროვნული გამოცდები" />
      <Rows>
        <Row lead={<Dot icon={<Globe />} />} title="naec.ge" sub="ქართული და ინგლისური ენა" href="https://naec.ge" target="_blank" />
      </Rows>

      <Rows>
        <Row lead={<Dot icon={<Heart />} />} title="რატომ გალობის უნივერსიტეტი" sub="7 მიზეზი" wrap onClick={() => setWhy(true)} />
      </Rows>

      <Helper icon={<Info />}>
        წესები ყოველ წელს იცვლება — გადაამოწმე{' '}
        <a href={UNIVERSITY_PAGE} target="_blank" rel="noopener noreferrer" className="font-bold text-wine underline underline-offset-2">უნივერსიტეტის გვერდზე</a>.
      </Helper>

      <Sheet open={why} title="რატომ გალობის უნივერსიტეტი" onClose={() => setWhy(false)}>
        <ol className="flex shrink-0 flex-col divide-y divide-line overflow-hidden rounded-card bg-surf">
          {REASONS.map((r, i) => (
            <li key={i} className="flex gap-3 px-4 py-3">
              <span aria-hidden="true" className="w-5 shrink-0 text-right font-serif-ge text-head leading-tight font-bold text-gold-ink tabular-nums">{i + 1}</span>
              <span className="min-w-0 flex-1 text-body leading-relaxed text-ink">{r}</span>
            </li>
          ))}
        </ol>
        <blockquote className="shrink-0 rounded-card bg-wine px-5 py-4 font-serif-ge text-lead leading-relaxed text-white">
          რაც გულით გვინდა, მხოლოდ ის გამოგვდის კარგად. ეს უნივერსიტეტი ჩვენი პატრიარქის დაფუძნებულია და სწავლა უფასოა —
          ვაკეთოთ საღმრთო და ეროვნული საქმე.
        </blockquote>
        <Button kind="soft" full icon={<Globe aria-hidden="true" />} href="https://galoba.edu.ge" target="_blank">galoba.edu.ge</Button>
      </Sheet>
    </Page>
  );
};
