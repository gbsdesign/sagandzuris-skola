import React, { useMemo } from 'react';
import { useMembership } from '../../../utils/memberAccess';
import { hangebiEar } from '../../../data/hangebiPool';
import { Chip } from '../../../components/games/Chip';
import { setLevel, useLevel, type LevelChoice } from './store';

// „ოთხი ჰანგი, ერთი სიტყვა“'s choice, in the room's lobby (the host's), in the one-phone setup and over a run alone: by word,
// by ear (four songs of a region) or both. Only when the recordings may be heard — else every round is by word.

const CHOICES: { id: LevelChoice; label: string }[] = [
  { id: 'both', label: 'ორივე' },
  { id: 'word', label: 'სიტყვით' },
  { id: 'ear', label: 'ყურით' },
];
const NOTE: Record<LevelChoice, string> = {
  both: 'რიგრიგობით: ოთხი სიტყვა, მერე ოთხი სიმღერის ნაწყვეტი.',
  word: 'ოთხი სიტყვა — მათი საერთო სიტყვა უნდა ააწყო.',
  ear: 'ოთხი სიმღერის ნაწყვეტი ერთი კუთხიდან — კუთხე უნდა ააწყო.',
};

export const HangebiOptions: React.FC = () => {
  const { can } = useMembership();
  const recordings = can('recordings');
  const ear = useMemo(() => hangebiEar().length > 0, [recordings]); // eslint-disable-line react-hooks/exhaustive-deps
  const level = useLevel();
  if (!ear) return null;
  return (
    <div className="space-y-2">
      <p className="text-[13.5px] font-bold text-[#4a3426]">როგორ</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="როგორ">
        {CHOICES.map(c => <Chip key={c.id} on={level === c.id} onClick={() => setLevel(c.id)}>{c.label}</Chip>)}
      </div>
      <p className="text-[12.5px] leading-snug text-[#9a8b7b]">{NOTE[level]}</p>
    </div>
  );
};
