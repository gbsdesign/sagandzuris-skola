import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { doc, getDoc } from 'firebase/firestore';
import { Download, Gem, Info, MoreHorizontal, Music, School, Share, User } from 'lucide-react';
import { db } from '../../../firebase';
import { useAuth } from '../../../context';
import defaultLogo from '../../../assets/images/user_provided_logo_1790330250486.jpg';
import {
  Button, Dot, Helper, RoundButton, Rows, Sheet, ToggleRow, TopBar,
} from '../../../components/ui2';
import {
  cardText, momentLine, momentTitle, readChoices, shortName, writeChoices, type CardChoices, type CardInput,
} from '../../../utils/learnedCard';
import { drawCard, loadLogo, saveCard, shareCard } from './drawCard';
import type { LearnedItem } from './useLearned';

// „გაზიარე“ (board x-idea-barati) and the sheet „რა ეწეროს ბარათზე“ (x-idea-barati-2); the moment screen (x-idea-barati-0).
// By props; `ShareLayer` / `LearnedMoment` hold the data.

const LAYER = 'fixed inset-0 z-[75] flex flex-col overflow-y-auto bg-page safe-top safe-x';

/** The page's own full screen over the app (above the bottom menu; Sheets rise above it). */
export const Layer: React.FC<{ children: React.ReactNode }> = ({ children }) => createPortal(
  <div role="dialog" aria-modal="true" className={LAYER}><div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4">{children}</div></div>,
  document.body,
);

/** The moment: a gem, what was learned, what is true about it. */
export const MomentView: React.FC<{ item: LearnedItem; onShare: () => void; onClose: () => void }> = ({ item, onShare, onClose }) => (
  <>
    <TopBar title="საგანძური" onBack={onClose} />
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-8 text-center">
      <span aria-hidden="true" className="sg-in flex size-[84px] items-center justify-center rounded-full bg-tint text-wine [&_svg]:size-9">
        <Gem strokeWidth={1.6} />
      </span>
      <h2 className="text-title leading-tight font-bold tracking-tight wrap-break-word">{momentTitle(item.name)}</h2>
      <p className="max-w-xs text-body text-mut">{momentLine(item.voices, item.voiced)}</p>
    </div>
    <div className="flex flex-col gap-2 pb-4 safe-bottom">
      <Button full icon={<Share strokeWidth={2} />} onClick={onShare}>გაზიარე</Button>
      <Button full kind="ghost" onClick={onClose}>მერე</Button>
    </div>
  </>
);

export const useLogoUrls = () => {
  const [db_, setDb] = useState<string | undefined>();
  useEffect(() => {
    let live = true;
    getDoc(doc(db, 'settings', 'logo')).then(s => { if (live && s.exists()) setDb(s.data()?.logoUrl); }).catch(() => {});
    return () => { live = false; };
  }, []);
  return db_;
};

/** The card, its settings sheet, the two buttons. */
export const ShareView: React.FC<{
  item: LearnedItem;
  person: string;
  onBack: () => void;
  /** the choices and the date are the page's own unless a preview gives them */
  date?: Date;
  initial?: CardChoices;
}> = ({ item, person, onBack, date, initial }) => {
  const [choices, setChoices] = useState<CardChoices>(() => initial ?? readChoices());
  const [sheet, setSheet] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const dbLogo = useLogoUrls();
  const today = useMemo(() => date ?? new Date(), [date]);

  const input: CardInput = useMemo(
    () => ({ name: item.name, label: item.label, voices: item.voices, voiced: item.voiced, person, date: today }),
    [item, person, today],
  );
  const text = useMemo(() => cardText(input, choices), [input, choices]);

  useEffect(() => {
    let live = true;
    (async () => {
      const logo = await loadLogo([dbLogo, defaultLogo]);
      const b = await drawCard(text, logo);
      if (live) setBlob(b);
    })().catch(() => { if (live) setNote('სურათი ვერ მოხერხდა'); });
    return () => { live = false; };
  }, [text, dbLogo]);

  useEffect(() => {
    if (!blob) { setUrl(''); return; }
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);

  const set = (patch: Partial<CardChoices>) => setChoices(c => { const n = { ...c, ...patch }; writeChoices(n); return n; });

  const share = async () => {
    if (!blob) return;
    const r = await shareCard(blob, item.name);
    setNote(r === 'saved' ? 'სურათი შეინახა' : r === 'failed' ? 'ვერ გაზიარდა' : '');
  };
  const save = () => {
    if (!blob) return;
    setNote(saveCard(blob, item.name) === 'saved' ? 'სურათი შეინახა' : 'ვერ შეინახა');
  };

  return (
    <>
      <TopBar title="გაზიარე" onBack={onBack} right={
        <RoundButton label="რა ეწეროს ბარათზე" onClick={() => setSheet(true)}><MoreHorizontal strokeWidth={1.75} /></RoundButton>
      } />
      <div className="flex flex-1 flex-col gap-3.5 pb-4">
        <div className="mx-auto aspect-[4/5] w-full max-w-[330px] overflow-hidden rounded-card bg-wine shadow-float">
          {url && <img src={url} alt={`ბარათი: ${text.title}`} className="size-full object-cover" draggable={false} />}
        </div>
        <Helper icon={<Info />}>ბარათზე მხოლოდ საგალობლის სახელია. შენი სახელი არ ჩანს, თუ თვითონ არ დაამატებ.</Helper>
        {note && <p role="status" className="text-center text-meta text-mut">{note}</p>}
      </div>
      <div className="flex flex-col gap-2 pb-4 safe-bottom">
        <Button full icon={<Share strokeWidth={2} />} disabled={!blob} onClick={share}>გაზიარება</Button>
        <Button full kind="ghost" icon={<Download strokeWidth={2} />} disabled={!blob} onClick={save}>სურათად შენახვა</Button>
      </div>

      <Sheet open={sheet} title="რა ეწეროს ბარათზე" onClose={() => setSheet(false)}>
        <Rows>
          <ToggleRow lead={<Dot icon={<User />} />} title="ჩემი სახელი" sub={shortName(person) || 'სახელი არ გაქვს მითითებული'}
            on={choices.name && !!shortName(person)} disabled={!shortName(person)} onChange={on => set({ name: on })} />
          {item.voiced && (
            <ToggleRow lead={<Dot icon={<Music />} />} title="რომელი ხმა" sub={cardText({ ...input }, { ...choices, voice: true }).line.split(' · ')[0]}
              on={choices.voice} onChange={on => set({ voice: on })} />
          )}
          <ToggleRow lead={<Dot icon={<School />} />} title="სკოლის სახელი" sub="საგანძურის სკოლა" on={choices.school} onChange={on => set({ school: on })} />
        </Rows>
        <Helper icon={<Info />}>ქულა და პროცენტი ბარათზე არასდროს იწერება.</Helper>
        <Button full onClick={() => setSheet(false)}>მზადაა</Button>
      </Sheet>
    </>
  );
};

/** From „საგანძური“: the share page over the app. */
export const ShareLayer: React.FC<{ item: LearnedItem; onClose: () => void }> = ({ item, onClose }) => {
  const { user } = useAuth();
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('[aria-labelledby]')) onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return <Layer><ShareView item={item} person={user?.displayName || ''} onBack={onClose} /></Layer>;
};
