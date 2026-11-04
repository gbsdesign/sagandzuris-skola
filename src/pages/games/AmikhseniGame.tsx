import React from 'react';
import { RoundsPage } from './rounds/RoundsPage';
import { AMIK_FACE } from './amikhseni/face';
import { AmikhseniTable } from './amikhseni/Table';

// „ამიხსენი“ (games hub, 2026-10-28; online since 2026-11-04): a word explained in other words, never said. Two tabs:
// online in a class's room (the host explains in the room's call, everyone writes the word on their own phone —
// amikhseni/face.tsx over the quick games' screens pages/games/rounds/) and on one phone with the class in teams, the
// Alias-like game (amikhseni/Table.tsx). The rules utils/amikhseniRounds.ts (the room) and utils/amikhseni.ts (one phone),
// the cards data/amikhseniWords.ts, what the phone keeps amikhseni/store.ts.

const AmikhseniGame: React.FC = () => <RoundsPage face={AMIK_FACE} table={<AmikhseniTable />} />;

export default AmikhseniGame;
