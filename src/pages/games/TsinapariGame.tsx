import React from 'react';
import { VariantPage } from './rounds/variants';
import { TsinapariSolo } from './tsinapari/Solo';
import { TsinapariTableGame } from './tsinapari/Teams';

// „წინაპრის გზა“ (2026-11-01, the plan's Georgian game, like a choose-your-own-adventure book): the great chanters' lives as
// forks — alone on the phone („ონლაინ“) or the class's teams voting with printed letter cards while the host's phone tells the
// story („ჰიბრიდული“); the hub's buttons open their tab (requestOpen('tsinapari', 'online' | 'table')). Its printed kit is
// src/print/games/tsinapris-gza.js: the stories as gamebooks of numbered sections, the letter cards and the host's key.
const TsinapariGame: React.FC = () => <VariantPage target="tsinapari" store="sg-tsinapari-tab" online={<TsinapariSolo />} table={<TsinapariTableGame />} />;

export default TsinapariGame;
