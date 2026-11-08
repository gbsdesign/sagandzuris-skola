import React from 'react';
import { BookOpen, Music2 } from 'lucide-react';
import { useNavigation } from '../../context';
import { useAccess } from '../../hooks/useAccess';
import { Tabs } from '../../components/ui/kit';

// „ღვთისმსახურება“ (2026-11-09, the user: „გალობას დააწერე ღვთისმსახურება და შიგნით მოათავსე მედავითნეობის ღილაკი … გადამრთველი
// დაუყენე გალობა მედავითნე და მედავითნეზე დაჭერისას პირდაპირ წიგნები იხსნებოდეს, ხოლო თავში მედავითნეთათვის სასწავლო ბარათი“):
// one switch on top of the chant services and of the reader's books. A switch turns the page in place, so the phone's back
// leaves „ღვთისმსახურება“ from either side. Shown only while the reader's section is open for the person.
type Side = 'galoba' | 'medavitne';
const SIDES: { id: Side; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'galoba', label: 'გალობა', Icon: Music2 },
  { id: 'medavitne', label: 'მედავითნე', Icon: BookOpen },
];

export const useReaderOpen = () => useAccess().section('medavitneobaTopic') === 'open';

export const WorshipSwitch: React.FC<{ value: Side }> = ({ value }) => {
  const { navigateTo, openMapItem } = useNavigation();
  if (!useReaderOpen()) return null;
  const go = (id: Side) => {
    if (id === value) return;
    navigateTo(id === 'galoba' ? 'galoba' : 'medavitneoba');
    openMapItem('', true);
  };
  return (
    <div className="w-full max-w-2xl mx-auto px-1">
      <Tabs cols={2} items={SIDES} value={value} onChange={go} />
    </div>
  );
};
