import React from 'react';
import { Check } from 'lucide-react';
import { ALPHABET, SCRIPTS, SCRIPT_LABEL, toScript, type Script } from '../../../utils/oldScripts';
import { Chip } from '../../../components/games/Chip';

// The pieces of „ასოების ბადე“ shared by the day's grid and the teams' screen: the script's choice, the alphabet's key under
// an old-script grid and the list of words to find.

/** მხედრული · ნუსხური · ასომთავრული (or the scripts given), each with its first letter */
export const ScriptChips: React.FC<{ value: Script; onChange: (s: Script) => void; only?: Script[] }> = ({ value, onChange, only = SCRIPTS }) => (
  <div className="flex flex-wrap gap-1.5" role="group" aria-label="დამწერლობა">
    {only.map(s => (
      <Chip key={s} on={value === s} onClick={() => onChange(s)}>
        <span className="inline-flex items-center gap-1.5">
          <span className="font-serif-ge text-[17px] leading-none" aria-hidden="true">{toScript('ა', s)}</span>
          {SCRIPT_LABEL[s]}
        </span>
      </Chip>
    ))}
  </div>
);

/** the 33 letters in the old script over today's — always under a nuskhuri or asomtavruli grid */
export const AlphabetKey: React.FC<{ script: Script; dark?: boolean }> = ({ script, dark }) => {
  if (script === 'mkhedruli') return null;
  return (
    <div className={`rounded-2xl px-2 py-2.5 ${dark ? 'bg-white/10' : 'bg-[#f6efe2] ring-1 ring-[#e8dcc8]'}`}>
      <p className={`px-1 pb-1.5 text-[12px] font-bold ${dark ? 'text-[#e2c27a]' : 'text-[#75685a]'}`}>ანბანის გასაღები · {SCRIPT_LABEL[script]}</p>
      <ul className="grid grid-cols-11 gap-[3px]" aria-label={`${SCRIPT_LABEL[script]} ანბანი`}>
        {ALPHABET.map(ch => (
          <li key={ch} className={`flex flex-col items-center justify-center rounded-lg py-1 ${dark ? 'bg-white/10' : 'bg-white'}`}>
            <span className={`font-serif-ge font-bold text-[19px] leading-none ${dark ? 'text-[#fbf6ec]' : 'text-[#3d2a1e]'}`}>{toScript(ch, script)}</span>
            <span className={`mt-1 text-[11px] leading-none ${dark ? 'text-[#c9bfae]' : 'text-[#8a7a6a]'}`}>{ch}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export interface ListItem { word: string; color?: string; who?: string; missed?: boolean }

/** the words to find: a found one filled with its colour and ticked (with its finder's name), a missed one dashed */
export const WordList: React.FC<{ items: ListItem[]; onPick?: (i: number) => void; picked?: number | null }> = ({ items, onPick, picked = null }) => (
  <ul className="flex flex-wrap gap-1.5" aria-label="სიტყვები">
    {items.map((it, i) => {
      const found = !!it.color && !it.missed;
      const base = 'min-h-10 px-3 rounded-full inline-flex items-center gap-1.5 text-[14px] font-bold';
      const look = found
        ? 'text-[#3d2a1e]'
        : it.missed
          ? 'text-[#8a7a6a] border-[1.5px] border-dashed border-[#b9a88f]'
          : picked === i ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426]';
      const body = (
        <>
          {found && <Check className="w-3.5 h-3.5 shrink-0" style={{ color: it.color }} aria-hidden="true" />}
          <span>{it.word}</span>
          {it.who && <span className="text-[11.5px] font-bold opacity-80">· {it.who}</span>}
        </>
      );
      const style = found ? { background: `${it.color}2e`, boxShadow: `inset 0 0 0 1.5px ${it.color}` } : undefined;
      return (
        <li key={it.word}>
          {onPick && !found && !it.missed
            ? <button type="button" onClick={() => onPick(i)} aria-pressed={picked === i} className={`${base} ${look} cursor-pointer active:scale-[0.97] transition`}>{body}</button>
            : <span className={`${base} ${look}`} style={style}>{body}</span>}
        </li>
      );
    })}
  </ul>
);
