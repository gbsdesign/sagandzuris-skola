import React from 'react';
import { RoundsPage } from './rounds/RoundsPage';
import { GATVLA_FACE } from './gatvla/face';
import { GatvlaTable } from './gatvla/Table';

// „გათვლა“ (games hub, 2026-10-28; online since 2026-11-04): who starts, whose turn, who is in which team. Two tabs: online in a
// class's room — „ვის შეხვდება?“, everyone counts the rhyme round the room's names on their own phone (gatvla/face.tsx over
// the quick games' screens pages/games/rounds/) — and one phone in the circle (gatvla/Table.tsx: counting, the wheel, teams).
// The rules utils/gatvlaRounds.ts (the room) and utils/gatvla.ts (one phone), what the phone keeps gatvla/store.ts.

const GatvlaGame: React.FC = () => <RoundsPage face={GATVLA_FACE} table={<GatvlaTable />} />;

export default GatvlaGame;
