import React, { useState } from 'react';
import { ArrowLeft, Music, Check, Plus } from 'lucide-react';
import { INSTRUMENTS_LIST, InstrumentItem } from '../../data';
export { INSTRUMENTS_LIST };
export type { InstrumentItem };

export interface SakravebiViewProps {
  selectedChantVariants?: Record<string, any>;
  onToggleInstrument?: (instrumentId: string, instrumentName: string) => void;
}

export const SakravebiView: React.FC<SakravebiViewProps> = ({
  selectedChantVariants = {},
  onToggleInstrument,
}) => {
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentItem | null>(null);

  const isSelected = selectedInstrument ? Boolean(selectedChantVariants[selectedInstrument.id]) : false;

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center gap-3 animate-in fade-in duration-200">
      {/* Detail View when an instrument button is clicked */}
      {selectedInstrument ? (
        <div className="w-full bg-white border border-amber-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col gap-3.5 animate-in zoom-in-95 duration-150">
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-amber-200/60 pb-2.5">
            <button
              type="button"
              onClick={() => setSelectedInstrument(null)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-extrabold text-xs transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>უკან დაბრუნება</span>
            </button>
            <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-900">
              საკრავების საუნჯე
            </span>
          </div>

          {/* Instrument Title Banner & Action */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-[#85502c] flex items-center justify-center shrink-0">
                <Music className="w-4 h-4" />
              </div>
              <h3 className="text-base font-extrabold text-slate-800 leading-tight">
                {selectedInstrument.nameGe}
              </h3>
            </div>

            <button
              type="button"
              onClick={() => {
                if (onToggleInstrument) {
                  onToggleInstrument(selectedInstrument.id, selectedInstrument.nameGe);
                }
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-black transition-all cursor-pointer shadow-2xs ${
                isSelected
                  ? 'bg-amber-600 text-white border-amber-700 ring-2 ring-amber-400/40'
                  : 'bg-white hover:bg-amber-50 text-slate-700 border-slate-300'
              }`}
            >
              {isSelected ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>მონიშნულია</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>საგანძურის გზაზე დამატება</span>
                </>
              )}
            </button>
          </div>

          <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200/50 text-xs sm:text-sm text-slate-600 font-medium">
            ქართული ტრადიციული საკრავი — {selectedInstrument.nameGe}. საკრავის შესახებ ისტორიული ცნობები, ვიდეო გაკვეთილები და აკორდები მალე დაემატება.
          </div>
        </div>
      ) : (
        /* Instruments Menu Buttons */
        <div className="w-full flex flex-col gap-2">
          {INSTRUMENTS_LIST.map((instrument) => {
            const isInstSelected = Boolean(selectedChantVariants[instrument.id]);

            return (
              <button
                key={instrument.id}
                type="button"
                onClick={() => setSelectedInstrument(instrument)}
                className="w-full relative group overflow-hidden py-3 px-4 rounded-xl bg-gradient-to-r from-[#ba8555] via-[#a66d3d] to-[#8d5427] text-white font-bold text-sm tracking-wide shadow-xs hover:shadow-md active:scale-95 border border-[#ebd0ad]/55 hover:border-[#ffe2be] transition-all duration-200 cursor-pointer flex items-center justify-between select-none"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ffeed6]"></span>
                  <span className="font-extrabold text-[#fffefb] drop-shadow-xs">
                    {instrument.nameGe}
                  </span>
                </div>
                {isInstSelected && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-900/60 text-amber-200 border border-amber-400/40 text-[10px] font-black">
                    მონიშნულია ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
