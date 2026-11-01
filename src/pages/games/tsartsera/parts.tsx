import React from 'react';
import { ALPHABET, SCRIPT_LABEL, toScript, type Script } from '../../../utils/oldScripts';
import { TS_MODES, MODE_LABEL, type TsMode } from '../../../utils/tsartsera';
import { Chip } from '../../../components/games/Chip';

// Small pieces of „ხუცური წარწერა“: the way to play and the player's own alphabet — the old letters they have read themself.

export const ModeChips: React.FC<{ value: TsMode; onChange: (m: TsMode) => void }> = ({ value, onChange }) => (
  <div className="flex flex-wrap gap-1.5" role="group" aria-label="როგორ ვითამაშო">
    {TS_MODES.map(m => <Chip key={m} on={value === m} onClick={() => onChange(m)}>{MODE_LABEL[m]}</Chip>)}
  </div>
);

/** the 33 old letters, the ones the player has read themself dark, the rest faint */
export const KnownAlphabet: React.FC<{ script: Script; known: string[] }> = ({ script, known }) => (
  <div>
    <div className="flex items-baseline justify-between gap-2">
      <p className="text-[13px] font-bold text-[#4a3426]">{SCRIPT_LABEL[script]}</p>
      <p className="text-[13px] font-bold tabular-nums text-[#7a2028]">{known.length} / 33</p>
    </div>
    <ul className="mt-1.5 grid grid-cols-11 gap-[3px]" aria-label={`${SCRIPT_LABEL[script]}: ნასწავლი ასოები`}>
      {ALPHABET.map(ch => {
        const on = known.includes(ch);
        return (
          <li
            key={ch}
            title={on ? `${ch} — ნასწავლი` : ch}
            className={`flex flex-col items-center justify-center rounded-lg py-1 ${on ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-[#f3ece0] text-[#b9a88f]'}`}
          >
            <span className="font-serif-ge font-bold text-[18px] leading-none">{toScript(ch, script)}</span>
            <span className={`mt-1 text-[11px] leading-none ${on ? 'text-[#fbf6ec]/80' : 'text-[#c9bba6]'}`}>{on ? ch : '·'}</span>
          </li>
        );
      })}
    </ul>
  </div>
);
