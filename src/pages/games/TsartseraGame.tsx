import React from 'react';
import { VariantPage } from './rounds/variants';
import { TsartseraDaily } from './tsartsera/Solo';
import { TsartseraTable } from './tsartsera/Teams';

// „ხუცური წარწერა“ (2026-11-01): the day's line alone — „ონლაინ“ — and the teams before one screen — „ჰიბრიდული“; the hub's
// buttons open their tab (requestOpen('tsartsera', 'online' | 'table')). Its printed kit is public/games/print/khutsuri-tsartsera.pdf.
const TsartseraGame: React.FC = () => <VariantPage target="tsartsera" store="sg-tsartsera-tab" online={<TsartseraDaily />} table={<TsartseraTable />} />;

export default TsartseraGame;
