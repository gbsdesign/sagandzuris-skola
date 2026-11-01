import React from 'react';
import { VariantPage } from './rounds/variants';
import { VineMine } from './vazi/Mine';
import { VineHarvest } from './vazi/Harvest';

// „ჩემი ვაზი“ (2026-11-01, the plan's Georgian game №1, like Tamagotchi): the tabs „ონლაინ · ჰიბრიდული“ — my vine, grown from
// what I did in the app, and the class's harvest on one screen.
const VaziGame: React.FC = () => <VariantPage target="vazi" store="sg-vazi-tab" online={<VineMine />} table={<VineHarvest />} />;

export default VaziGame;
