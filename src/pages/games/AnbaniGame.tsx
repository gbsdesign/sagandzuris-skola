import React from 'react';
import { VariantPage } from './rounds/variants';
import { AnbaniPath } from './anbani/Path';
import { AnbaniTable } from './anbani/Teams';

// „სამი დამწერლობა“ (2026-11-01): the old scripts' path of daily lessons alone — „ონლაინ“ — and „სწრაფი კითხვა“ before one
// screen — „ჰიბრიდული“; the hub's buttons open their tab (requestOpen('anbani', 'online' | 'table')). Its printed kit is
// public/games/print/sami-damtserloba.pdf.
const AnbaniGame: React.FC = () => <VariantPage target="anbani" store="sg-anbani-tab" online={<AnbaniPath />} table={<AnbaniTable />} />;

export default AnbaniGame;
