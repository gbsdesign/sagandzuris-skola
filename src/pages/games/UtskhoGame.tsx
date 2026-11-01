import React from 'react';
import { VariantPage } from './rounds/variants';
import { UtskhoSolo } from './utskho/Solo';
import { UtskhoTable } from './utskho/Table';

// „უცხო სოფელში“ (2026-11-01, like Spyfall): the tabs „ონლაინ · ჰიბრიდული“ — alone I am the stranger (the day's place for the
// whole school, found from the villagers' answers), the class around one phone (a secret card each, the clock, accusations).
const UtskhoGame: React.FC = () => <VariantPage target="utskho" store="sg-utskho-tab" online={<UtskhoSolo />} table={<UtskhoTable />} />;

export default UtskhoGame;
