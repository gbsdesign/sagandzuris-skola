import React, { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { Area, Button, Note, Sheet } from '../../../components/ui2';

// An admin's „ყველას მიწერა“: one text for everyone — here and on the phones (the wrapper sends it).

export const WriteSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  onSend: (text: string) => Promise<void>;
}> = ({ open, onClose, onSend }) => {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const send = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setErr('');
    try {
      await onSend(text);
      setText('');
      onClose();
    } catch {
      setErr('ვერ გაიგზავნა. სცადე ცოტა ხანში.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} title="ყველას მიწერა" onClose={() => { setErr(''); onClose(); }}>
      <Note>ყველას მოუვა — აქაც და ტელეფონზეც.</Note>
      <Area label="შეტყობინება" hideLabel value={text} onChange={setText} maxLength={1000} placeholder="რა უნდა იცოდეს ყველამ?" />
      {err && <p role="alert" className="px-1.5 text-meta font-semibold text-danger">{err}</p>}
      <Button
        full
        icon={busy ? <Loader2 className="animate-spin" /> : <Send />}
        disabled={busy || !text.trim()}
        onClick={send}
      >
        გაგზავნა
      </Button>
    </Sheet>
  );
};
