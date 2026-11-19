import React from 'react';
import { ArrowRight, Hourglass, Lock } from 'lucide-react';
import { useAuth, useNavigation } from '../../../context';
import { Button, Card, TopBar } from '../../../components/ui2';
import { openSignIn } from '../../../components/access/SignInPrompt';
import { SECTIONS } from '../../../data/sections';

// A closed part in the new look (board x-dakhuruli): not a blurred home with a window over it — the part's own page opens,
// with its name in the bar, and one card says in one sentence what a member gets here, with „შესვლა“ (the sign-in screen,
// SignInScreenV2). A member still waiting for a superadmin reads that it opens by itself.

/** what a member gets in each part, one sentence (by the section's id) */
const GETS: Record<string, string> = {
  galoba: 'შედი და გაიხსნება ნოტები, ჩანაწერები და სწავლის რეჟიმი.',
  simghera: 'შედი და გაიხსნება ხალხური სიმღერები, საკრავები და მთქმელები რუკაზე.',
  mtkmeli: 'შედი და გაიხსნება მთქმელები და მათი ლექსები.',
  sakravebi: 'შედი და გაიხსნება ქართული საკრავები და მათი ჩანაწერები.',
  medavitneoba: 'შედი და შენი კლასის ფსალმუნთა ჯგუფს შეუერთდები.',
  medavitneobaTopic: 'შედი და გაიხსნება მედავითნის გაკვეთილები.',
  chvevebi: 'შედი და შენი ჩვევები ყოველდღე თან გექნება.',
  tamashebi: 'შედი და გაიხსნება ყველა თამაში — მარტო, ონლაინ და კლასთან ერთად.',
  tsinaprebi: 'შედი და გაიცნობ წინაპრების ცხოვრებას.',
  gza: 'შედი და შენი გალობა, ჩვევები და კლასი თან გექნება.',
  biblioteka: 'შედი და გაიხსნება წიგნები და წმიდანთა ცხოვრებები.',
  videoebi: 'შედი და გაიხსნება „ეთნოფორი“, ფილმები და მონასტრების ვიდეოები.',
  eklesiebi: 'შედი და გაიხსნება ტაძრები რუკაზე და გზა მათთან.',
};
const PLAIN = 'შედი Google-ით ან ელფოსტით — პაროლი არ გჭირდება.';

/** The card itself (a picture of its props, for the page and the preview). */
export const LockedCard: React.FC<{ waiting: boolean; sentence: string; onSignIn: () => void }> = ({ waiting, sentence, onSignIn }) => (
  <Card className="flex flex-col items-center gap-2 px-5 pt-7 pb-5 text-center">
    <span aria-hidden="true" className="mb-1.5 flex size-16 items-center justify-center rounded-full bg-tint text-wine [&_svg]:size-7">
      {waiting ? <Hourglass /> : <Lock />}
    </span>
    <h2 className="text-head font-bold">{waiting ? 'დამატება მიმდინარეობს' : 'წევრებისთვისაა'}</h2>
    <p className="max-w-[320px] text-body leading-normal text-mut">
      {waiting ? 'ადმინისტრაცია განიხილავს შენს რეგისტრაციას. დადასტურებისთანავე ეს ნაწილი თავისით გაიხსნება.' : sentence}
    </p>
    {!waiting && <Button full icon={<ArrowRight />} onClick={onSignIn} className="mt-3">შესვლა</Button>}
  </Card>
);

export const LockedV2: React.FC<{ what: string }> = ({ what }) => {
  const { user } = useAuth();
  const { handleGoBack } = useNavigation();
  const id = SECTIONS.find(s => s.label === what)?.id;
  return (
    <div className="flex w-full flex-col gap-2.5 pb-4">
      <TopBar title={what} onBack={handleGoBack} />
      <LockedCard waiting={!!user} sentence={(id && GETS[id]) || PLAIN} onSignIn={openSignIn} />
    </div>
  );
};
