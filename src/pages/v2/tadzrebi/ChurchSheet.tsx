import React, { useEffect, useState } from 'react';
import {
  BookOpen, Check, ChevronDown, ChevronLeft, ChevronRight, Clock3, ExternalLink, Globe, LoaderCircle, Lock, MapPin,
  Pencil, Phone, Play, Send, Sparkles, User,
} from 'lucide-react';
import { useNavigation, useRealAuth } from '../../../context';
import { Area, Button, Duo, Dot, Field, Helper, Note, Press, Row, Rows, RoundButton, SectionLabel, Sheet, Small, cx, FOCUS_IN } from '../../../components/ui2';
import { offerUndo } from '../../../components/ui/kit';
import { type Church, KIND_LABEL, distanceM, distanceText, photoPage, photoUrl, placeUrl, routeUrl, whereOf, wikiUrl } from '../../../data/churches';
import { dayText, feastOf, nextFeastDay, tbilisiToday } from '../../../data/churchFeasts';
import { filmsOfChurch } from '../../../data/churchFilms';
import { SERVICES_SOURCE, serviceOf } from '../../../data/churchServices';
import { clock, thumbOf } from '../../../data/etnofori';
import { useChurchVisits } from '../../../hooks/useChurchVisits';
import { useMyPlace } from '../../../hooks/useMyPlace';
import { type GooglePhoto, googlePhotoUrl, useGoogleInfo, useGooglePhotos, useGooglePlacesKey } from '../../../hooks/useGooglePhotos';
import {
  type ChurchContact, type ChurchInfo, saveChurchContact, saveChurchInfo, useCanSeeChurchContacts, useChurchContact, useChurchInfo,
} from '../../../hooks/useChurchExtras';
import { hoursLines, siteName, tbilisiWeekday } from '../../../utils/googleHours';
import { shareChurch } from '../../../utils/churchShare';
import { triggerHaptic } from '../../../utils/haptics';
import { SlotLine, churchRegion, churchRegionName, shortDay } from './parts';

// One church in a window in the new look (board x-tadzari; the canvas's note: „ფანჯარა რჩება. შიგნით ერთი მთავარი ღილაკია:
// გზის ჩვენება. დანარჩენი ორი პატარა ღილაკი და ორი ხაზია“): where it is, its feast, „გზის ჩვენება“ (Google Maps), „ვიყავი აქ“ +
// „გაზიარება“, then two rows that unfold in place — „მსახურების განრიგი“ (the hours an admin wrote, the teachers' services,
// Google's hours on a button, the contact for the allowed, an admin's form) and „ტაძრის ამბავი“ (the photos — Wikimedia's,
// then Google Maps' —, what it is, Wikipedia, the TV reports on it). Everything of the old window (pages/churches/ChurchCard).

export const ChurchSheet: React.FC<{ church: Church | null; onClose: () => void }> = ({ church, onClose }) =>
  church ? <Body key={church.id} c={church} onClose={onClose} /> : null;

type Part = 'hours' | 'story';

const Body: React.FC<{ c: Church; onClose: () => void }> = ({ c, onClose }) => {
  const today = tbilisiToday();
  const feast = feastOf(c);
  const feastOn = feast ? nextFeastDay(feast, today) : '';
  const region = churchRegion(c.region);
  const [part, setPart] = useState<Part | null>(null);
  const toggle = (p: Part) => { triggerHaptic(8); setPart(x => (x === p ? null : p)); };
  const facts = [
    c.building ? 'მშენებარე' : c.kind === 'x' ? KIND_LABEL.x : 'მოქმედი',
    c.kind === 'm' && 'მონასტერი',
    c.built && `აშენდა: ${c.built}`,
  ].filter(Boolean).join(' · ');

  return (
    <Sheet open title={c.name} onClose={onClose}>
      <div className="-mt-1 flex shrink-0 flex-col gap-0.5 px-1">
        <p className="text-body leading-snug text-mut wrap-break-word">
          {[region && churchRegionName(region), whereOf(c)].filter(Boolean).join(' · ')}<Distance c={c} />
        </p>
        <p className="text-meta text-mut">{facts}</p>
      </div>
      {feast && (
        <Helper icon={<Sparkles />} className={feastOn === today ? 'text-wine' : undefined}>
          ტაძრობა: <b className="text-ink">{feastOn === today ? 'დღეს' : dayText(feastOn)}</b> · {feast.label}
        </Helper>
      )}

      {c.located ? (
        <Button full className="shrink-0" icon={<MapPin aria-hidden="true" />} href={routeUrl(c)} target="_blank" rel="noopener noreferrer" onClick={() => triggerHaptic(10)}>
          გზის ჩვენება
        </Button>
      ) : <Note className="text-center">ამ ტაძრის ზუსტი ადგილი რუკაზე უცნობია</Note>}
      <Duo>
        <VisitButton id={c.id} today={today} />
        <ShareButton c={c} />
      </Duo>

      <Rows>
        <Unfold icon={<Clock3 />} title="მსახურების განრიგი" open={part === 'hours'} onClick={() => toggle('hours')} />
        {part === 'hours' && <Hours c={c} />}
        <Unfold icon={<BookOpen />} title="ტაძრის ამბავი" open={part === 'story'} onClick={() => toggle('story')} />
        {part === 'story' && <Story c={c} />}
      </Rows>
    </Sheet>
  );
};

/** a row that unfolds its part under it */
const Unfold: React.FC<{ icon: React.ReactNode; title: string; open: boolean; onClick: () => void }> = ({ icon, title, open, onClick }) => (
  <Row
    lead={<Dot icon={icon} />}
    title={title}
    aria-expanded={open}
    onClick={onClick}
    right={<ChevronDown aria-hidden="true" className={cx('size-[18px] shrink-0 text-mut transition-transform', open && 'rotate-180')} />}
  />
);

/** „· N კმ შენგან“ once the phone's place is known (nothing is asked here) */
const Distance: React.FC<{ c: Church }> = ({ c }) => {
  const { fix } = useMyPlace();
  if (!fix || !c.located) return null;
  return <span className="font-semibold text-wine"> · {distanceText(distanceM(fix.lat, fix.lng, c.lat, c.lng))} შენგან</span>;
};

/** „ვიყავი აქ“: the pilgrim's book; a second tap takes it off, with „გაუქმება“ */
const VisitButton: React.FC<{ id: string; today: string }> = ({ id, today }) => {
  const { visits, mark, unmark } = useChurchVisits();
  const day = visits[id];
  return day ? (
    <Button kind="soft" icon={<Check aria-hidden="true" />} aria-pressed onClick={() => {
      triggerHaptic(10);
      unmark(id);
      offerUndo('წიგნაკიდან ამოვიღე', () => mark(id, day));
    }}>ვიყავი · {shortDay(day)}</Button>
  ) : (
    <Button kind="ghost" icon={<Check aria-hidden="true" />} aria-pressed={false} onClick={() => { triggerHaptic(15); mark(id, today); }}>ვიყავი აქ</Button>
  );
};

/** „გაზიარება“: the phone's share sheet, or the words copied on a computer */
const ShareButton: React.FC<{ c: Church }> = ({ c }) => {
  const [said, setSaid] = useState<'copied' | 'failed' | null>(null);
  useEffect(() => {
    if (!said) return;
    const t = setTimeout(() => setSaid(null), 2200);
    return () => clearTimeout(t);
  }, [said]);
  const share = async () => {
    triggerHaptic(10);
    const r = await shareChurch(c);
    if (r !== 'shared') setSaid(r);
  };
  return (
    <Button kind={said === 'copied' ? 'soft' : 'ghost'} icon={said === 'copied' ? <Check aria-hidden="true" /> : <Send aria-hidden="true" />} onClick={share}>
      <span role="status">{said === 'copied' ? 'დაკოპირდა' : said === 'failed' ? 'ვერ გაზიარდა' : 'გაზიარება'}</span>
    </Button>
  );
};

/** the part under „მსახურების განრიგი“ */
const Hours: React.FC<{ c: Church }> = ({ c }) => {
  const { user, isAdmin, isTeacher } = useRealAuth();
  const service = serviceOf(c.id);
  const canSee = useCanSeeChurchContacts();
  const info = useChurchInfo(c.id);
  const contact = useChurchContact(c.id, canSee);
  const google = useGoogleInfo(c, useGooglePlacesKey());
  const [editing, setEditing] = useState(false);
  const own = !!(info && (info.hours || info.note));

  return (
    <div className="flex flex-col gap-3 px-4 pt-1 pb-4">
      {own ? (
        <div className="flex flex-col gap-1">
          {info!.hours && <p className="text-body leading-snug font-semibold whitespace-pre-line text-ink">{info!.hours}</p>}
          {info!.note && <p className="text-body leading-relaxed whitespace-pre-line text-ink">{info!.note}</p>}
        </div>
      ) : info !== undefined && !(google.state === 'done' && c.kind !== 'x') && (
        <Quiet icon={<Clock3 />}>{c.kind === 'x' ? 'ამჟამად არ მოქმედებს' : 'საათები ჯერ არ არის ჩაწერილი'}</Quiet>
      )}

      {/* the parishioners' word on the daily services: admins and teachers only */}
      {isTeacher && service && (
        <div className="flex flex-col gap-2 rounded-tile bg-page p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-meta font-bold text-wine">მსახურებები</span>
            <span className="inline-flex items-center gap-1 text-cap font-semibold text-mut"><Lock aria-hidden="true" className="size-3" />ადმინები და მასწავლებლები</span>
          </div>
          {service.slots.map(s => <SlotLine key={s.when + s.what} s={s} />)}
          {service.note && <p className="text-meta leading-snug font-semibold text-ink">{service.note}</p>}
          {service.checked && <p className="text-meta leading-snug font-semibold text-gold-ink">⚠ {service.checked}</p>}
          <p className="text-cap leading-snug text-mut">{SERVICES_SOURCE}</p>
        </div>
      )}

      <GooglePart g={google} canSee={canSee} ownHours={own || c.kind === 'x'} />

      {canSee && (contact && (contact.person || contact.phone || contact.other) ? (
        <div className="flex flex-col gap-1.5 rounded-tile bg-page p-3">
          <span className="inline-flex items-center gap-1 text-meta font-bold text-wine"><Lock aria-hidden="true" className="size-3.5" />კონტაქტი</span>
          <span className="text-cap text-mut">ხედავენ მხოლოდ ადმინები და ის, ვისაც ადმინი ჩაურთავს</span>
          {contact.person && <p className="flex items-center gap-1.5 text-body font-semibold"><User aria-hidden="true" className="size-4 text-mut" />{contact.person}</p>}
          {contact.phone && (
            <a href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`} className="inline-flex min-h-tap items-center gap-1.5 self-start text-body font-bold text-wine">
              <Phone aria-hidden="true" className="size-4" />{contact.phone}
            </a>
          )}
          {contact.other && <p className="text-body leading-relaxed whitespace-pre-line">{contact.other}</p>}
        </div>
      ) : contact !== undefined && <Quiet icon={<Lock />}>კონტაქტი ჯერ არ არის ჩაწერილი · ხედავენ მხოლოდ ნებადართულები</Quiet>)}

      {isAdmin && user && (editing
        ? <Editor id={c.id} uid={user.uid} info={info ?? null} contact={contact ?? null} onDone={() => setEditing(false)} />
        : <Button kind="soft" size="md" icon={<Pencil aria-hidden="true" />} className="self-start" onClick={() => setEditing(true)}>საათების და კონტაქტის ჩაწერა</Button>)}
    </div>
  );
};

/** one quiet line instead of an empty box */
const Quiet: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
  <Helper icon={icon} className="px-0">{children}</Helper>
);

/** Google Maps' hours, website and phone: a button first (Google counts each look), then the lines or a quiet line */
const GooglePart: React.FC<{ g: ReturnType<typeof useGoogleInfo>; canSee: boolean; ownHours: boolean }> = ({ g, canSee, ownHours }) => {
  if (!g.can) return null;
  if (g.state === 'idle' || g.state === 'loading') {
    return (
      <Button kind="soft" size="md" className="self-start" disabled={g.state === 'loading'} onClick={g.load}
        icon={g.state === 'loading' ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Clock3 aria-hidden="true" />}>
        {g.state === 'loading' ? 'იტვირთება…' : 'საათები Google Maps-იდან'}
      </Button>
    );
  }
  if (g.state === 'failed') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Quiet icon={<Clock3 />}>Google-იდან ვერ ჩაიტვირთა</Quiet>
        <Button kind="ghost" size="md" onClick={g.load}>ხელახლა</Button>
      </div>
    );
  }
  const info = g.info;
  const nothing = ownHours ? 'Google Maps-ზე საათები არ არის' : 'საათები უცნობია — Google Maps-ზეც არ არის';
  if (!info) return <Quiet icon={<Clock3 />}>{ownHours ? 'Google Maps-ზე ეს ტაძარი ვერ მოიძებნა' : nothing}</Quiet>;
  const lines = hoursLines(info.periods, tbilisiWeekday());
  const closed = info.status === 'CLOSED_TEMPORARILY' ? 'დროებით დახურულია' : info.status === 'CLOSED_PERMANENTLY' ? 'სამუდამოდ დახურულია' : '';
  const phone = canSee && info.phone;
  if (!lines.length && !info.website && !phone && !closed) return <Quiet icon={<Clock3 />}>{nothing}</Quiet>;
  const state = closed || (lines.length > 0 && info.openNow !== null ? (info.openNow ? 'ახლა ღიაა' : 'ახლა დაკეტილია') : '');
  return (
    <div className="flex flex-col gap-2 rounded-tile bg-page p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-meta font-bold text-wine">Google Maps-ის მიხედვით</span>
        {state && <Small tone={info.openNow && !closed ? 'leaf' : undefined}>{state}</Small>}
      </div>
      {!lines.length && <p className="text-meta text-mut">საათები არ არის მითითებული</p>}
      {lines.length > 0 && (
        <ul className="flex flex-col">
          {lines.map(l => (
            <li key={l.days} className={cx('flex items-baseline justify-between gap-3 rounded-chip px-2 py-1.5 text-body leading-snug', l.today ? 'bg-tint text-wine' : 'text-ink')}>
              <span className={cx('min-w-0', l.today ? 'font-bold' : 'text-mut')}>{l.days}</span>
              <span className="flex shrink-0 flex-col items-end text-right font-bold tabular-nums">
                {l.hours.split(', ').map(h => <span key={h} className="whitespace-nowrap">{h}</span>)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {info.website && (
        <a href={info.website} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-tap items-center gap-1.5 self-start text-body font-bold text-sea">
          <Globe aria-hidden="true" className="size-4" />ვებგვერდი · {siteName(info.website)}<ExternalLink aria-hidden="true" className="size-3.5" />
        </a>
      )}
      {phone && (
        <a href={`tel:${(info.phoneIntl || info.phone).replace(/[^\d+]/g, '')}`} className="inline-flex min-h-tap items-center gap-1.5 self-start text-body font-bold text-wine">
          <Phone aria-hidden="true" className="size-4" />{info.phone}
          <Lock aria-label="ხედავენ მხოლოდ ადმინები და ნებადართულები" className="size-3.5 text-mut" />
        </a>
      )}
    </div>
  );
};

/** an admin's form: the hours and services for everyone, the contact for the allowed */
const Editor: React.FC<{ id: string; uid: string; info: ChurchInfo | null; contact: ChurchContact | null; onDone: () => void }> = ({ id, uid, info, contact, onDone }) => {
  const [hours, setHours] = useState(info?.hours ?? '');
  const [note, setNote] = useState(info?.note ?? '');
  const [person, setPerson] = useState(contact?.person ?? '');
  const [phone, setPhone] = useState(contact?.phone ?? '');
  const [other, setOther] = useState(contact?.other ?? '');
  const [state, setState] = useState<'idle' | 'saving' | 'failed'>('idle');
  useEffect(() => { setState('idle'); }, [hours, note, person, phone, other]);
  const save = async () => {
    setState('saving');
    try {
      await Promise.all([saveChurchInfo(id, { hours, note }, uid), saveChurchContact(id, { person, phone, other }, uid)]);
      onDone();
    } catch {
      setState('failed');
    }
  };
  return (
    <div className="flex flex-col gap-3 rounded-tile bg-page p-3">
      <Area label="საათები (ყველა ხედავს)" value={hours} onChange={setHours} rows={2} maxLength={300} placeholder="მაგ.: ყოველდღე 9:00–19:00" />
      <Area label="მსახურება, შენიშვნა (ყველა ხედავს)" value={note} onChange={setNote} rows={2} maxLength={600} placeholder="მაგ.: წირვა კვირას 9:00-ზე" />
      <Field label="ვისთან დაკავშირება (მხოლოდ ნებადართულები)" value={person} onChange={setPerson} maxLength={100} placeholder="მაგ.: მამა გიორგი" />
      <Field label="ტელეფონი" type="tel" value={phone} onChange={setPhone} maxLength={60} inputMode="tel" placeholder="+995 5__ __ __ __" />
      <Area label="სხვა საკონტაქტო" value={other} onChange={setOther} rows={2} maxLength={600} />
      {state === 'failed' && <p role="alert" className="text-meta font-bold text-danger">ვერ შეინახა — შეამოწმე ინტერნეტი და სცადე ხელახლა.</p>}
      <Duo>
        <Button onClick={save} disabled={state === 'saving'}>{state === 'saving' ? 'ინახება…' : 'შენახვა'}</Button>
        <Button kind="ghost" onClick={onDone}>გაუქმება</Button>
      </Duo>
    </div>
  );
};

/** the part under „ტაძრის ამბავი“ */
const Story: React.FC<{ c: Church }> = ({ c }) => {
  const films = filmsOfChurch(c.id);
  const { openMapItem } = useNavigation();
  const text = [c.desc && c.desc[0].toUpperCase() + c.desc.slice(1), c.note].filter(Boolean).join('. ');
  return (
    <div className="flex flex-col gap-3 px-4 pt-1 pb-4">
      <Gallery c={c} />
      {text ? <p className="text-body leading-relaxed text-ink wrap-break-word">{text}</p>
        : <p className="text-meta text-mut">ამ ტაძარზე აღწერა ჯერ არ გვაქვს.</p>}
      <div className="flex flex-col">
        {c.wiki && (
          <a href={wikiUrl(c.wiki)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-tap items-center gap-1.5 self-start text-body font-bold text-sea">
            ვრცლად ვიკიპედიაში <ExternalLink aria-hidden="true" className="size-3.5" />
          </a>
        )}
        {c.located && (
          <a href={placeUrl(c)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-tap items-center gap-1.5 self-start text-body font-bold text-sea">
            {c.photo ? 'რუკაზე ნახვა Google Maps-ში' : 'რუკა და ფოტოები Google Maps-ში'} <ExternalLink aria-hidden="true" className="size-3.5" />
          </a>
        )}
      </div>
      {films.length > 0 && (
        <>
          <SectionLabel label={films.length === 1 ? 'ვიდეო ამ მონასტერზე' : `ვიდეოები ამ მონასტერზე · ${films.length}`} className="px-0" />
          <div className="flex flex-col gap-1">
            {films.map(f => (
              <Press key={f.id} onClick={() => { triggerHaptic(10); openMapItem(`v:${f.region}/${f.id}`); }}
                className={cx('flex min-h-tap cursor-pointer items-center gap-3 rounded-field py-1 text-left transition-colors active:bg-soft', FOCUS_IN)}>
                <span aria-hidden="true" className="relative flex h-14 w-24 shrink-0 items-center justify-center overflow-hidden rounded-field bg-night-surf text-white">
                  <img src={thumbOf(f.id)} alt="" loading="lazy" className="absolute inset-0 size-full object-cover opacity-90" />
                  <Play className="relative size-4 fill-current" />
                  <span className="absolute right-1 bottom-1 rounded-chip bg-night-surf/80 px-1 text-cap font-bold tabular-nums">{clock(f.secs)}</span>
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="line-clamp-2 text-body leading-snug font-bold">{f.title}</span>
                  <span className="text-meta text-mut">{f.channel}</span>
                </span>
              </Press>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

/** Wikimedia's photo first, then Google Maps' (each loads only when shown — Google counts every one), ‹ › between them */
const Gallery: React.FC<{ c: Church }> = ({ c }) => {
  const apiKey = useGooglePlacesKey();
  const google = useGooglePhotos(c, apiKey);
  const [broken, setBroken] = useState<Set<string>>(new Set());
  const [at, setAt] = useState(0);
  type Shot = { src: string; credit: React.ReactNode; key: string };
  const shots: Shot[] = [];
  if (c.photo) {
    shots.push({
      key: 'commons', src: photoUrl(c.photo, 800),
      credit: <a href={photoPage(c.photo)} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">ფოტო: ვიკიმედია</a>,
    });
  }
  for (const p of google ?? []) {
    if (!apiKey) break;
    shots.push({ key: p.name, src: googlePhotoUrl(p, apiKey), credit: <GoogleCredit p={p} /> });
  }
  const shown = shots.filter(s => !broken.has(s.key));
  const waiting = google === undefined && !!apiKey && c.located;
  if (!shown.length) {
    return waiting ? <div className="aspect-[4/3] w-full animate-pulse rounded-tile bg-soft" aria-label="ფოტო იტვირთება" /> : null;
  }
  const i = Math.min(at, shown.length - 1);
  const shot = shown[i];
  const go = (d: number) => { triggerHaptic(8); setAt((i + d + shown.length) % shown.length); };
  return (
    <figure className="flex flex-col gap-1">
      <div className="relative">
        <img key={shot.key} src={shot.src} alt={c.name} onError={() => setBroken(b => new Set(b).add(shot.key))}
          className="aspect-[4/3] w-full rounded-tile bg-soft object-cover" />
        {shown.length > 1 && (
          <>
            <RoundButton label="წინა ფოტო" tone="glass" className="absolute top-1/2 left-2 -translate-y-1/2 bg-night-surf/50" onClick={() => go(-1)}><ChevronLeft aria-hidden="true" /></RoundButton>
            <RoundButton label="შემდეგი ფოტო" tone="glass" className="absolute top-1/2 right-2 -translate-y-1/2 bg-night-surf/50" onClick={() => go(1)}><ChevronRight aria-hidden="true" /></RoundButton>
            <span className="absolute bottom-2 left-1/2 inline-flex h-6 -translate-x-1/2 items-center rounded-full bg-night-surf/60 px-2 text-meta font-bold text-white tabular-nums">{i + 1} / {shown.length}</span>
          </>
        )}
      </div>
      <figcaption className="text-right text-cap text-mut">{shot.credit}</figcaption>
    </figure>
  );
};

/** Google asks for the photo's author and its own name beside every photo */
const GoogleCredit: React.FC<{ p: GooglePhoto }> = ({ p }) => (
  <span>
    ფოტო: {p.author ? (p.authorUri ? <a href={p.authorUri} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">{p.author}</a> : p.author) : 'მომხმარებელი'}
    {' · '}<b className="text-ink">Google Maps</b>
  </span>
);
