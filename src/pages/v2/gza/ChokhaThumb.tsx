import React from 'react';
import { useSamosiSrc } from '../../../utils/samosiDye';
import { SAMOSI_COLORS, SAMOSI_DEFAULT_COLOR, samosiThumb } from '../../../data/samosiData';

/** The chokha in its chosen colour (the path's ring, the profile's head). */
export const ChokhaThumb: React.FC<{ color: string; size?: number }> = ({ color, size = 34 }) => {
  const dye = color !== SAMOSI_DEFAULT_COLOR ? SAMOSI_COLORS.find(c => c.id === color)?.hex ?? null : null;
  const src = useSamosiSrc(samosiThumb('chokha'), dye);
  return src ? <img src={src} alt="" draggable={false} className="object-contain" style={{ width: size, height: size }} /> : null;
};
