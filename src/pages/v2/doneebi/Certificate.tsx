import React, { useEffect, useMemo, useState } from 'react';
import { Download, ChevronRight } from 'lucide-react';
import { Button, TopBar } from '../../../components/ui2';
import { MASTERY_LEVELS } from '../../../data/masteryPath';
import { useNavigation } from '../../../context';
import defaultLogo from '../../../assets/images/user_provided_logo_1790330250486.jpg';
import { loadLogo } from '../barati/drawCard';
import { useLogoUrls } from '../barati/ShareView';
import { closedOn, dateText, teacherMarked } from '../../../utils/levelsView';
import { georgiaToday } from '../../../utils/psalter';
import { drawCertificate, saveCertificate, type CertText } from './drawCertificate';
import { Strip } from './Strip';
import { useLevels } from './useLevels';
import { certOf } from './nav';

// „მოწმობა“ (board x-ai-motsmoba): the card of a closed level, „შევინახავ“ (a PNG) and „გავაგრძელოთ“.

export const CertificateView: React.FC<{
  text: CertText;
  /** the strip's line; null for the last level */
  next: string | null;
  logoUrl?: string;
  onBack: () => void;
  onSave: () => void;
  note?: string;
  saving?: boolean;
}> = ({ text, next, logoUrl, onBack, onSave, note, saving }) => (
  <div className="flex w-full flex-1 flex-col gap-3.5 pb-4">
    <TopBar title="მოწმობა" onBack={onBack} />
    <section aria-label="მოწმობა" className="flex shrink-0 flex-col items-center gap-1.5 rounded-card border-2 border-gold bg-surf px-5 py-7 text-center">
      <img src={logoUrl ?? defaultLogo} alt="" className="mb-2 size-14 rounded-tile object-contain" draggable={false} />
      <div className="text-meta font-bold text-mut">საგანძურის სკოლა</div>
      <h2 className="my-1 text-title leading-tight font-bold tracking-tight wrap-break-word">{text.level}</h2>
      <p className="text-lead wrap-break-word">დაასრულა: <b className="font-bold">{text.person}</b></p>
      <p className="text-meta text-mut">{text.line}</p>
      <p className="text-meta text-mut">{text.date}</p>
    </section>
    {next && <Strip>{next}</Strip>}
    {note && <p role="status" className="text-center text-meta text-mut">{note}</p>}
    <div className="mt-auto flex gap-2 pt-2">
      <Button kind="ghost" className="shrink-0" icon={<Download strokeWidth={2} />} disabled={saving} onClick={onSave}>შევინახავ</Button>
      <Button className="flex-1" icon={<ChevronRight strokeWidth={2.25} />} onClick={onBack}>გავაგრძელოთ</Button>
    </div>
  </div>
);

export const Certificate: React.FC = () => {
  const { mapItem, handleGoBack } = useNavigation();
  const n = certOf(mapItem) ?? 0;
  const level = MASTERY_LEVELS[n] ?? MASTERY_LEVELS[0];
  const p = useLevels();
  const dbLogo = useLogoUrls();
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // the date: the latest day an exercise of the level was done; else today (scores carry no date)
  const day = closedOn(level, p.record, p.days) ?? georgiaToday();
  const withTeacher = teacherMarked(level, p.record, p.marked);
  const nextLevel = MASTERY_LEVELS[n + 1];
  const text: CertText = useMemo(() => ({
    level: `დონე ${level.n} · ${level.name}`,
    person: p.name || 'მოსწავლე',
    line: `${level.items.length} ნაბიჯი · გამოცდა ${withTeacher ? '' : 'AI '}მასწავლებელთან`,
    date: dateText(day),
  }), [level, p.name, withTeacher, day]);

  const save = async () => {
    setSaving(true);
    try {
      const logo = await loadLogo([dbLogo, defaultLogo]);
      const blob = await drawCertificate(text, logo);
      setNote(saveCertificate(blob, text.level) ? 'სურათი შეინახა' : 'ვერ შეინახა');
    } catch { setNote('ვერ შეინახა'); }
    setSaving(false);
  };
  useEffect(() => { setNote(''); }, [n]);

  return <CertificateView text={text} logoUrl={dbLogo} note={note} saving={saving} onSave={() => void save()} onBack={handleGoBack}
    next={nextLevel ? `გილოცავ! შემდეგი დონეა „${nextLevel.name}“.` : 'გილოცავ! ეს ბოლო დონეა.'} />;
};
