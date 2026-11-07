import React, { useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { Btn, FIELD } from '../ui/kit';
import { Fold } from './Fold';
import { saveGooglePlacesKey, useGooglePlacesKey } from '../../hooks/useGooglePhotos';

// ⚙ „სკოლა“ → „Google-ის ფოტოები“ (moved here from the churches page's bottom, 2026-11-07): the admin pastes Google's Places
// key once, and every church's window on „ეკლესია-მონასტრები“ shows Google Maps' photos (hooks/useGooglePhotos.ts).
// The key is never shown back whole — only that one is set.
export const GooglePhotosFold: React.FC<{ onMessage: (text: string, type: 'success' | 'error') => void }> = ({ onMessage }) => {
  const key = useGooglePlacesKey();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const has = !!key;
  const save = async () => {
    setSaving(true);
    try {
      await saveGooglePlacesKey(value.trim());
      setEditing(false); setValue('');
      onMessage('Google-ის გასაღები შეინახა — ტაძრების ფანჯრებში Google Maps-ის ფოტოებიც ჩანს.', 'success');
    } catch {
      onMessage('გასაღები ვერ შეინახა — სცადე ხელახლა.', 'error');
    } finally { setSaving(false); }
  };
  return (
    <Fold icon={<ImageIcon />} title="Google-ის ფოტოები" summary={key === undefined ? '…' : has ? 'ჩართულია — ტაძრებში Google Maps-ის ფოტოები ჩანს' : 'გამორთულია — ჩასვი Google-ის გასაღები'}
      info="გასაღები Google Cloud-ში მზადდება (Places API (New), მხოლოდ ამ საიტის მისამართებისთვის). ფოტოები არ ინახება — ყოველ გახსნაზე Google-იდან მოდის ავტორის სახელით. თვეში 1 000 ფოტოს ჩვენება უფასოა.">
      {has && !editing ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[14px] font-semibold text-[#2f6b3a]">გასაღები ჩასმულია (…{key.slice(-4)}).</span>
          <Btn kind="ghost" size="sm" onClick={() => setEditing(true)}>შეცვლა</Btn>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-[13.5px] font-semibold text-[#574739] leading-snug">ჩასვი Google-ის გასაღები (Places API) და შეინახე.</p>
          <div className="flex gap-2">
            <input value={value} onChange={e => setValue(e.target.value)} placeholder="AIza…" className={`${FIELD} font-mono text-[13px]`} autoComplete="off" spellCheck={false} aria-label="Google-ის გასაღები" />
            <Btn onClick={save} disabled={saving || value.trim().length < 20}>{saving ? 'ინახება…' : 'შენახვა'}</Btn>
          </div>
          {has && <Btn kind="ghost" size="sm" onClick={() => { setEditing(false); setValue(''); }} className="self-start">გაუქმება</Btn>}
        </div>
      )}
    </Fold>
  );
};
