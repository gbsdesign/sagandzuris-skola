import React, { useMemo } from 'react';
import type { EzoId } from '../../../data/ezoGames';
import { fieldSvg } from '../../../utils/ezoFields';

/** a yard game's field (the drawing is our own constant markup, see utils/ezoFields.ts); no label = only an ornament */
export const Field: React.FC<{ id: EzoId; pebble?: number; done?: number; label?: string; className?: string }> = ({ id, pebble, done, label, className = '' }) => {
  const html = useMemo(() => fieldSvg(id, { pebble, done }), [id, pebble, done]);
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true as const };
  return <div {...a11y} className={`[&>svg]:block [&>svg]:w-full [&>svg]:h-auto ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
};
