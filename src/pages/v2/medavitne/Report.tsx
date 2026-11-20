import React, { useEffect, useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { Area, Button, Helper, Note, Sheet } from '../../../components/ui2';
import { useAuth } from '../../../context';
import { openAdminThread, sendThreadText } from '../../../hooks/useDirectChat';
import { errorText } from '../../../utils/errorText';
import { REPORT_MAX, placeLine, reportText, type ReportPlace } from '../../../utils/dayReport';

// „შეცდომა ვნახე“ under a step of „დღის მსახურება“: the reader writes what does not match their temple's service. It is sent
// as a letter into the reader's own chat with the administration (hooks/useDirectChat — no store of its own), with the
// place it was written at (utils/dayReport); the answer comes back in „წერილები“.

export const ReportSheet: React.FC<{ place: ReportPlace | null; onClose: () => void }> = ({ place, onClose }) => {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const key = place ? `${place.iso}|${place.service}|${place.n}` : '';
  // another step: an empty box again
  useEffect(() => { setText(''); setSent(false); setError(''); }, [key]);

  const send = async () => {
    if (!user || !place || !text.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      const me = { uid: user.uid, name: user.displayName || '', photoURL: user.photoURL || '' };
      const id = await openAdminThread(me);
      await sendThreadText(id, { ...me, teacher: false }, reportText(place, text));
      setSent(true);
    } catch (e) {
      setError('ვერ გაიგზავნა: ' + errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={!!place} title="შეცდომა ვნახე" onClose={onClose}>
      {place && (
        <>
          <Note>{placeLine(place)}</Note>
          {sent ? (
            <>
              <Helper icon={<CheckCircle2 />}>გაიგზავნა — გმადლობთ! პასუხს „წერილებში“ ნახავ.</Helper>
              <Button kind="ghost" full onClick={onClose}>დახურვა</Button>
            </>
          ) : (
            <>
              <Area label="რა არ ემთხვევა?" value={text} onChange={setText} rows={4} maxLength={REPORT_MAX} autoFocus
                placeholder="მაგ.: ჩვენს ტაძარში აქ სხვა ტროპარი იკითხება" />
              {error && <p className="px-1.5 text-meta font-semibold text-danger">{error}</p>}
              <Button full icon={<Send />} disabled={busy || !text.trim()} onClick={() => { void send(); }}>
                {busy ? 'იგზავნება…' : 'გაგზავნა'}
              </Button>
              <Note>ადმინისტრაციას მიუვა წერილად — იმ ადგილის მითითებით, სადაც ახლა ხარ.</Note>
            </>
          )}
        </>
      )}
    </Sheet>
  );
};
