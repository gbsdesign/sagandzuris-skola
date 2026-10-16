import React from 'react';
import {
  Bell,
  Bird,
  BookOpen,
  Church,
  Clock,
  Cross,
  Feather,
  Flower,
  Grape,
  HandHeart,
  Heart,
  Hourglass,
  Library,
  LucideIcon,
  MessageCircleHeart,
  MicVocal,
  Moon,
  Music,
  NotebookPen,
  ScrollText,
  Sparkle,
  Sprout,
  Star,
  Sunrise,
  Users,
} from 'lucide-react';
import { HABIT_TONES, HabitIconId, HabitLook } from '../../data/habitLooks';

const ICONS: Record<HabitIconId, LucideIcon> = {
  sunrise: Sunrise,
  moon: Moon,
  clock: Clock,
  'book-open': BookOpen,
  'scroll-text': ScrollText,
  library: Library,
  heart: Heart,
  music: Music,
  'notebook-pen': NotebookPen,
  church: Church,
  bell: Bell,
  star: Star,
  'hand-heart': HandHeart,
  'message-circle-heart': MessageCircleHeart,
  grape: Grape,
  cross: Cross,
  feather: Feather,
  flower: Flower,
  sprout: Sprout,
  bird: Bird,
  'mic-vocal': MicVocal,
  users: Users,
  hourglass: Hourglass,
  sparkle: Sparkle,
};

export const HabitIcon: React.FC<{ icon: HabitIconId; className?: string }> = ({ icon, className }) => {
  const Icon = ICONS[icon] ?? Sparkle;
  return <Icon className={className} aria-hidden />;
};

/** the habit's colour itself */
export const colorOf = (look: HabitLook | undefined): string => HABIT_TONES[look?.tone ?? 'wine'].c;

/** the colour made see-through: `tint('#8a2a33', 0.12)` for soft backgrounds */
export const tint = (color: string, alpha: number): string => color + Math.round(alpha * 255).toString(16).padStart(2, '0');

/** The habit's icon on a soft round patch of its colour. */
export const HabitBadge: React.FC<{ look: HabitLook | undefined; size?: 'sm' | 'md' }> = ({ look, size = 'md' }) => {
  const c = colorOf(look);
  return (
    <span
      className={`shrink-0 rounded-full flex items-center justify-center ${size === 'sm' ? 'w-7 h-7' : 'w-9 h-9'}`}
      style={{ background: tint(c, 0.13), color: c }}
    >
      <HabitIcon icon={look?.icon ?? 'sparkle'} className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-[18px] h-[18px]'} />
    </span>
  );
};
