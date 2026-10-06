import React, { useEffect } from 'react';
import { useModal, useAuth } from '../context';
import { useAccess } from '../hooks/useAccess';
import { askSignIn } from './access/SignInPrompt';
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
  const access = useAccess();
  // Protected features: if user is guest (!user), show AuthPromptModal instead of internal info
  const isProtectedFeature = !!activeModal && ['bookmark', 'chvevebi', 'manera', 'gza'].includes(activeModal);
  // signed in, but not let in by a superadmin yet: „მიმდინარეობს დამატება“ instead; let in without this section:
  // the window simply does not open
  const notMine = isProtectedFeature && !!user && (!access.member || !access.can(activeModal === 'chvevebi' ? 'chvevebi' : 'gza'));
  useEffect(() => {
    if (!notMine) return;
    closeModal();
    if (!access.member) askSignIn(activeModal === 'chvevebi' ? 'ჩვევები' : 'საგანძურის გზა');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notMine]);

  if (!activeModal || notMine) return null;

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
