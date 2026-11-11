import React from 'react';
import { HardDriveDownload } from 'lucide-react';
import { Toggle } from '../ui/kit';
import { Fold } from './Fold';
import { changed } from './changed';
import { setRecordingTools, useRecordingToolsSetting } from '../../hooks/useRecordingTools';

// ⚙ „სკოლა“ → „ჩანაწერების ღილაკები“: two switches for every member at once — ⬇ MP3 and ☁ offline beside the recordings
// (hooks/useRecordingTools.ts). Teachers and admins keep both whatever is set.
export const RecordingToolsFold: React.FC<{ onMessage: (text: string, type: 'success' | 'error') => void }> = ({ onMessage }) => {
  const s = useRecordingToolsSetting();
  const mp3 = !s?.mp3Hidden;
  const offline = !s?.offlineHidden;
  const turn = async (key: 'mp3Hidden' | 'offlineHidden', show: boolean, name: string) => {
    try {
      await setRecordingTools({ [key]: !show });
      const text = `${name} — წევრებს ${show ? 'გამოუჩნდათ' : 'დაემალათ'}`;
      changed('section', text, '', () => setRecordingTools({ [key]: show }));
    } catch {
      onMessage('ვერ შეინახა — სცადე ხელახლა.', 'error');
    }
  };
  const summary = s === null ? '…' : mp3 && offline ? 'ორივე ჩანს' : !mp3 && !offline ? 'ორივე დამალულია' : mp3 ? 'ჩანს მხოლოდ ჩამოტვირთვა' : 'ჩანს მხოლოდ ოფლაინი';
  return (
    <Fold icon={<HardDriveDownload />} title="ჩანაწერების ღილაკები" summary={summary}
      info="ეს ეხება წევრებს და სტუმრებს. მასწავლებლები და ადმინები ორივე ღილაკს ყოველთვის ხედავენ. ნოტების წიგნების ოფლაინი არ იცვლება.">
      <div className="flex flex-col gap-2">
        <Toggle on={mp3} onChange={v => turn('mp3Hidden', v, 'ჩანაწერის ჩამოტვირთვა (MP3)')} label="ჩამოტვირთვა (MP3)" hint="⬇ ჩანაწერების გვერდით და ფლეერში" disabled={s === null} />
        <Toggle on={offline} onChange={v => turn('offlineHidden', v, 'ჩანაწერის ოფლაინი')} label="ოფლაინ შენახვა" hint="☁ ჩანაწერების გვერდით, ფლეერში და ოფლაინის სიებში" disabled={s === null} />
      </div>
    </Fold>
  );
};
