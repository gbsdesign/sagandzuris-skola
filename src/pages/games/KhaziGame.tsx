import React from 'react';
import { VariantPage } from './rounds/variants';
import { KhaziSolo } from './khazi/Solo';
import { KhaziTable } from './khazi/Teams';

// „დროის ხაზი“ (2026-11-01, the plan's Georgian game №7, like Timeline): the tabs „ონლაინ · ჰიბრიდული“ — the day's line and the
// endless game alone, the teams on one screen.
const KhaziGame: React.FC = () => <VariantPage target="khazi" store="sg-khazi-tab" online={<KhaziSolo />} table={<KhaziTable />} />;

export default KhaziGame;
