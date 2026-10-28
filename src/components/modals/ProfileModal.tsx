import React from 'react';
import { Sheet } from '../ui/kit';
import { StudentProfileCard } from '../views/StudentProfileCard';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => (
  <Sheet open={isOpen} onClose={onClose} title="პირადი პროფილი და განრიგი">
    <StudentProfileCard />
  </Sheet>
);
