import React from 'react';
import { PearlChests } from '../../components/pearls/PearlChests';
import { VariantPage } from './rounds/variants';
import { ClassChestTable } from './margalitebi/ClassChest';

// „მარგალიტები“ in the games hub (2026-11-04): „ონლაინ“ = my chests (the same panel as the round button of „საგანძურის გზა“,
// components/pearls/PearlChests.tsx), „ჰიბრიდული“ = „კლასის სკივრი“, teams singing in turn on one phone (margalitebi/ClassChest.tsx).

const MargalitebiGame: React.FC = () => <VariantPage target="margalitebi" store="sg-margalitebi-tab" online={<PearlChests />} table={<ClassChestTable />} />;

export default MargalitebiGame;
