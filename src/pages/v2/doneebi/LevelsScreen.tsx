import React, { useEffect } from 'react';
import { Award, Check } from 'lucide-react';
import { Num, Dot, Row, Rows, TopBar } from '../../../components/ui2';
import { MASTERY_LEVELS } from '../../../data/masteryPath';
import { remainingLine, timeLeft } from '../../../utils/levelsView';
import { useNavigation } from '../../../context';
import { Strip } from './Strip';
import { drillName, useFreshCert, useLevels } from './useLevels';
import { certItem } from './nav';

// „ოსტატობის გზა“ — the six levels in one card (board x-ai-sapekhurebi): a closed level with its certificate, the current one with
// its steps and a rough time left, the later ones with their span; under them what the current level still wants.

export interface LevelRow {
  n: number;
  name: string;
  span: string;
  /** closed: by the student's work (has a certificate) or skipped by the entry test */
  state: 'cert' | 'skipped' | 'now' | 'later';
  passed: number;
  total: number;
  /** „≈ 3 კვირა“ for the current level */
  left: string | null;
}

export const LevelsView: React.FC<{
  rows: LevelRow[];
  strip: string | null;
  onBack: () => void;
  onCert: (n: number) => void;
  onNow: () => void;
}> = ({ rows, strip, onBack, onCert, onNow }) => (
  <div className="flex w-full flex-col gap-3.5 pb-4">
    <TopBar title="ოსტატობის გზა" sub="ნულიდან ოსტატამდე" onBack={onBack} />
    <Rows>
      {rows.map(r => r.state === 'cert' ? (
        <Row key={r.n} lead={<Dot color="wine" size={30} icon={<Check strokeWidth={2.5} />} />} title={r.name}
          sub="დასრულდა · მოწმობა გაქვს" onClick={() => onCert(r.n)}
          right={<Award aria-label="მოწმობა" className="size-[22px] shrink-0 text-gold" strokeWidth={1.75} />} />
      ) : r.state === 'skipped' ? (
        <Row key={r.n} lead={<Dot color="wine" size={30} icon={<Check strokeWidth={2.5} />} />} title={r.name} sub="გავლილია ტესტით" />
      ) : r.state === 'now' ? (
        <Row key={r.n} lead={<Num n={r.n} on />} title={r.name}
          sub={`${r.total} ნაბიჯიდან ${r.passed}${r.left ? ` · ${r.left}` : ''}`} onClick={onNow}
          right={<span className="shrink-0 text-meta font-bold text-wine">ახლა</span>} />
      ) : (
        <Row key={r.n} lead={<Num n={r.n} />} title={r.name} sub={r.span} />
      ))}
    </Rows>
    {strip && <Strip>{strip}</Strip>}
  </div>
);

export const LevelsScreen: React.FC = () => {
  const { openMapItem, handleGoBack } = useNavigation();
  const p = useLevels();
  const cur = p.summary.level;
  const rows: LevelRow[] = MASTERY_LEVELS.map((l, i) => {
    const s = p.levels[i];
    const state: LevelRow['state'] = s.complete ? (s.skipped ? 'skipped' : 'cert') : l.n === cur ? 'now' : 'later';
    return { n: l.n, name: l.name, span: l.span, state, passed: s.passed, total: s.total, left: state === 'now' ? timeLeft(l.span, s.passed, s.total) : null };
  });
  const strip = remainingLine(MASTERY_LEVELS[cur], p.record, drillName);
  const fresh = useFreshCert(p.uid, p.closed, p.loaded, p.viewing);
  useEffect(() => { if (fresh !== null) openMapItem(certItem(fresh)); }, [fresh]); // eslint-disable-line react-hooks/exhaustive-deps
  return <LevelsView rows={rows} strip={strip} onBack={handleGoBack} onCert={n => openMapItem(certItem(n))} onNow={() => openMapItem('ostatoba')} />;
};
