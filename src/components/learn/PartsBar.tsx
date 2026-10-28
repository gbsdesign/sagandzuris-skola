import React from 'react';
import type { PieceProgress } from '../../utils/learn';

// One cell per part of a piece, as the teacher (and the member) sees how far the learning mode got: gold = learned,
// wine = being learned, paper = not tried yet.

const CELL = ['bg-[#efe5d4]', 'bg-[#7a2028]/35', 'bg-[#c9962a]'];

export const PartsBar: React.FC<{ p: PieceProgress; className?: string }> = ({ p, className }) => (
  <span role="img" aria-label={`ნასწავლი ${p.learned} / ${p.total} ნაწილი`} className={`flex gap-[3px] ${className || ''}`}>
    {p.marks.map((m, i) => <span key={i} className={`h-2 min-w-[4px] flex-1 rounded-full ${CELL[m]}`} />)}
  </span>
);
