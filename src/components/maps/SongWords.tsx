import React, { useState } from 'react';
import { Check, Pencil, TextAlignStart } from 'lucide-react';
import { useAuth } from '../../context';
import { saveSongText, useCanEditSongText, useWrittenSongText } from '../../hooks/useSongTexts';
import { Btn, IconBtn } from '../ui/kit';

// The song page's „ტექსტი“: words written in the app (songTexts) come first, then the song's own or found ones.
// Admins and the members an admin picked write them here (✎).
export const SongWords: React.FC<{ songId: string; words: { text: string; source?: string } | null }> = ({ songId, words }) => {
  const { user } = useAuth();
  const canEdit = useCanEditSongText();
  const written = useWrittenSongText(songId);
  const shown = written ? { text: written } : words;
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const save = async () => {
    if (draft === null || !user) return;
    setBusy(true);
    setError(false);
    try {
      await saveSongText(songId, draft, user.uid);
      setDraft(null);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl bg-white border border-[#e4d8c4] px-4 pt-2 pb-4">
      <div className="flex items-center gap-2 min-h-[40px] mb-1">
        <h2 className="flex-1 flex items-center gap-1.5 text-[13px] font-extrabold text-[#7a2028]">
          <TextAlignStart className="w-4 h-4" /> ტექსტი
        </h2>
        {canEdit && draft === null && (
          <IconBtn label={shown ? 'ტექსტის შესწორება' : 'ტექსტის ჩაწერა'} onClick={() => { setError(false); setDraft(shown?.text ?? ''); }}>
            <Pencil />
          </IconBtn>
        )}
      </div>

      {draft !== null ? (
        <>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            autoFocus
            rows={Math.min(Math.max(draft.split('\n').length + 1, 8), 24)}
            placeholder={'სტრიქონი ერთ ხაზზე, მუხლებს შორის — ცარიელი ხაზი'}
            aria-label="სიმღერის ტექსტი"
            className="block w-full rounded-xl border border-[#d6c8b1] bg-[#fffdf8] px-3 py-2.5 text-[16px] leading-[1.7] text-[#2a2017] focus:outline-none focus:ring-2 focus:ring-[#7a2028]/30 resize-y"
          />
          {error && <p className="mt-2 text-[13px] text-[#b3261e]">ვერ შეინახა — სცადე თავიდან</p>}
          <p className="mt-2 text-[12px] text-[#a0907c]">ცარიელი ტექსტის შენახვა წაშლის აქ ჩაწერილს.</p>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <Btn kind="ghost" onClick={() => setDraft(null)} disabled={busy}>გაუქმება</Btn>
            <Btn icon={<Check />} onClick={save} disabled={busy || draft === (written ?? '')}>შენახვა</Btn>
          </div>
        </>
      ) : shown ? (
        <>
          <p className="text-[16px] leading-[1.75] text-[#2a2017] whitespace-pre-line">{shown.text}</p>
          {shown.source && <p className="mt-3 text-[11.5px] text-[#a0907c]">{shown.source}</p>}
        </>
      ) : (
        <p className="text-[13px] text-[#a0907c]">ამ სიმღერის ტექსტი ჯერ არ დამატებულა</p>
      )}
    </section>
  );
};
