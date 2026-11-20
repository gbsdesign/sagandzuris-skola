import React from 'react';
import { RoundButton } from '../../../components/ui2';
import { GearSpark } from './GearSpark';
import { openAssistant, useAssistantAllowed } from './open';

/** The round cog that opens „ავტომატური პროგრამა“ — on the class page's bar and in the admin panel. Nothing for anyone else. */
export const AssistantButton: React.FC<{ classId?: string; size?: 44 | 36 }> = ({ classId, size = 44 }) => {
  const allowed = useAssistantAllowed();
  if (!allowed) return null;
  return (
    <RoundButton label="ავტომატური პროგრამა" size={size} onClick={() => openAssistant({ classId, page: 'class' })}>
      <GearSpark />
    </RoundButton>
  );
};
