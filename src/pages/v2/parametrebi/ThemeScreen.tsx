import React, { useState } from 'react';
import { Moon, Music } from 'lucide-react';
import { useNavigation } from '../../../context';
import { Check, Choice, cx, Dot, Note, Press, Row, Rows, SectionLabel, Sheet, TopBar, Two, Val } from '../../../components/ui2';
import { FOCUS_IN } from '../../../components/ui2/cx';
import { setTheme, THEME_NAMES, useTheme, type Theme } from '../../../design/look';
import { triggerHaptic } from '../../../utils/haptics';

// „იერი“ (settings mapItem `theme`; board x-ultra-muqi-2): light, dark, or as the phone is (light by day, dark by night). Under
// it what keeps its own choice: the notes' paper (the notes page reads the same `sagandzuri_paper`) and the prayer page's 🌙.

type Paper = 'day' | 'candle' | 'night' | 'auto';
const PAPER_KEY = 'sagandzuri_paper';
const PAPERS: { id: Paper; label: string }[] = [
  { id: 'day', label: 'დღე' }, { id: 'candle', label: 'სანთელი' }, { id: 'night', label: 'ღამე' }, { id: 'auto', label: 'ავტო' },
];
const readPaper = (): Paper => {
  try {
    const v = JSON.parse(localStorage.getItem(PAPER_KEY) || '"day"');
    return PAPERS.some(p => p.id === v) ? v : 'day';
  } catch { return 'day'; }
};

// a little page in the look's colours (fixed: they show the choice, not the look on now)
const SWATCH: Record<Theme, string> = {
  light: 'bg-white',
  dark: 'bg-night-surf',
  auto: 'bg-linear-90 from-white from-50% to-night-surf to-50%',
};

const ThemeRow: React.FC<{ t: Theme; on: boolean; sub?: string; onPick: () => void }> = ({ t, on, sub, onPick }) => (
  <Press
    role="radio"
    aria-checked={on}
    onClick={onPick}
    className={cx('flex min-h-row w-full cursor-pointer items-center gap-2.5 py-2 pr-3 pl-4 text-left text-ink transition-colors active:bg-soft', FOCUS_IN)}
  >
    <span aria-hidden="true" className={cx('h-12 w-9 shrink-0 rounded-chip ring-1 ring-ink/15', SWATCH[t])} />
    <Two title={THEME_NAMES[t]} sub={sub} wrap />
    <Check on={on} />
  </Press>
);

export const ThemeScreen: React.FC = () => {
  const { handleGoBack } = useNavigation();
  const { choice } = useTheme();
  const [paper, setPaper] = useState<Paper>(readPaper);
  const [paperOpen, setPaperOpen] = useState(false);
  const pick = (t: Theme) => { triggerHaptic(8); setTheme(t); };
  const pickPaper = (p: Paper) => {
    try { localStorage.setItem(PAPER_KEY, JSON.stringify(p)); } catch { /* this visit only */ }
    setPaper(p);
    setPaperOpen(false);
  };
  return (
    <div className="flex w-full flex-col gap-3 pb-5">
      <TopBar title="იერი" onBack={handleGoBack} />
      <Rows role="radiogroup" aria-label="იერი">
        <ThemeRow t="light" on={choice === 'light'} onPick={() => pick('light')} />
        <ThemeRow t="dark" on={choice === 'dark'} onPick={() => pick('dark')} />
        <ThemeRow t="auto" on={choice === 'auto'} sub="დღისით ღია, ღამით მუქი" onPick={() => pick('auto')} />
      </Rows>

      <SectionLabel label="ცალკე რჩება" />
      <Rows>
        <Row
          lead={<Dot icon={<Music />} />}
          title="ნოტების ფურცელი"
          sub="დღე · სანთელი · ღამე · ავტო"
          right={<Val>{PAPERS.find(p => p.id === paper)?.label}</Val>}
          onClick={() => setPaperOpen(true)}
        />
        <Row lead={<Dot icon={<Moon />} />} title="ღამის ფურცელი ლოცვაზე" sub="მთვარის ღილაკი ლოცვის თავში" />
      </Rows>
      <Note>ნოტების „ავტო“ მუქ ფონზე თავისით „ღამეს“ ირჩევს.</Note>

      <Sheet open={paperOpen} title="ნოტების ფურცელი" onClose={() => setPaperOpen(false)}>
        <Rows role="radiogroup" aria-label="ნოტების ფურცელი">
          {PAPERS.map(p => <Choice key={p.id} title={p.label} on={paper === p.id} onClick={() => pickPaper(p.id)} />)}
        </Rows>
      </Sheet>
    </div>
  );
};
