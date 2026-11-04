import React from 'react';
import { VariantPage } from './rounds/variants';
import { EzoRules } from './ezo/Rules';
import { Referee } from './ezo/Referee';
import { TAB_KEY } from './ezo/store';

// „ეზოს მსაჯი“ (2026-11-04, the plan's game like Capture the Flag): „ონლაინ“ = the five yard games' rules with pictures and a
// quiz; „ჰიბრიდული“ = the teacher's phone referees in the yard (teams, whistle, clock, points, the season). The hub's buttons
// open their tab (requestOpen('ezo', 'online' | 'table')). Its printed kit is src/print/games/ezos-msaji.js.

const EzoGame: React.FC = () => <VariantPage target="ezo" store={TAB_KEY} online={<EzoRules />} table={<Referee />} />;

export default EzoGame;
