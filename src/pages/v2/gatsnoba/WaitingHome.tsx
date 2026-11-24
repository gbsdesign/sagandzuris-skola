import React, { useState } from 'react';
import { Hourglass, House, MessageCircle } from 'lucide-react';
import { useAuth, useNavigation } from '../../../context';
import { Dot, Row, Rows } from '../../../components/ui2';
import { useMembership } from '../../../utils/memberAccess';
import { kaName } from '../../../utils/georgianName';

// x-elodeba — „განაცხადი მიღებულია“: a new member a superadmin has not let in yet sees, in place of the home page, one calm
// screen — what happens, what comes next, whom to write to. „დაათვალიერე აპი“ shows the home page for the rest of the
// visit (the open parts can already be used); the next visit shows this again until the answer comes. No notice is sent
// when one is let in (the open app greets them — MembershipGate), so the words say only that everything opens by itself. The old look keeps
// its thin „მიმდინარეობს დამატება“ strip (components/access/MembershipGate `WaitingBanner`).

const SEEN = 'sg-waiting-seen';
const seen = () => { try { return sessionStorage.getItem(SEEN) === '1'; } catch { return false; } };

export const WaitingHome: React.FC<{ home: React.ReactNode }> = ({ home }) => {
  const { user } = useAuth();
  const { openDm } = useNavigation();
  const waiting = useMembership().status === 'pending';
  const [skip, setSkip] = useState(seen);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!user || !waiting || skip) return <>{home}</>;

  const browse = () => {
    try { sessionStorage.setItem(SEEN, '1'); } catch { /* this visit only */ }
    setSkip(true);
  };
  const write = async () => {
    setBusy(true); setError('');
    try {
      const { openAdminThread } = await import('../../../hooks/useDirectChat');
      openDm(await openAdminThread({ uid: user.uid, name: kaName(user.displayName) || '', photoURL: user.photoURL || '' }));
    } catch {
      setError('ვერ გაიხსნა — სცადე ცოტა ხანში.');
    }
    setBusy(false);
  };

  return (
    <div className="flex w-full flex-col items-center gap-3 pt-14 pb-5 text-center">
      <span aria-hidden="true" className="flex size-[84px] items-center justify-center rounded-full bg-tint text-wine [&_svg]:size-8">
        <Hourglass strokeWidth={1.75} />
      </span>
      <h1 className="mt-4 text-hero leading-tight font-bold tracking-tight wrap-break-word">განაცხადი მიღებულია</h1>
      <p className="max-w-[340px] text-body leading-normal text-mut">ადმინი ნახავს და კლასში დაგამატებს. დადასტურებისთანავე ყველაფერი თავისით გაიხსნება.</p>
      <Rows className="mt-5 w-full max-w-[360px] text-left">
        <Row lead={<Dot icon={<House />} />} title="დაათვალიერე აპი" sub="რაც ღიაა, უკვე შეგიძლია ნახო" onClick={browse} />
        <Row lead={<Dot icon={<MessageCircle />} />} title="მიწერე გიორგი გაბუნიას" sub={busy ? 'იხსნება…' : 'თუ კითხვა გაქვს'} onClick={() => void write()} disabled={busy} />
      </Rows>
      {error && <p role="alert" className="text-meta font-semibold text-danger">{error}</p>}
    </div>
  );
};
