import React from 'react';
import { VariantPage } from './rounds/variants';
import { VinSolo } from './vin/Solo';
import { VinTableGame } from './vin/Table';

// „ვინ ვარ მე?“ (2026-11-01, like Twenty Questions and Guess Who): the tabs „ონლაინ · ჰიბრიდული“ — the day's person alone (ready
// yes/no questions, a board of 24 names), the class on one phone (the name on a guesser's forehead, the class answers).
const VinGame: React.FC = () => <VariantPage target="vin" store="sg-vin-tab" online={<VinSolo />} table={<VinTableGame />} />;

export default VinGame;
