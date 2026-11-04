import React from 'react';
import { RoundsPage } from './rounds/RoundsPage';
import { CHURCHKHELA_FACE } from './churchkhela/face';
import { ChurchkhelaTable } from './churchkhela/Table';

// „ცხელი ჩურჩხელა“ (games hub, 2026-10-28; online since 2026-11-04): Hot Potato with the school's recordings. Two tabs: online in a
// class's room — everybody holds the churchkhela on their own phone while the music plays there, whoever still holds it when it
// stops is burnt and does the task in the call (churchkhela/face.tsx over the quick games' screens pages/games/rounds/) — and
// one phone in the circle with a real churchkhela (churchkhela/Table.tsx). The rules utils/churchkhelaRounds.ts (the room) and
// utils/churchkhela.ts (one phone).

const ChurchkhelaGame: React.FC = () => <RoundsPage face={CHURCHKHELA_FACE} table={<ChurchkhelaTable />} />;

export default ChurchkhelaGame;
