import React from 'react';
import { Timer } from 'lucide-react';
import { RUKA_LISTEN, RUKA_SECONDS, type RukaQ } from '../../utils/ruka';
import { RoundsPage } from './rounds/RoundsPage';
import { RoundsSolo } from './rounds/Solo';
import { RUKA_FACE, rukaRegionName } from './ruka/face';
import { RukaOptions } from './ruka/Options';

// „რუკის ვიქტორინა“ (games hub, 2026-11-01, like Seterra): a town, a lake, a dish, a fortress, a poet or a folk song to put on
// Georgia's map, quick. Three tabs: alone (ten in a row and my best, rounds/Solo.tsx), online in a class's room, or on one
// phone with the class in teams. The shared screens pages/games/rounds/, the game's own pages/games/ruka/, rules utils/ruka.ts.

const line = (q: RukaQ) => ({ title: q.topic === 'song' ? `„${q.name}“` : q.name, sub: rukaRegionName(q.region) });

const Solo: React.FC = () => (
  <RoundsSolo
    face={RUKA_FACE}
    heading="ათი კითხვა ზედიზედ"
    about={`შენ მარტო: ქალაქი, ტბა, კერძი, ციხე, პოეტი ან სიმღერა — შეეხე მის კუთხეს რუკაზე. ყოველ კითხვას ${RUKA_SECONDS} წამი აქვს (სიმღერას ${RUKA_LISTEN}); რაც უფრო მალე უპასუხებ, მით მეტი ქულაა.`}
    Options={RukaOptions}
    note="კითხვები ხელოვნურმა ინტელექტმა შეადგინა და მასწავლებელს ჯერ არ შეუმოწმებია."
    line={q => line(q as RukaQ)}
  />
);

const RukaGame: React.FC = () => <RoundsPage face={RUKA_FACE} solo={{ label: 'მარტო', Icon: Timer, node: <Solo /> }} />;

export default RukaGame;
