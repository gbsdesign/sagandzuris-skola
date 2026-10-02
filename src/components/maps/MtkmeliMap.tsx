import React, { useState } from 'react';
import { MapPin, ArrowLeft, Check, Plus, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { MTKMELI_REGIONS, MtkmeliRegionData, PoemItem } from '../../data';
export { MTKMELI_REGIONS };
export type { MtkmeliRegionData, PoemItem };

interface MtkmeliMapProps {
  onSelectRegion?: (regionId: string, regionName: string) => void;
  selectedChantVariants?: Record<string, any>;
  onTogglePoem?: (
    poemId: string,
    poemTitle: string,
    author: string,
    regionCode: string,
    regionName: string
  ) => void;
}

export const MtkmeliMap: React.FC<MtkmeliMapProps> = ({
  onSelectRegion,
  selectedChantVariants = {},
  onTogglePoem,
}) => {
  const [selectedRegionData, setSelectedRegionData] = useState<MtkmeliRegionData | null>(null);
  const [expandedPoemId, setExpandedPoemId] = useState<string | null>(null);

  const handleRegionClick = (region: MtkmeliRegionData) => {
    setSelectedRegionData(region);
    setExpandedPoemId(null);
    if (onSelectRegion) {
      onSelectRegion(region.id, region.nameGe);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center gap-3 animate-in fade-in duration-200">
      {/* Detail View when a region button is clicked */}
      {selectedRegionData ? (
        <div className="w-full bg-white border border-amber-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col gap-3.5 animate-in zoom-in-95 duration-150">
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-amber-200/60 pb-2.5">
            <button
              type="button"
              onClick={() => setSelectedRegionData(null)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-extrabold text-xs transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>უკან დაბრუნება</span>
            </button>
            <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-900">
              {selectedRegionData.regionCode}
            </span>
          </div>

          {/* Region Title Banner */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-[#85502c] flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800 leading-tight">
                {selectedRegionData.nameGe}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                მთქმელთა საუნჯე და ლექსები
              </p>
            </div>
          </div>

          {/* Poems List */}
          <div className="flex flex-col gap-2 pt-1">
            <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider">
              გამორჩეული ლექსები და თქმულებები
            </h4>

            {selectedRegionData.poems && selectedRegionData.poems.length > 0 ? (
              <div className="flex flex-col gap-2">
                {selectedRegionData.poems.map((poem) => {
                  const isSelected = Boolean(selectedChantVariants[poem.id]);
                  const isExpanded = expandedPoemId === poem.id;

                  return (
                    <div
                      key={poem.id}
                      className={`rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-amber-100/70 border-amber-400 text-amber-950 shadow-2xs'
                          : 'bg-slate-50/70 border-slate-200/80 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between p-2.5 gap-2">
                        <div
                          className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                          onClick={() => setExpandedPoemId(isExpanded ? null : poem.id)}
                        >
                          <span className="px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-bold text-slate-600 shrink-0">
                            {poem.regionCode}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs sm:text-sm font-bold truncate">
                              {poem.title}
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium">
                              {poem.author}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setExpandedPoemId(isExpanded ? null : poem.id)}
                            className="p-1 rounded-lg bg-white hover:bg-slate-100 text-slate-500 border border-slate-200 text-xs"
                            title={isExpanded ? 'დაკეცვა' : 'სრული ტექსტი'}
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (onTogglePoem) {
                                onTogglePoem(
                                  poem.id,
                                  poem.title,
                                  poem.author,
                                  selectedRegionData.regionCode,
                                  selectedRegionData.nameGe
                                );
                              }
                            }}
                            className={`p-1.5 rounded-lg border transition-all ${
                              isSelected
                                ? 'bg-amber-600 text-white border-amber-700 shadow-2xs'
                                : 'bg-white text-slate-400 hover:text-amber-800 border-slate-200'
                            }`}
                            title={isSelected ? 'ამოღება' : 'დამატება საგანძურის გზაზე'}
                          >
                            {isSelected ? (
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            ) : (
                              <Plus className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Poem Full Text */}
                      {isExpanded && (
                        <div className="p-3 border-t border-amber-200/50 bg-white/80 rounded-b-xl text-xs sm:text-sm text-slate-700 font-serif leading-relaxed whitespace-pre-line animate-in fade-in duration-150">
                          {poem.text}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 px-4 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-slate-400 flex flex-col items-center gap-1.5">
                <BookOpen className="w-6 h-6 text-slate-300" />
                <span className="text-xs font-semibold">ამ რეგიონის ლექსები და თქმულებები მალე დაემატება</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Regions Menu Buttons */
        <div className="w-full flex flex-col gap-2">
          {MTKMELI_REGIONS.map((region) => (
            <button
              key={region.id}
              type="button"
              onClick={() => handleRegionClick(region)}
              className="w-full relative group overflow-hidden py-3 px-4 rounded-xl bg-gradient-to-r from-[#ba8555] via-[#a66d3d] to-[#8d5427] text-white font-bold text-sm tracking-wide shadow-xs hover:shadow-md active:scale-95 border border-[#ebd0ad]/55 hover:border-[#ffe2be] transition-all duration-200 cursor-pointer flex items-center justify-between select-none"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ffeed6]"></span>
                <span className="font-extrabold text-[#fffefb] drop-shadow-xs">
                  {region.nameGe}
                </span>
              </div>
              <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-black/20 text-[#ffe5c4] border border-white/20">
                {region.regionCode}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
