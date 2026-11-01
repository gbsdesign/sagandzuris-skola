import React from 'react';
import { VariantPage } from './rounds/variants';
import { BadeDaily } from './bade/Solo';
import { BadeTable } from './bade/Teams';

// „ასოების ბადე“ (games hub, 2026-11-01, the plan's Georgian game №3, like Word search): words hidden in a square of letters, in
// today's letters or the old ones. „ონლაინ“ = the day's grid and more alone (bade/Solo.tsx), „ჰიბრიდული“ = the class in teams
// on one phone (bade/Teams.tsx); the rules are utils/bade.ts and utils/badeTeams.ts, the themes data/badeThemes.ts.
const BadeGame: React.FC = () => <VariantPage target="bade" store="sg-bade-tab" online={<BadeDaily />} table={<BadeTable />} />;

export default BadeGame;
