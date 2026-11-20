// „გაზიარება“ of the notes page in the new look (board x-notebi-qr): the chant's name, its QR code for a phone nearby,
// one „გაზიარება“ (the phone offers its own apps) and „კოპირება“. Takes a history entry (sgQr), so the phone's back closes it.
import React, { useEffect, useState } from 'react';
import { Copy, Share } from 'lucide-react';
import { Button, Duo, Sheet } from '../../../components/ui2';
import { useBackClose } from '../../notes/QrTools';

export const ShareSheet: React.FC<{
  url: string;
  title: string;
  /** the chant's grey line (book, page, №) */
  sub: string;
  /** the notes page's toast (seen once the sheet closes) */
  say: (msg: string) => void;
  onClose: () => void;
}> = ({ url, title, sub, say, onClose }) => {
  const back = useBackClose('sgQr', onClose);
  const [svg, setSvg] = useState('');
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let alive = true;
    import('qrcode-generator').then(({ default: qrcode }) => {
      const qr = qrcode(0, 'M');
      qr.addData(url);
      qr.make();
      if (alive) setSvg(qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true }));
    }).catch(() => alive && setSvg(''));
    return () => { alive = false; };
  }, [url]);
  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2400);
    return () => window.clearTimeout(t);
  }, [copied]);

  const copy = () => {
    try {
      navigator.clipboard.writeText(url).then(() => { setCopied(true); say('ბმული დაკოპირდა'); }, () => say(url));
    } catch { say(url); }
  };
  const share = () => {
    if (typeof navigator.share === 'function') navigator.share({ title, url }).catch(() => { /* closed by the person */ });
    else copy();
  };

  return (
    <Sheet open title="გაზიარება" onClose={back} back={false}>
      <div className="shrink-0 px-2 text-center">
        <div className="text-head font-bold wrap-break-word">{title}</div>
        {sub && <div className="text-meta text-mut wrap-break-word">{sub}</div>}
      </div>
      <div className="flex size-[204px] shrink-0 items-center justify-center self-center rounded-tile bg-surf p-4 text-mut">
        {svg
          ? <div role="img" aria-label="ამ ნოტების QR კოდი" className="size-full [&_svg]:block [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} />
          : <span role="status" aria-label="იტვირთება" className="size-full rounded-field bg-track motion-safe:animate-pulse" />}
      </div>
      <p className="shrink-0 px-4 text-center text-body text-mut">მეორე ტელეფონი კამერას მიუშვერს — ეს ნოტები გაიხსნება.</p>
      <Duo>
        <Button icon={<Share />} onClick={share}>გაზიარება</Button>
        <Button kind="ghost" icon={<Copy />} onClick={copy}>{copied ? 'დაკოპირდა' : 'კოპირება'}</Button>
      </Duo>
    </Sheet>
  );
};
