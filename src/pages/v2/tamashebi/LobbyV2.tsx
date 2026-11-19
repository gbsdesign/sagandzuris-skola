import React, { useState } from 'react';
import { BookOpen, Info, LogIn, LogOut, Play, X } from 'lucide-react';
import { Avatar, Button, Card, Helper, Note, RoundButton, Rows, SectionLabel, Seg, Sheet, Steps } from '../../../components/ui2';

// A room before the game in the new look (board x-otakhi-molodini; the canvas's note: „მოსაცდელ ოთახში ჩანს, ვინ მზადაა და ვის
// ელოდებით“): who leads and who came in, a row each; the host's choices; the rules in a window; one main button at the bottom.
// Drawn inside the game's full-screen frame (TableScreen); the logic stays in pages/games/rounds/RoundsLobby.tsx.

export interface LobbyPerson { uid: string; name: string; photo?: string; sub?: string; status: string; ready?: boolean; me?: boolean }

export const LobbyV2: React.FC<{
  /** the wine card's words: who invites, what to do */
  lead: { title: string; text: string };
  warn?: string[];
  people: LobbyPerson[];
  countLine: string;
  fits: boolean;
  onKick?: (uid: string) => void;
  rounds?: { value: number; options: number[]; set: (n: number) => void } | { fixed: number };
  sound?: { value: 'all' | 'host'; set: (v: 'all' | 'host') => void; hint: string };
  extra?: React.ReactNode;
  call?: React.ReactNode;
  steps: string[];
  onCloseRoom?: () => void;
  helper: string;
}> = ({ lead, warn, people, countLine, fits, onKick, rounds, sound, extra, call, steps, onCloseRoom, helper }) => {
  const [rules, setRules] = useState(false);
  return (
    <div className="flex flex-col gap-3 py-1">
      <Card className="flex flex-col gap-1">
        <p className="text-lead font-bold wrap-break-word">{lead.title}</p>
        <p className="text-meta leading-snug text-mut wrap-break-word">{lead.text}</p>
      </Card>
      {warn?.map((w, i) => <p key={i} className="rounded-tile bg-gold-tint px-4 py-2.5 text-meta leading-snug font-bold text-gold-ink">{w}</p>)}

      <SectionLabel label={`მოთამაშეები · ${people.filter(p => !p.sub).length}`} right={<span className={`text-meta font-bold tabular-nums ${fits ? 'text-leaf-ink' : 'text-gold-ink'}`}>{countLine}</span>} />
      <Rows role="list">
        {people.map(p => (
          <div key={p.uid} role="listitem" className="flex min-h-row items-center gap-3 py-2 pr-2 pl-4">
            <Avatar name={p.name} photo={p.photo || undefined} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="sg-fit truncate text-lead font-bold">{p.me ? 'შენ' : p.name}</span>
              {p.sub && <span className="text-meta text-mut">{p.sub}</span>}
            </span>
            <span className={`shrink-0 pr-2 text-meta font-bold ${p.ready ? 'text-wine' : 'text-mut'}`}>{p.status}</span>
            {onKick && !p.sub && !p.me && (
              <RoundButton size={36} tone="plain" label={`${p.name} — ოთახიდან გაყვანა`} onClick={() => onKick(p.uid)}><X strokeWidth={2} /></RoundButton>
            )}
          </div>
        ))}
      </Rows>
      <Helper icon={<Info />}>{helper}</Helper>

      {(rounds || sound || extra) && (
        <Card className="flex flex-col gap-3">
          {rounds && ('fixed' in rounds
            ? <p className="text-body font-bold">რაუნდები · {rounds.fixed}</p>
            : (
              <>
                <p className="text-body font-bold">რაუნდები</p>
                <Seg label="რაუნდები" value={String(rounds.value)} onChange={v => rounds.set(Number(v))} items={rounds.options.map(n => ({ id: String(n), label: String(n) }))} />
              </>
            ))}
          {extra}
          {sound && (
            <>
              <p className="text-body font-bold">სად ჟღერს ნაწყვეტი</p>
              <Seg label="სად ჟღერს ნაწყვეტი" value={sound.value} onChange={sound.set} items={[{ id: 'all', label: 'ყველას ტელეფონზე' }, { id: 'host', label: 'მხოლოდ ჩემზე' }]} />
              <Note>{sound.hint}</Note>
            </>
          )}
        </Card>
      )}

      {call}

      <Button kind="ghost" full icon={<BookOpen strokeWidth={1.75} />} onClick={() => setRules(true)}>წესები მოკლედ</Button>
      {onCloseRoom && <Button kind="quiet" full onClick={onCloseRoom}>ოთახის დახურვა</Button>}

      <Sheet open={rules} title="წესები მოკლედ" onClose={() => setRules(false)}>
        <Steps items={steps} current={-1} />
      </Sheet>
    </div>
  );
};

/** the lobby's main button at the bottom: the host starts, a player comes in or goes */
export const LobbyFoot: React.FC<{ kind: 'start' | 'join' | 'leave'; disabled?: boolean; onClick: () => void }> = ({ kind, disabled, onClick }) =>
  kind === 'start' ? <Button full disabled={disabled} icon={<Play strokeWidth={2} />} onClick={onClick}>თამაშის დაწყება</Button>
    : kind === 'join' ? <Button full disabled={disabled} icon={<LogIn strokeWidth={2} />} onClick={onClick}>შესვლა</Button>
    : <Button kind="ghost" full icon={<LogOut strokeWidth={1.75} />} onClick={onClick}>ოთახიდან გასვლა</Button>;
