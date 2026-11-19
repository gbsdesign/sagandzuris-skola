import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Button, Note, Sheet, Steps } from '../../../components/ui2';
import { isAndroidApp } from '../../../utils/androidApp';
import { isIphoneApp } from '../../../utils/iosApp';

// „პარამეტრები“ of the learning mode's „მიკროფონი გამორთულია“ (board x-ultra-khma, the note's 4th case): a site cannot open
// the phone's settings, so this says where the switch is — in the app, on an iPhone or in Chrome — then „ხელახლა ცდა“.
// Going on without the microphone stays a quiet word (the phrase is then marked by hand).

const isIos = () => typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);

const stepsHere = (): string[] => {
  if (isAndroidApp()) return ['გახსენი ტელეფონის „პარამეტრები“', '„აპები“ → „საგანძური“', '„ნებართვები“ → „მიკროფონი“ → „ნებართვა“'];
  if (isIphoneApp()) return ['გახსენი iPhone-ის „პარამეტრები“', 'ჩამოდი „საგანძური“-მდე', 'ჩართე „მიკროფონი“'];
  if (isIos()) return ['მისამართის ზოლში შეეხე „aA“-ს', '„ვებგვერდის პარამეტრები“ → „მიკროფონი“', 'აირჩიე „ნებართვა“'];
  return ['მისამართის ზოლში შეეხე ბოქლომის ნიშანს', '„ნებართვები“ → „მიკროფონი“', 'აირჩიე „ნებართვა“'];
};

export const MicHelpSheet: React.FC<{ open: boolean; onClose: () => void; onRetry: () => void; onSkip: () => void }> = ({
  open, onClose, onRetry, onSkip,
}) => (
  <Sheet open={open} title="მიკროფონის ჩართვა" onClose={onClose}>
    <Steps items={stepsHere()} current={-1} />
    <Note>ჩართვის მერე დაბრუნდი აქ და კიდევ სცადე.</Note>
    <Button full icon={<RefreshCw />} onClick={onRetry}>ხელახლა ცდა</Button>
    <Button full kind="quiet" onClick={onSkip}>მიკროფონის გარეშე გავაგრძელებ</Button>
  </Sheet>
);
