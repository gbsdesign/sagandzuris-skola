import React from 'react';
import { Sheet } from '../ui/kit';
import { ManeraContent, ManeraAverageBadge } from '../views/ManeraPanel';

interface ManeraModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Kept for any caller that still opens manner as a window; the path page shows the same content folded in place.
export const ManeraModal: React.FC<ManeraModalProps> = ({ isOpen, onClose }) => (
  <Sheet open={isOpen} onClose={onClose} wide title={<span className="inline-flex items-center gap-2.5">ოსტატობა <ManeraAverageBadge /></span>}>
    <ManeraContent />
  </Sheet>
);
