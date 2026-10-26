import React, { useEffect, useState } from 'react';
import { Wand2, RotateCcw, Check, Eye, EyeOff, ArrowUp, ArrowDown, Minus, Plus } from 'lucide-react';
import { useAuth } from '../../context';
import { KABA_PARTS, KabaPart } from '../../data/kabaData';
import {
  KabaError, KabaHead, KabaPiece, KABA_PROBLEM_TEXT, canvasUrl, makeKabaFigure, makeKabaPart, publishKaba, saveKabaHead, saveKabaPiece,
} from '../../utils/kabaArt';
import { Btn, IconBtn, askConfirm } from '../ui/kit';
import { KabaFigure } from './KabaFigure';

// The owner's studio for the kaba's pictures (redesign stage 5): 1) Gemini draws the whole dress in the chokha's
// style — again until it is right, then „ეს მომწონს“ keeps it; 2) the parts are cut out of it one by one (each can be
// made again); 3) „გამოქვეყნება“ shows the dress to the members. Nothing reaches the members before step 3.
export const KabaStudio: React.FC<{ pieces: Record<string, KabaPiece>; published: boolean; head: KabaHead }> = ({ pieces, published, head }) => {
  const { user } = useAuth();
  const [draft, setDraft] = useState<{ c: HTMLCanvasElement; url: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState('');
  useEffect(() => () => { if (draft) URL.revokeObjectURL(draft.url); }, [draft]);

  const fail = (e: unknown) => setProblem(e instanceof KabaError ? KABA_PROBLEM_TEXT[e.kind] : KABA_PROBLEM_TEXT.failed);

  const drawDress = async () => {
    setBusy('full'); setProblem('');
    try {
      const c = await makeKabaFigure();
      setDraft({ c, url: await canvasUrl(c) });
    } catch (e) { fail(e); }
    setBusy(null);
  };

  const keepDress = async () => {
    if (!draft) return;
    if (pieces.full && !(await askConfirm({ title: 'ახალი კაბა შევინახო?', text: 'ძველი ნაწილები ახალს აღარ დაემთხვევა — ისინი თავიდან უნდა შეიქმნას.', ok: 'შენახვა' }))) return;
    setBusy('save'); setProblem('');
    try { await saveKabaPiece('full', draft.c); setDraft(null); } catch (e) { setProblem('ვერ შეინახა: ' + ((e as { code?: string })?.code || '')); }
    setBusy(null);
  };

  const makePart = async (p: KabaPart) => {
    if (!pieces.full) return;
    setBusy(p.id); setProblem('');
    try { await saveKabaPiece(p.id, await makeKabaPart(p, pieces.full.url)); } catch (e) { fail(e); }
    setBusy(null);
  };

  const makeMissing = async () => {
    for (const p of KABA_PARTS) if (!pieces[p.id]) await makePart(p);
  };

  const publish = async (on: boolean) => {
    setBusy('publish');
    try { await publishKaba(on, user?.email || ''); } catch (e) { setProblem('ვერ შეინახა: ' + ((e as { code?: string })?.code || '')); }
    setBusy(null);
  };

  const ready = !!pieces.full && KABA_PARTS.every(p => pieces[p.id]);
  const all = () => true;

  return (
    <section className="rounded-2xl bg-[#fbf6ec] ring-1 ring-[#eadfcb] p-3.5 space-y-4" aria-label="კაბის სახელოსნო">
      <div>
        <p className="font-serif-ge font-bold text-[#4a3426]">კაბის სახელოსნო</p>
        <p className="text-[13px] text-[#75685a]">ჩანს მხოლოდ შენთვის. {published ? 'კაბა გამოქვეყნებულია — წევრები ხედავენ.' : 'წევრები კაბას ჯერ ვერ ხედავენ.'}</p>
      </div>

      {/* 1. the whole dress */}
      <div className="space-y-2">
        <p className="text-[13px] font-bold text-[#4a3426]">1. მთლიანი კაბა</p>
        {draft ? (
          <div className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] p-2">
            <img src={draft.url} alt="ახალი კაბა" className="mx-auto max-h-80 w-auto" />
          </div>
        ) : pieces.full ? (
          <div className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] p-2">
            <img src={pieces.full.url} alt="შენახული კაბა" className="mx-auto max-h-56 w-auto" />
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Btn kind={draft || pieces.full ? 'ghost' : 'primary'} icon={draft ? <RotateCcw /> : <Wand2 />} onClick={drawDress} disabled={!!busy}>
            {busy === 'full' ? 'იხატება…' : draft ? 'თავიდან' : pieces.full ? 'ახალი კაბის დახატვა' : 'კაბის დახატვა'}
          </Btn>
          {draft && <Btn icon={<Check />} onClick={keepDress} disabled={!!busy}>{busy === 'save' ? 'ინახება…' : 'ეს მომწონს'}</Btn>}
        </div>
      </div>

      {/* 2. the parts, cut out of the dress */}
      {pieces.full && !draft && (
        <div className="space-y-2">
          <p className="text-[13px] font-bold text-[#4a3426]">2. ნაწილები</p>
          <div className="grid grid-cols-2 min-[480px]:grid-cols-3 gap-2">
            {KABA_PARTS.map(p => (
              <div key={p.id} className="flex items-center gap-2 rounded-xl bg-white ring-1 ring-[#e8dcc8] p-1.5">
                <span className="w-11 h-11 shrink-0 rounded-lg bg-[#f6efe3] flex items-center justify-center overflow-hidden">
                  {pieces[p.id]?.thumb && <img src={pieces[p.id].thumb} alt="" className="w-10 h-10 object-contain" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-[#4a3426] truncate">{p.label}</p>
                  <button type="button" onClick={() => makePart(p)} disabled={!!busy}
                    className="text-[12px] font-bold text-[#7a2028] cursor-pointer disabled:opacity-40">
                    {busy === p.id ? 'იჭრება…' : pieces[p.id] ? 'თავიდან' : 'შექმნა'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          {!ready && <Btn kind="soft" icon={<Wand2 />} onClick={makeMissing} disabled={!!busy}>ყველა დარჩენილის შექმნა</Btn>}
        </div>
      )}

      {/* 3. how it looks put together, and showing it to the members */}
      {ready && !draft && (
        <div className="space-y-3">
          <p className="text-[13px] font-bold text-[#4a3426]">3. ასე გამოჩნდება</p>
          <div className="rounded-2xl bg-[radial-gradient(ellipse_at_50%_45%,#ffffff_42%,#f6efe3_100%)] pt-2 pb-1">
            <KabaFigure pieces={pieces} on={all} place={head} />
          </div>
          {/* the headdress: up or down over the collar, smaller or bigger */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] text-[#75685a] mr-auto">ლეჩაქის ადგილი</span>
            <IconBtn label="მაღლა" onClick={() => saveKabaHead({ ...head, y: head.y - 2 })}><ArrowUp /></IconBtn>
            <IconBtn label="დაბლა" onClick={() => saveKabaHead({ ...head, y: head.y + 2 })}><ArrowDown /></IconBtn>
            <IconBtn label="პატარა" onClick={() => saveKabaHead({ ...head, w: Math.max(20, head.w - 4) })}><Minus /></IconBtn>
            <IconBtn label="დიდი" onClick={() => saveKabaHead({ ...head, w: Math.min(100, head.w + 4) })}><Plus /></IconBtn>
          </div>
          <Btn kind={published ? 'ghost' : 'primary'} full icon={published ? <EyeOff /> : <Eye />} onClick={() => publish(!published)} disabled={!!busy}>
            {published ? 'წევრებისთვის დამალვა' : 'გამოქვეყნება წევრებისთვის'}
          </Btn>
        </div>
      )}

      {problem && <p className="rounded-xl bg-amber-50 ring-1 ring-amber-200 px-3 py-2 text-[13px] text-[#6b4a12]">{problem}</p>}
    </section>
  );
};
