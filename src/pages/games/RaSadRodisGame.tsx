import React from 'react';
import { RoundsPage } from './rounds/RoundsPage';
import { RSR_FACE } from './rsr/face';
import { RsrTable } from './rsr/Table';

// „რა? სად? როდის?“ (games hub, 2026-10-28; online since 2026-11-04): a quiz in the school's own topics, one minute a
// question. Two tabs: online in a class's room (everyone writes the answer on their own phone, the host judges —
// rsr/face.tsx over the quick games' screens pages/games/rounds/) and on one phone with the class in teams and paper slips
// (rsr/Table.tsx). The rules utils/raSadRodis.ts, the questions data/raSadRodisQuestions.ts, what the phone keeps rsr/store.ts.

const RaSadRodisGame: React.FC = () => <RoundsPage face={RSR_FACE} table={<RsrTable />} />;

export default RaSadRodisGame;
