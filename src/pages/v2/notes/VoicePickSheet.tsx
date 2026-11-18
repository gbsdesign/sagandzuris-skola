import React, { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { Button, Choice, Helper, Rows, Sheet } from '../../../components/ui2';

type V = '1' | '2' | '3';
const VOICES: { id: V; title: string; sub: string }[] = [
  { id: '1', title: 'I ხმა', sub: 'მთქმელი' },
  { id: '2', title: 'II ხმა', sub: 'მოძახილი' },
  { id: '3', title: 'III ხმა', sub: 'ბანი' },
];

/** Asked once: which voice do I sing. */
export const VoicePickSheet: React.FC<{ open: boolean; onClose: () => void; value: V | null; onPick: (v: V) => void }> = ({
  open, onClose, value, onPick,
}) => {
  const [pick, setPick] = useState<V | null>(value);
  useEffect(() => { if (open) setPick(value); }, [open, value]);
  return (
    <Sheet open={open} title="რომელ ხმას მღერი?" onClose={onClose}>
      <Rows role="radiogroup" aria-label="ხმა">
        {VOICES.map(v => <Choice key={v.id} title={v.title} sub={v.sub} on={pick === v.id} onClick={() => setPick(v.id)} />)}
      </Rows>
      <Helper icon={<Info />}>ერთხელ ირჩევ. მერე პროფილში შეცვლი.</Helper>
      <Button full disabled={!pick} onClick={() => { if (pick) onPick(pick); }}>მზადაა</Button>
    </Sheet>
  );
};
