import React from 'react';
import { Timer } from 'lucide-react';
import { EAR_SECONDS, HANGEBI_WORDS, WORD_SECONDS, type HangebiQ } from '../../utils/hangebi';
import { RoundsPage } from './rounds/RoundsPage';
import { RoundsSolo } from './rounds/Solo';
import { HANGEBI_FACE } from './hangebi/face';
import { HangebiOptions } from './hangebi/Options';

// „ოთხი ჰანგი, ერთი სიტყვა“ (games hub, 2026-11-01, like 4 Pics 1 Word): four clues, one word built from letters. Three tabs:
// alone (ten in a row and my best, rounds/Solo.tsx), online in a class's room, or on one phone with the class in teams writing
// on paper. The shared screens pages/games/rounds/, the game's own pages/games/hangebi/, rules utils/hangebi.ts.

const line = (q: HangebiQ) => ({ title: HANGEBI_WORDS[q.answer], sub: (q.clues ?? q.names ?? []).join(' · ') });

const Solo: React.FC = () => (
  <RoundsSolo
    face={HANGEBI_FACE}
    heading="ათი თავსატეხი ზედიზედ"
    about={`შენ მარტო: ოთხი სიტყვა ან ოთხი ნაწყვეტი — ასოებით ააწყე მათი საერთო სიტყვა. სიტყვას ${WORD_SECONDS} წამი აქვს, ნაწყვეტებს — ${EAR_SECONDS}; რაც უფრო მალე ააწყობ, მით მეტი ქულაა.`}
    Options={HangebiOptions}
    line={q => line(q as HangebiQ)}
  />
);

const HangebiGame: React.FC = () => <RoundsPage face={HANGEBI_FACE} solo={{ label: 'მარტო', Icon: Timer, node: <Solo /> }} />;

export default HangebiGame;
