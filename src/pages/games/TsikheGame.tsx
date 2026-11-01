import React from 'react';
import { VariantPage } from './rounds/variants';
import { TsikheSolo } from './tsikhe/Solo';
import { TsikheTableGame } from './tsikhe/Teams';

// „ციხის გასაღები“ (2026-11-01, the plan's Georgian game №12, like an escape room): the castles alone or with friends round one
// phone — „ონლაინ“ — and the class's race with the printed cards, the phone being the locks — „ჰიბრიდული“; the hub's buttons
// open their tab (requestOpen('tsikhe', 'online' | 'table')). Its printed kit is public/games/print/tsikhis-gasaghebi.pdf.
const TsikheGame: React.FC = () => <VariantPage target="tsikhe" store="sg-tsikhe-tab" online={<TsikheSolo />} table={<TsikheTableGame />} />;

export default TsikheGame;
