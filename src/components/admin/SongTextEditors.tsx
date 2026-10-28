import React from 'react';
import { setSongTextEditor, useSongTextEditors } from '../../hooks/useSongTexts';
import { Toggle } from '../ui/kit';
import { FAIL } from './CentreDownload';

// Who may write the folk songs' words (✎ on a song's page): admins always; a member or teacher when an admin turns it
// on in the person's window (the list of them: ⚙ „სკოლა“ → „დამატებითი უფლებები“, ExtraRights.tsx).
// Data: settings/songTextEditors (hooks/useSongTexts.ts).

type Msg = (text: string, type: 'success' | 'error') => void;

/** The person's window: this person's switch. */
export const SongTextSwitch: React.FC<{ uid: string; onMessage: Msg }> = ({ uid, onMessage }) => {
  const uids = useSongTextEditors();
  return (
    <Toggle
      on={uids.includes(uid)}
      onChange={v => { setSongTextEditor(uid, v).catch(() => onMessage(FAIL, 'error')); }}
      label="სიმღერის ტექსტის ჩაწერა"
    />
  );
};
