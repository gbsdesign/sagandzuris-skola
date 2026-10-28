import React, { useEffect } from 'react';
import { useModal, useAuth } from '../context';
import { useAccess } from '../hooks/useAccess';
import { askSignIn } from './access/SignInPrompt';
import { ProfileModal, ManeraModal } from './modals';

const FEATURE_NAMES: Record<string, string> = {
  bookmark: 'დამოუკიდებელი სამუშაო',
  chvevebi: 'ჩვევები',
  manera: 'ოსტატობა',
  gza: 'საგანძურის გზა',
};

export const AppModals: React.FC = () => {
  const { activeModal, closeModal } = useModal();
  const { user } = useAuth();
  const access = useAccess();
  const isProtectedFeature = !!activeModal && ['bookmark', 'chvevebi', 'manera', 'gza'].includes(activeModal);
  // a guest (or a member a superadmin has not let in yet): the app's one sign-in sheet (or „მიმდინარეობს დამატება“)
  // instead; let in without this section: the window simply does not open
  const notMine = isProtectedFeature && (!user || !access.member || !access.can(activeModal === 'chvevebi' ? 'chvevebi' : 'gza'));
  useEffect(() => {
    if (!notMine) return;
    closeModal();
    if (!user || !access.member) askSignIn(FEATURE_NAMES[activeModal!] || 'საგანძურის გზა');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notMine]);

  if (!activeModal || notMine) return null;

  return (
    <>
      <ProfileModal isOpen={activeModal === 'profile'} onClose={closeModal} />
      <ManeraModal isOpen={activeModal === 'manera'} onClose={closeModal} />
    </>
  );
};
