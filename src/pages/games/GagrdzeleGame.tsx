import React from 'react';
import { Timer } from 'lucide-react';
import { GAGRDZELE_CLIP, GAGRDZELE_SECONDS, type GagrdzeleQ } from '../../utils/gagrdzele';
import { RoundsPage } from './rounds/RoundsPage';
import { RoundsSolo } from './rounds/Solo';
import { GAGRDZELE_FACE } from './gagrdzele/face';

// „გააგრძელე!“ (games hub, 2026-11-01, like Don't Forget the Lyrics!): a folk song stops — which line comes next? Three tabs:
// alone (ten songs in a row and my best, rounds/Solo.tsx), online in a class's room, or on one phone with the class in teams
// singing from memory. The shared screens pages/games/rounds/, the game's own pages/games/gagrdzele/, rules utils/gagrdzele.ts.

const line = (q: GagrdzeleQ) => ({ title: `„${q.song}“`, sub: q.options[q.right] });

const Solo: React.FC = () => (
  <RoundsSolo
    face={GAGRDZELE_FACE}
    heading="ათი სიმღერა ზედიზედ"
    about={`შენ მარტო: სიმღერის სტრიქონი ჩნდება — აირჩიე, რომელი მოდის შემდეგ. ყოველ სიმღერას ${GAGRDZELE_SECONDS} წამი აქვს (ჩანაწერიანს — ${GAGRDZELE_SECONDS + GAGRDZELE_CLIP}); რაც უფრო მალე უპასუხებ, მით მეტი ქულაა.`}
    line={q => line(q as GagrdzeleQ)}
  />
);

const GagrdzeleGame: React.FC = () => <RoundsPage face={GAGRDZELE_FACE} solo={{ label: 'მარტო', Icon: Timer, node: <Solo /> }} />;

export default GagrdzeleGame;
