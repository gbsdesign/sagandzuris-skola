import React from 'react';
import { Camera, Check, Download, Image as ImageIcon, Info, Loader2, Sparkles, Trash2, X } from 'lucide-react';
import {
  Button, Chips, Duo, FOCUS, Helper, Note, Press, RoundButton, Row, Rows, SectionLabel, Seg, Sheet, cx,
} from '../../../components/ui2';

// „ჩემი სამოსი“'s windows in the new look, pure (the page wires them, Samosi.tsx):
// • MoreSheetView — the ⋯: the outfit (ჩოხა / ქართული კაბა), what the figure shows (ნამდვილი / მოჩვენებითი), the colour, the
//   papakha's kind, and „ჩოხა შენს ფოტოზე“;
// • PartSheetView — a part's card (the old PartCard): its story, and its photo with „წაშლა“ when real, else the camera;
// • TryOnSheetView — „ჩოხა შენს ფოტოზე“ (board x-potoze-chatsma): pick a photo → dress it; the kept picture.

export type SamosiMode = 'real' | 'tried';
export type SamosiOutfit = 'chokha' | 'kaba';

const MODE_NOTE: Record<SamosiMode, string> = {
  real: 'ფიგურაზე მხოლოდ შენი ნამდვილი, გადაღებული ნაწილებია.',
  tried: 'შეეხე ნაწილს და მოისინჯე — გვერდიდან გასვლისას მოიხსნება.',
};

export interface ColourPick {
  /** what is coloured: everything, or one part */
  tabs: { id: string; label: string }[];
  tab: string;
  onTab: (id: string) => void;
  colours: { id: string; label: string; hex: string }[];
  /** the open tab's colour; '' = the parts differ (under „ყველა“) */
  value: string;
  onPick: (id: string) => void;
}

export interface MoreSheetProps {
  open: boolean;
  onClose: () => void;
  /** the chokha / kaba switch, only while the kaba is published (or for the owner) */
  outfit?: { value: SamosiOutfit; onChange: (o: SamosiOutfit) => void };
  mode: { value: SamosiMode; onChange: (m: SamosiMode) => void };
  /** the chokha's colours */
  colour?: ColourPick;
  /** the papakha's kinds */
  kind?: { label: string; items: { id: string; label: string }[]; value: string; onChange: (id: string) => void };
  /** „ჩოხა შენს ფოტოზე“: the kept picture and the tries left */
  tryOn?: { thumb: string | null; status: string; onOpen: () => void };
}

export const MoreSheetView: React.FC<MoreSheetProps> = ({ open, onClose, outfit, mode, colour, kind, tryOn }) => {
  const chosen = colour && colour.colours.find(c => c.id === colour.value);
  return (
    <Sheet open={open} onClose={onClose} title="მეტი">
      {outfit && (
        <Seg
          label="სამოსი"
          items={[{ id: 'chokha', label: 'ჩოხა' }, { id: 'kaba', label: 'ქართული კაბა' }]}
          value={outfit.value}
          onChange={outfit.onChange}
        />
      )}

      <section className="flex shrink-0 flex-col gap-2">
        <SectionLabel label="ფიგურაზე" />
        <Seg
          label="ფიგურაზე"
          items={[{ id: 'real', label: 'ნამდვილი' }, { id: 'tried', label: 'მოსინჯული' }]}
          value={mode.value}
          onChange={mode.onChange}
        />
        <Note>{MODE_NOTE[mode.value]}</Note>
      </section>

      {colour && (
        <section className="flex shrink-0 flex-col gap-2">
          <SectionLabel label="ფერი" />
          <Chips label="რას ვღებავ" items={colour.tabs} value={colour.tab} onChange={colour.onTab} />
          <div className="flex shrink-0 flex-col gap-2 rounded-card bg-surf p-3">
            <div role="group" aria-label="ფერები" className="grid grid-cols-4 justify-items-center gap-2">
              {colour.colours.map(c => {
                const on = c.id === colour.value;
                return (
                  <Press
                    key={c.id}
                    aria-label={c.label}
                    aria-pressed={on}
                    title={c.label}
                    onClick={() => colour.onPick(c.id)}
                    className={cx(
                      'relative flex size-tap cursor-pointer items-center justify-center rounded-full ring-1 ring-ink/10 ring-inset transition active:scale-95',
                      on && 'outline-2 outline-offset-2 outline-wine',
                      FOCUS,
                    )}
                    style={{ background: c.hex }}
                  >
                    {on && <Check aria-hidden="true" className={cx('size-[18px]', c.id === 'white' ? 'text-ink' : 'text-white')} strokeWidth={3} />}
                  </Press>
                );
              })}
            </div>
            <p className="text-center text-meta font-semibold text-ink">{chosen?.label ?? 'სხვადასხვა ფერი'}</p>
          </div>
        </section>
      )}

      {kind && (
        <section className="flex shrink-0 flex-col gap-2">
          <SectionLabel label={kind.label} />
          <Seg label={kind.label} items={kind.items} value={kind.value} onChange={kind.onChange} />
        </section>
      )}

      {tryOn && (
        <Rows>
          <Row
            lead={tryOn.thumb
              ? <img src={tryOn.thumb} alt="" aria-hidden="true" className="size-icon shrink-0 rounded-full bg-soft object-cover object-top" />
              : <span aria-hidden="true" className="flex size-icon shrink-0 items-center justify-center rounded-full bg-tint text-wine"><ImageIcon className="size-[18px]" strokeWidth={2} /></span>}
            title="ჩოხა შენს ფოტოზე"
            sub={tryOn.status}
            onClick={tryOn.onOpen}
          />
        </Rows>
      )}
    </Sheet>
  );
};

/** where the photo of a real part is: idle, being checked, refused (why), or a fault */
export type ProofStep =
  | { kind: 'idle' }
  | { kind: 'checking'; preview: string }
  | { kind: 'no'; preview: string; why: string }
  | { kind: 'error'; text: string };

export interface PartSheetProps {
  open: boolean;
  onClose: () => void;
  part: { label: string; story: string };
  pic: React.ReactNode;
  real: boolean;
  /** the real part's photo (null while it loads) */
  photo: string | null;
  step: ProofStep;
  /** a teacher's look: no camera — the member photographs their own */
  viewing: boolean;
  onShoot: () => void;
  onDrop: () => void;
}

export const PartSheetView: React.FC<PartSheetProps> = ({ open, onClose, part, pic, real, photo, step, viewing, onShoot, onDrop }) => (
  <Sheet open={open} onClose={onClose} title={part.label}>
    <div className="flex shrink-0 items-start gap-3 rounded-card bg-surf p-3">
      <span aria-hidden="true" className="flex size-tap-lg shrink-0 items-center justify-center overflow-hidden rounded-field bg-page">{pic}</span>
      <p className="min-w-0 flex-1 pt-0.5 text-body leading-normal text-ink wrap-break-word">{part.story}</p>
    </div>

    {real ? (
      <>
        <div className="flex shrink-0 items-end gap-3">
          {photo
            ? <img src={photo} alt={`ჩემი ${part.label}`} className="h-36 max-w-[60%] shrink-0 rounded-tile bg-soft object-cover" />
            : <span aria-hidden="true" className="h-36 w-28 shrink-0 rounded-tile bg-soft" />}
          <p className="flex min-w-0 flex-1 items-start gap-1.5 text-body leading-snug font-bold text-leaf-ink">
            <Check aria-hidden="true" className="mt-0.5 size-[18px] shrink-0" strokeWidth={2.6} />
            ნამდვილია — სამუდამოდ შენია
          </p>
        </div>
        {!viewing && (
          <Button kind="ghost" full icon={<Trash2 aria-hidden="true" />} onClick={onDrop}>წაშლა</Button>
        )}
        {step.kind === 'error' && <p role="alert" className="px-1.5 text-meta font-semibold text-danger">{step.text}</p>}
      </>
    ) : (
      <>
        {(step.kind === 'checking' || step.kind === 'no') && (
          <div className="flex shrink-0 items-center gap-3">
            <img src={step.preview} alt="" className="size-20 shrink-0 rounded-field bg-soft object-cover" />
            {step.kind === 'checking' ? (
              <span className="flex items-center gap-2 text-body font-bold text-ink">
                <Loader2 aria-hidden="true" className="size-[18px] animate-spin text-wine" /> AI ამოწმებს ფოტოს…
              </span>
            ) : (
              <p className="min-w-0 flex-1 text-meta leading-snug font-semibold text-gold-ink wrap-break-word">{step.why}</p>
            )}
          </div>
        )}
        {step.kind === 'error' && <p role="alert" className="px-1.5 text-meta font-semibold text-danger">{step.text}</p>}
        {!viewing && (
          <Button full disabled={step.kind === 'checking'} icon={<Camera aria-hidden="true" strokeWidth={2} />} onClick={onShoot}>
            {step.kind === 'no' ? 'თავიდან გადაღება' : `გადაიღე შენი ${part.label}`}
          </Button>
        )}
        <Note className="text-center">
          {viewing ? 'ფოტოს მოსწავლე თავად გადაიღებს.' : 'AI შეამოწმებს ფოტოს და ნაწილი სამუდამოდ შენი გახდება.'}
        </Note>
      </>
    )}
  </Sheet>
);

export interface TryOnSheetProps {
  open: boolean;
  onClose: () => void;
  /** the picture kept in the account (or made but not saved) */
  kept: string | null;
  /** it can be deleted (it is saved in the account) */
  canDelete: boolean;
  onDelete: () => void;
  /** the photo picked now, and its preview */
  preview: string | null;
  onPick: () => void;
  onUnpick: () => void;
  busy: boolean;
  error: string | null;
  /** tries left today */
  left: number;
  status: string;
  onRun: () => void;
}

export const TryOnSheetView: React.FC<TryOnSheetProps> = ({
  open, onClose, kept, canDelete, onDelete, preview, onPick, onUnpick, busy, error, left, status, onRun,
}) => (
  <Sheet open={open} onClose={onClose} title="ჩოხა შენს ფოტოზე">
    {/* the kept picture, while no new photo is picked */}
    {kept && !preview && (
      <figure className="flex shrink-0 flex-col gap-2.5">
        <img src={kept} alt="ჩემი ფოტო ჩოხაში" className="max-h-[46dvh] w-full rounded-tile bg-surf object-contain" />
        <Duo>
          <Button kind="ghost" size="md" href={kept} icon={<Download aria-hidden="true" />} {...{ download: 'chokha.jpg' }}>ჩამოტვირთვა</Button>
          {canDelete && <Button kind="ghost" size="md" icon={<Trash2 aria-hidden="true" />} onClick={onDelete}>წაშლა</Button>}
        </Duo>
      </figure>
    )}

    {preview ? (
      // the new photo, dimmed while the chokha is being put on
      <div className="relative shrink-0">
        <img src={preview} alt="არჩეული ფოტო" className="max-h-[46dvh] w-full rounded-tile bg-surf object-contain" />
        {busy ? (
          <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-tile bg-ink/50 px-6 text-center text-white">
            <Loader2 aria-hidden="true" className="mb-1 size-8 animate-spin" />
            <p className="text-body font-bold">ვაცმევ ჩოხას…</p>
            <p className="text-cap">ეს 10–30 წამს გრძელდება</p>
          </div>
        ) : (
          <RoundButton label="სხვა ფოტო" onClick={onUnpick} className="absolute top-2 right-2 shadow-lift">
            <X aria-hidden="true" strokeWidth={1.75} />
          </RoundButton>
        )}
      </div>
    ) : left > 0 && (
      <Press
        onClick={onPick}
        className={cx(
          'flex shrink-0 cursor-pointer flex-col items-center gap-2 rounded-tile border-2 border-dashed border-dim px-4 py-6 text-center transition active:scale-[0.99]',
          FOCUS,
        )}
      >
        <span aria-hidden="true" className="flex size-[52px] items-center justify-center rounded-full bg-tint text-wine">
          <ImageIcon className="size-6" strokeWidth={2} />
        </span>
        <span className="text-head font-bold text-wine">{kept ? 'ახალი ფოტო' : 'აირჩიე ფოტო'}</span>
        <span className="text-meta leading-normal text-mut">სახე პირდაპირ და კარგ შუქზე. მთელი ტანიც შეიძლება.</span>
      </Press>
    )}

    {error && <p role="alert" className="shrink-0 rounded-field bg-surf px-3 py-2.5 text-meta leading-normal text-danger">{error}</p>}

    <Helper icon={<Info strokeWidth={1.75} />}>
      ფოტო დასამუშავებლად Google-ის AI-ს ეგზავნება. აპში მხოლოდ ჩოხიანი სურათი რჩება — ხედავთ შენ და სკოლის ადმინი.
    </Helper>

    <p className="shrink-0 pt-2 text-center text-meta font-semibold text-mut">{status}</p>
    {/* no photo yet: the button picks one first (one task in one window — pick, then dress) */}
    <Button
      full
      disabled={busy || left <= 0}
      icon={busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Sparkles aria-hidden="true" strokeWidth={2} />}
      onClick={preview ? onRun : onPick}
    >
      {busy ? 'ვაცმევ ჩოხას…' : 'ჩაიცვი ჩოხა'}
    </Button>
  </Sheet>
);
