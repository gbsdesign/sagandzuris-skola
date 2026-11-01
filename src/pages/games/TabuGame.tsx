import React from 'react';
import { VariantPage } from './rounds/variants';
import { TabuSolo } from './tabu/Solo';
import { TabuTeams } from './tabu/Teams';

// „ნუ იტყვი!“ (2026-11-01, like Taboo): the tabs „ონლაინ · ჰიბრიდული“ — the day's twenty cards alone (the five forbidden words
// as clues), the teams on one phone.
const TabuGame: React.FC = () => <VariantPage target="tabu" store="sg-tabu-tab" online={<TabuSolo />} table={<TabuTeams />} />;

export default TabuGame;
