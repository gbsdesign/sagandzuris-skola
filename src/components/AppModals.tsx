import React from 'react';
import { useModal, useAuth } from '../context';
import {
  ProfileModal,
  BookmarkModal,
  ChvevebiModal,
  ManeraModal,
  GzaModal,
  AuthPromptModal,
  GoogleDriveModal,
} from './modals';

const FEATURE_NAMES: Record<string, string> = {
  bookmark: '„დამოუკიდებელი სამუშაო“ განყოფილებით',
  chvevebi: '„ჩვევები“ განყოფილებით',
  manera: '„მანერა“ განყოფილებით',
  gza: '„საგანძურის გზა“ განყოფილებით',
};

export const AppModals: React.FC = () => {
  const { activeModal, closeModal } = useModal();
  const { user } = useAuth();

  if (!activeModal) return null;

  // Protected features: if user is guest (!user), show AuthPromptModal instead of internal info
  const isProtectedFeature = ['bookmark', 'chvevebi', 'manera', 'gza'].includes(activeModal);

  if (isProtectedFeature && !user) {
    return (
      <AuthPromptModal
        isOpen={true}
        onClose={closeModal}
        targetFeatureName={FEATURE_NAMES[activeModal] || 'ამ განყოფილებით'}
      />
    );
  }

  return (
    <>
      <ProfileModal isOpen={activeModal === 'profile'} onClose={closeModal} />
      <BookmarkModal isOpen={activeModal === 'bookmark'} onClose={closeModal} />
      <ChvevebiModal isOpen={activeModal === 'chvevebi'} onClose={closeModal} />
      <ManeraModal isOpen={activeModal === 'manera'} onClose={closeModal} />
      <GzaModal isOpen={activeModal === 'gza'} onClose={closeModal} />
      <GoogleDriveModal isOpen={activeModal === 'drive'} onClose={closeModal} />
    </>
  );
};
