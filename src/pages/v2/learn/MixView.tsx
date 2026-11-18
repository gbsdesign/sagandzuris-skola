import React from 'react';
import { Check, Loader2, Megaphone, Mic, Pause, Play, Send, Users } from 'lucide-react';
import { Avatar, Button, CheckButton, H2, Helper, Note, Row, Rows, RoundButton, Steps } from '../../../components/ui2';
import type { Voice } from '../../../utils/pathItems';
import { Line } from './parts';

// The teacher's „კლასის ჩანაწერები“ in the new look: the class's takes of one chant — ticked, heard one by one or together,
// sent to the class chat as one voice message; none yet: the three steps and „კლასს ვთხოვ“. MixBody holds the logic.

const VOICE_LABEL: Record<Voice, string> = { '1': 'I ხმა', '2': 'II ხმა', '3': 'III ხმა' };

export interface MixRow { uid: string; name: string; photo: string; voice: Voice }

export const MixView: React.FC<{
  rows: MixRow[] | null;
  chosen: Set<string>;
  onToggle: (uid: string) => void;
  playingOne: string | null;
  onPlayOne: (uid: string) => void;
  state: 'idle' | 'playing' | 'sending' | 'sent' | 'error';
  picked: number;
  onPlayTogether: () => void;
  onSend: () => void;
  asked: 'no' | 'asking' | 'yes' | 'error';
  onAsk: () => void;
  onRecord: () => void;
}> = ({ rows, chosen, onToggle, playingOne, onPlayOne, state, picked, onPlayTogether, onSend, asked, onAsk, onRecord }) => {
  if (!rows) return <Helper icon={<Loader2 className="animate-spin" />}>ვეძებ ჩანაწერებს…</Helper>;
  if (!rows.length) {
    return (
      <>
        <H2 className="pt-1">ჯერ არავის ჩაუწერია</H2>
        <Steps items={[
          'წევრები ამ საგალობელს „პროგრამაში“ გახსნიან, დააჭერენ „ჩემი ხმის ჩაწერა“ და ყურსასმენით თავიანთ ხმას ჩაწერენ.',
          'ჩანაწერები აქ გამოჩნდება — მონიშნავ, ვისი შევიდეს, და ერთად მოისმენ.',
          '„კლასის ჩატში“ — ყველა ხმა ერთ ჩანაწერად წავა კლასში.',
        ]} />
        <div className="grid shrink-0 gap-2.5 min-[440px]:grid-cols-2">
          <Button kind="soft" icon={asked === 'asking' ? <Loader2 className="animate-spin" /> : asked === 'yes' ? <Check /> : <Megaphone />}
            disabled={asked === 'asking' || asked === 'yes'} onClick={onAsk}>
            {asked === 'yes' ? 'კლასს ვთხოვე' : 'კლასს ვთხოვ'}
          </Button>
          <Button kind="ghost" icon={<Mic />} onClick={onRecord}>ჩემი ხმის ჩაწერა</Button>
        </div>
        {asked === 'yes' && <Line tone="leaf">კლასის ჩატში ჩაიწერა თხოვნა.</Line>}
        {asked === 'error' && <Line tone="danger">ვერ გაიგზავნა — სცადე ხელახლა.</Line>}
      </>
    );
  }
  return (
    <>
      <Note>მონიშნე, ვისი ჩანაწერი შევიდეს. ყველა ერთად ჟღერს, ერთ დროს იწყება.</Note>
      <Rows>
        {rows.map(r => {
          const on = chosen.has(r.uid);
          const playing = playingOne === r.uid;
          return (
            <Row key={r.uid} className="pl-1.5"
              lead={<><CheckButton on={on} onChange={() => onToggle(r.uid)} label={`${r.name} — შედის ჩანაწერში`} /><Avatar name={r.name} photo={r.photo || undefined} /></>}
              title={r.name} sub={VOICE_LABEL[r.voice]}
              right={(
                <RoundButton label={playing ? 'გაჩერება' : 'მოსმენა'} tone="page" className="text-wine" onClick={() => onPlayOne(r.uid)}>
                  {playing ? <Pause /> : <Play />}
                </RoundButton>
              )} />
          );
        })}
      </Rows>
      <div className="grid shrink-0 gap-2.5 min-[440px]:grid-cols-2">
        <Button kind="ghost" icon={state === 'playing' ? <Pause /> : <Users />} disabled={!picked || state === 'sending'} onClick={onPlayTogether}>
          {state === 'playing' ? 'გაჩერება' : 'ერთად მოსმენა'}
        </Button>
        <Button icon={state === 'sending' ? <Loader2 className="animate-spin" /> : <Send />} disabled={!picked || state === 'sending' || state === 'sent'} onClick={onSend}>
          {state === 'sending' ? 'იგზავნება…' : 'კლასის ჩატში'}
        </Button>
      </div>
      {state === 'sent' && <Line tone="leaf" icon={<Check />}>ჯგუფური გალობა კლასის ჩატშია</Line>}
      {state === 'error' && <Line tone="danger">ვერ გაიგზავნა — სცადე ხელახლა.</Line>}
    </>
  );
};
