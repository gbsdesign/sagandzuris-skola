import React from 'react';
import { VariantPage } from './rounds/variants';
import { DressSolo } from './chaitsvi/Solo';
import { DressTable } from './chaitsvi/Teams';

// „ჩაიცვი ქართულად“ (2026-11-01, the plan's Georgian game №8, a dress-up game): the tabs „ონლაინ · ჰიბრიდული“ — dress the chokha
// (or the published Georgian dress) alone against the clock, or the teams in turn on one phone.
const ChaitsviGame: React.FC = () => <VariantPage target="chaitsvi" store="sg-chaitsvi-tab" online={<DressSolo />} table={<DressTable />} />;

export default ChaitsviGame;
