import React, { useState } from 'react';
import { Loader2, MessageCircle, Users } from 'lucide-react';
import { useAuth, useNavigation } from '../../../context';
import { Button, TopBar } from '../../../components/ui2';
import { openAdminThread } from '../../../hooks/useDirectChat';

/** x-carieli-klasi — the class page of someone who is in no class (or whose class is not found): what is true and who adds them. */
export const EmptyClassScreen: React.FC = () => {
  const { user } = useAuth();
  const { handleGoBack, openDm } = useNavigation();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // the administration's chat, as the class chat's „პასუხი“ opens it
  const write = async () => {
    if (!user || busy) return;
    setBusy(true);
    setErr('');
    try {
      const id = await openAdminThread({ uid: user.uid, name: user.displayName || '', photoURL: user.photoURL || '' });
      openDm(id);
    } catch (e) {
      console.warn('admin thread: ', e);
      setErr('ჩათი ვერ გაიხსნა. სცადე მოგვიანებით.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-2 pb-4">
      <TopBar title="კლასი" onBack={handleGoBack} />
      <div className="flex flex-col items-center gap-3 px-6 pt-16 pb-6 text-center">
        <span aria-hidden="true" className="flex size-[88px] items-center justify-center rounded-full bg-tint text-wine [&_svg]:size-9">
          <Users strokeWidth={1.5} />
        </span>
        <h2 className="mt-3 text-title font-bold">ჯერ კლასში არ ხარ</h2>
        <p className="max-w-[300px] text-body text-mut">
          კლასში მასწავლებელი ან ადმინი გამატებს. სანამ ელოდები, შეგიძლია სკოლას მისწერო.
        </p>
        {user && (
          <Button kind="ghost" size="md" className="mt-3" icon={busy ? <Loader2 className="animate-spin" /> : <MessageCircle />} onClick={write} disabled={busy}>
            მივწერო სკოლას
          </Button>
        )}
        {err && <p role="alert" className="text-meta text-danger">{err}</p>}
      </div>
    </div>
  );
};
