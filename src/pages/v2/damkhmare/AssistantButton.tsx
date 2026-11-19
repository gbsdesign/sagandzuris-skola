import React from 'react';
import { Sparkles } from 'lucide-react';
import { RoundButton } from '../../../components/ui2';
import { openAssistant, useAssistantAllowed } from './open';

/** The round ✦ that opens „AI დამხმარე“ — on the class page's bar and in the admin panel. Nothing for anyone else. */
export const AssistantButton: React.FC<{ classId?: string; size?: 44 | 36 }> = ({ classId, size = 44 }) => {
  const allowed = useAssistantAllowed();
  if (!allowed) return null;
  return (
    <RoundButton label="AI დამხმარე" size={size} onClick={() => openAssistant({ classId })}>
      <Sparkles aria-hidden="true" strokeWidth={1.75} />
    </RoundButton>
  );
};
