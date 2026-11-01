import React from 'react';
import { VariantPage } from './rounds/variants';
import { SaidumloSolo } from './saidumlo/Solo';
import { SaidumloTable } from './saidumlo/Table';

// „საიდუმლო სახელები“ (2026-11-01, like Codenames): the tabs „ონლაინ · ჰიბრიდული“ — the day's board alone (the app gives the
// clues, „ოთხეული“'s groups), the class around one phone (the board) with the captains' key on their own phones by its code.
const SaidumloGame: React.FC = () => <VariantPage target="saidumlo" store="sg-saidumlo-tab" online={<SaidumloSolo />} table={<SaidumloTable />} />;

export default SaidumloGame;
