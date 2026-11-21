import React, { useEffect, useState } from 'react';
import {
  BookOpen, BookOpenText, ChevronDown, Clapperboard, Dice4, Feather, GraduationCap, Guitar, Library, MapPin, Mic, Music, type LucideIcon,
} from 'lucide-react';
import { useNavigation } from '../../context';
import { useAccess } from '../../hooks/useAccess';
import type { SectionId } from '../../data/sections';
import { askSignIn } from '../access/SignInPrompt';
import { useBackToClose } from '../../utils/backToClose';
import { triggerHaptic } from '../../utils/haptics';
import { Press, cx, FOCUS, FOCUS_IN } from '../ui2';

// The home bar's menu in place of the school's name (2026-11-21, the user: „მაღლა საგანძურის სკოლის მაგივრად … ამ
// თანმიმდევრობით … დააჭერ ჩამოიშალოს“; his pick: a list that drops down). The vine lost its labels for it. Each row obeys
// the admin's switches as the vine's labels did: hidden — not drawn, „მალე“ — says so, closed — asks to sign in.

type Tone = 'bg-wine' | 'bg-leaf' | 'bg-gold' | 'bg-sea' | 'bg-clay' | 'bg-plum';

interface Item { id: string; label: string; Icon: LucideIcon; tone: Tone; section?: SectionId }

/** the user's order */
const ITEMS: Item[] = [
  { id: 'galoba', label: 'გალობა', Icon: Music, tone: 'bg-wine', section: 'galoba' },
  { id: 'simghera', label: 'სიმღერა', Icon: Mic, tone: 'bg-leaf', section: 'simghera' },
  { id: 'sakravebi', label: 'საკრავები', Icon: Guitar, tone: 'bg-clay', section: 'sakravebi' },
  { id: 'medavitneoba', label: 'მედავითნეობა', Icon: BookOpenText, tone: 'bg-plum', section: 'medavitneobaTopic' },
  { id: 'lotsvani', label: 'ლოცვანი', Icon: BookOpen, tone: 'bg-gold', section: 'biblioteka' },
  { id: 'mtkmeli', label: 'მთქმელი', Icon: Feather, tone: 'bg-sea', section: 'mtkmeli' },
  { id: 'tadzrebi', label: 'ტაძრები', Icon: MapPin, tone: 'bg-clay', section: 'eklesiebi' },
  { id: 'biblioteka', label: 'ბიბლიოთეკა', Icon: Library, tone: 'bg-leaf', section: 'biblioteka' },
  { id: 'videoteka', label: 'ვიდეოთეკა', Icon: Clapperboard, tone: 'bg-plum', section: 'videoebi' },
  { id: 'sakhaliso', label: 'სახალისო', Icon: Dice4, tone: 'bg-sea', section: 'tamashebi' },
  { id: 'abituri', label: 'აბიტური', Icon: GraduationCap, tone: 'bg-wine' },
];

/** „ხალხური“'s first tab, as KhalkhuriV2 reads it for the visit */
const folkTab = (tab: 'songs' | 'poets') => { try { sessionStorage.setItem('sg-khalkhuri-tab', tab); } catch { /* storage off */ } };

export const SectionsMenu: React.FC<{ onSoon: (text: string) => void }> = ({ onSoon }) => {
  const [open, setOpen] = useState(false);
  const access = useAccess();
  const { navigateTo, openMapItem } = useNavigation();
  useBackToClose(open, () => setOpen(false));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const go: Record<string, () => void> = {
    galoba: () => navigateTo('galoba'),
    simghera: () => { folkTab('songs'); navigateTo('simghera'); },
    sakravebi: () => navigateTo('sakravebi'),
    medavitneoba: () => navigateTo('medavitneoba'),
    lotsvani: () => { navigateTo('biblioteka'); openMapItem('prayers'); },
    mtkmeli: () => { folkTab('poets'); navigateTo('simghera'); },
    tadzrebi: () => navigateTo('churches'),
    biblioteka: () => navigateTo('biblioteka'),
    videoteka: () => navigateTo('videos'),
    sakhaliso: () => navigateTo('games'),
    abituri: () => navigateTo('abituri'),
  };

  const rows = ITEMS.map(it => ({ it, state: it.section ? access.section(it.section) : access.on('abituri') ? 'open' : 'hidden' }))
    .filter(r => r.state !== 'hidden');

  const pick = (it: Item, state: string) => {
    triggerHaptic(10);
    if (state === 'soon') { setOpen(false); onSoon(`„${it.label}“ ჯერ მზადდება — მალე დაემატება`); return; }
    // a closed page that has no page of its own to say so asks at once; the others open their own closed page
    if (state === 'locked' && it.id === 'lotsvani') { setOpen(false); askSignIn(it.label); return; }
    // the menu's own history step is left behind and skipped on the way back (utils/backToClose)
    setOpen(false);
    go[it.id]();
  };

  return (
    <>
      <Press
        onClick={() => { triggerHaptic(8); setOpen(v => !v); }}
        aria-expanded={open}
        aria-haspopup="true"
        className={cx(
          'flex h-tap min-w-0 cursor-pointer items-center gap-1 rounded-full bg-surf pr-2.5 pl-3.5 text-ink shadow-lift select-none transition active:scale-[0.97] max-[389px]:gap-0.5 max-[389px]:pr-2 max-[389px]:pl-3',
          FOCUS,
        )}
      >
        <span className="truncate text-lead font-bold max-[389px]:text-body">განყოფილებები</span>
        <ChevronDown aria-hidden="true" strokeWidth={2.25} className={cx('size-[18px] shrink-0 text-wine transition-transform max-[389px]:size-4', open && 'rotate-180')} />
      </Press>

      {open && (
        <>
          {/* a dim veil: a tap outside closes */}
          <div aria-hidden="true" onClick={() => setOpen(false)} className="sg-in fixed inset-0 z-40 bg-ink/25" />
          <nav
            aria-label="განყოფილებები"
            className="sg-in absolute inset-x-3 top-full z-50 max-h-[calc(100dvh-8rem)] overflow-y-auto overscroll-contain rounded-card bg-surf py-1.5 shadow-sheet"
          >
            {rows.map(({ it, state }) => (
              <Press
                key={it.id}
                onClick={() => pick(it, state)}
                className={cx('flex min-h-tap-lg w-full cursor-pointer items-center gap-3 px-4 py-1 text-left transition-colors active:bg-soft', FOCUS_IN)}
              >
                <span aria-hidden="true" className={cx('flex size-icon shrink-0 items-center justify-center rounded-full text-white [&_svg]:size-[18px]', it.tone)}>
                  <it.Icon strokeWidth={2} />
                </span>
                <span className={cx('flex-1 text-body font-bold', state === 'soon' ? 'text-mut' : 'text-ink')}>{it.label}</span>
                {state === 'soon' && <span className="text-cap font-semibold text-mut">მალე</span>}
              </Press>
            ))}
          </nav>
        </>
      )}
    </>
  );
};
