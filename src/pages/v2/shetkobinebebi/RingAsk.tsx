import React from 'react';
import { Bell, Check } from 'lucide-react';
import { Button, Dot, Duo, cx } from '../../../components/ui2';

// x-zarebi-baneri — the new look of the card that asks once for calls and letters with the app closed
// (components/calls/PhoneRingSetup.tsx keeps every rule: when it shows, „მოგვიანებით“ = a week, binding the phone).
// One sentence and two buttons; it floats over the bottom menu (`overNav`) or at the bottom where the menu steps aside.

export const RingAsk: React.FC<{
  done: boolean; busy: boolean; err: string; overNav: boolean; onLater: () => void; onTurnOn: () => void;
}> = ({ done, busy, err, overNav, onLater, onTurnOn }) => (
  <div
    role="dialog"
    aria-label="ზარები და შეტყობინებები ტელეფონზე"
    className={cx(
      'sg-up fixed left-1/2 z-[80] flex w-[min(440px,calc(100%-24px))] -translate-x-1/2 flex-col gap-3 rounded-card bg-surf p-4 text-ink shadow-float',
      overNav ? 'bottom-[calc(max(16px,env(safe-area-inset-bottom))+76px)]' : 'bottom-[calc(env(safe-area-inset-bottom)+12px)]',
    )}
  >
    <div className="flex items-start gap-3">
      <Dot icon={done ? <Check /> : <Bell />} color={done ? 'leaf' : 'tint'} size={40} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-lead leading-snug font-bold wrap-break-word">{done ? 'ჩართულია' : 'ჩართე ზარები და წერილები'}</p>
        <p className="text-meta leading-snug text-mut wrap-break-word">
          {done ? 'აპი დახურულიც დარეკავს და შეგატყობინებს.' : 'დაგირეკავს და წერილს გაჩვენებს მაშინაც, როცა აპი დახურულია.'}
        </p>
        {err && <p role="alert" className="mt-1 text-meta leading-snug font-semibold text-danger">{err}</p>}
      </div>
    </div>
    {!done && (
      <Duo>
        <Button kind="quiet" size="md" disabled={busy} onClick={onLater}>მოგვიანებით</Button>
        <Button size="md" disabled={busy} icon={<Bell aria-hidden="true" />} onClick={onTurnOn}>{busy ? 'ირთვება…' : 'ჩართვა'}</Button>
      </Duo>
    )}
  </div>
);
