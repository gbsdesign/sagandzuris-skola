import React from 'react';
import { VariantPage } from './rounds/variants';
import { MinishnebaSolo } from './minishneba/Solo';
import { MinishnebaTable } from './minishneba/Table';

// „ერთი მინიშნება“ (2026-11-01, like Just One): the tabs „ონლაინ · ჰიბრიდული“ — thirteen words alone, the clues of five
// players with the same ones struck; the class round one phone, each writing a clue in secret.
const MinishnebaGame: React.FC = () => <VariantPage target="minishneba" store="sg-minishneba-tab" online={<MinishnebaSolo />} table={<MinishnebaTable />} />;

export default MinishnebaGame;
