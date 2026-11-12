import React, { useEffect, useState } from 'react';
import { CalendarClock, Check, ChevronLeft, ChevronRight, Clock3, ExternalLink, Footprints, Globe, Lock, MapPin, Navigation, Pencil, Phone, Play, Share2, Sparkles, User } from 'lucide-react';
import { useNavigation, useRealAuth } from '../../context';
import { Btn, FIELD, Sheet, offerUndo } from '../../components/ui/kit';
import { triggerHaptic } from '../../utils/haptics';
import { type Church, KIND_LABEL, distanceM, distanceText, photoPage, photoUrl, placeUrl, routeUrl, whereOf, wikiUrl } from '../../data/churches';
import { useMyPlace } from '../../hooks/useMyPlace';
import { shareChurch } from '../../utils/churchShare';
import { dayText, feastOf, nextFeastDay, tbilisiToday } from '../../data/churchFeasts';
import { filmsOfChurch } from '../../data/churchFilms';
import { SERVICES_SOURCE, serviceOf } from '../../data/churchServices';
import { clock, thumbOf } from '../../data/etnofori';
import { useChurchVisits } from '../../hooks/useChurchVisits';
import { type GooglePhoto, googlePhotoUrl, useGoogleInfo, useGooglePhotos, useGooglePlacesKey } from '../../hooks/useGooglePhotos';
import { hoursLines, siteName, tbilisiWeekday } from '../../utils/googleHours';
import {
  type ChurchContact, type ChurchInfo, saveChurchContact, saveChurchInfo, useCanSeeChurchContacts, useChurchContact, useChurchInfo,
} from '../../hooks/useChurchExtras';

// One church in a window: its photos (Wikimedia's, then Google Maps' when the admin has given the key), where it is,
// whether it is open, its feast day, „ვიყავი“ for the pilgrim's book, the TV reports on it, the hours an admin wrote, the
// contact (admins and the people they allowed), and the way there with Google Maps.
// Tidied 2026-11-07: „ვიყავი“ and „გაზიარება“ in one row, „N კმ შენგან“ once the phone's place is known, empty hours /
// contact as one quiet line (a box only when something is written or being written).
// „საათები Google Maps-იდან“ (2026-11-07, the user's picks: hours, website, phone; on a button, since each costs): Google's
// weekly hours, open now or not, the website, and the phone only for those who see the contacts.

const AREA = FIELD.replace('h-11', 'min-h-[4.5rem] py-2.5 leading-snug resize-y');
const LINK_BTN = 'inline-flex items-center justify-center gap-2 rounded-full font-bold cursor-pointer select-none transition active:scale-[0.97] h-12 px-5 text-[15px] [&>svg]:w-[18px] [&>svg]:h-[18px] [&>svg]:shrink-0';

export const ChurchCard: React.FC<{ church: Church | null; onClose: () => void }> = ({ church, onClose }) => {
  if (!church) return null;
  return <Card key={church.id} c={church} onClose={onClose} />;
};

const Card: React.FC<{ c: Church; onClose: () => void }> = ({ c, onClose }) => {
  const { user, isAdmin, isTeacher } = useRealAuth();
  const service = serviceOf(c.id);
  const canSee = useCanSeeChurchContacts();
  const info = useChurchInfo(c.id);
  const contact = useChurchContact(c.id, canSee);
  const [editing, setEditing] = useState(false);
  const today = tbilisiToday();
  const feast = feastOf(c);
  const feastOn = feast ? nextFeastDay(feast, today) : '';
  const films = filmsOfChurch(c.id);
  const { openMapItem } = useNavigation();
  const google = useGoogleInfo(c, useGooglePlacesKey());
  const ownHours = !!(info && (info.hours || info.note));

  return (
    <Sheet
      open
      wide
      onClose={onClose}
      title={c.name}
      footer={c.located ? (
        <a href={routeUrl(c)} target="_blank" rel="noopener noreferrer" onClick={() => triggerHaptic(10)}
          className={`${LINK_BTN} w-full bg-[#7a2028] hover:bg-[#5e1820] text-[#fbf6ec] shadow-[0_4px_12px_-6px_rgba(122,32,40,0.7)]`}>
          <Navigation /> გზა Google Maps-ით
        </a>
      ) : (
        <p className="text-center text-[13px] font-bold text-[#8a7a6a]">ამ ტაძრის ზუსტი ადგილი რუკაზე უცნობია</p>
      )}
    >
      <div className="flex flex-col gap-4">
        <Gallery c={c} />

        <div className="flex flex-col gap-2">
          <p className="flex items-start gap-1.5 text-[15px] font-semibold text-[#4a3426] leading-snug">
            <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-[#8a4b12]" aria-hidden />
            <span>{whereOf(c)}<Distance c={c} /></span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Status c={c} />
            {c.kind === 'm' && <Tag tone="gold">მონასტერი</Tag>}
            {c.built && <Tag tone="plain">აშენდა: {c.built}</Tag>}
          </div>
          {feast && (
            <p className={`flex items-start gap-1.5 text-[14.5px] font-semibold leading-snug ${feastOn === today ? 'text-[#7a2028]' : 'text-[#4a3426]'}`}>
              <Sparkles className="w-4 h-4 mt-0.5 shrink-0 text-[#b07a1e]" aria-hidden />
              <span>ტაძრობა: <b>{feastOn === today ? 'დღეს' : dayText(feastOn)}</b> · {feast.label}</span>
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <VisitButton id={c.id} today={today} />
            <ShareButton c={c} />
          </div>
          {(c.desc || c.note) && (
            <p className="text-[14px] text-[#574739] leading-relaxed">
              {[c.desc && c.desc[0].toUpperCase() + c.desc.slice(1), c.note].filter(Boolean).join('. ')}
            </p>
          )}
          {c.wiki && (
            <a href={wikiUrl(c.wiki)} target="_blank" rel="noopener noreferrer" className="self-start inline-flex items-center gap-1 text-[14px] font-bold text-[#8a4b12] hover:underline">
              ვრცლად ვიკიპედიაში <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          {c.located && (
            <a href={placeUrl(c)} target="_blank" rel="noopener noreferrer" className="self-start inline-flex items-center gap-1 text-[14px] font-bold text-[#8a4b12] hover:underline">
              {c.photo ? 'რუკაზე ნახვა Google Maps-ში' : 'რუკა და ფოტოები Google Maps-ში'} <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {films.length > 0 && (
          <Box icon={<Play />} title={films.length === 1 ? 'ვიდეო ამ მონასტერზე' : `ვიდეოები ამ მონასტერზე · ${films.length}`}>
            <ul className="flex flex-col gap-2">
              {films.map(f => (
                <li key={f.id}>
                  <button type="button" onClick={() => { triggerHaptic(10); openMapItem(`v:${f.region}/${f.id}`); }}
                    className="group w-full flex items-center gap-3 text-left cursor-pointer">
                    <span className="relative w-24 aspect-video shrink-0 rounded-lg overflow-hidden bg-[#3a2c22]">
                      <img src={thumbOf(f.id)} alt="" loading="lazy" className="w-full h-full object-cover" />
                      <span className="absolute right-1 bottom-1 px-1 rounded bg-black/70 text-white text-[11px] font-bold tabular-nums">{clock(f.secs)}</span>
                    </span>
                    <span className="flex-1 min-w-0 flex flex-col">
                      <span className="text-[14px] font-bold text-[#2a2017] leading-snug line-clamp-2 group-hover:text-[#7a2028]">{f.title}</span>
                      <span className="text-[12px] font-semibold text-[#8a7a6a]">{f.channel}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Box>
        )}

        {info && (info.hours || info.note) ? (
          <Box icon={<Clock3 />} title="საათები და მსახურება">
            <div className="flex flex-col gap-1">
              {info.hours && <p className="text-[14.5px] font-semibold text-[#2a2017] whitespace-pre-line leading-snug">{info.hours}</p>}
              {info.note && <p className="text-[14px] text-[#574739] whitespace-pre-line leading-relaxed">{info.note}</p>}
            </div>
          </Box>
        ) : info !== undefined && !(google.state === 'done' && c.kind !== 'x') && (
          <Quiet icon={<Clock3 />}>{c.kind === 'x' ? 'ამჟამად არ მოქმედებს' : 'საათები ჯერ არ არის ჩაწერილი'}</Quiet>
        )}

        {isTeacher && service && (
          <Box icon={<CalendarClock />} title="მსახურებები" hint="ხედავენ მხოლოდ ადმინები და მასწავლებლები">
            <ul className="flex flex-col gap-1">
              {service.lines.map(l => <li key={l} className="text-[14.5px] font-semibold text-[#2a2017] leading-snug">• {l}</li>)}
            </ul>
            {service.checked && <p className="text-[13px] text-[#9a5f08] font-semibold leading-relaxed">ყურადღება: {service.checked}</p>}
            <p className="text-[12px] font-semibold text-[#8a7a6a] leading-snug">{SERVICES_SOURCE}</p>
          </Box>
        )}

        <GooglePart g={google} canSee={canSee} ownHours={ownHours || c.kind === 'x'} />

        {canSee && (contact && (contact.person || contact.phone || contact.other) ? (
          <Box icon={<Lock />} title="კონტაქტი" hint="ხედავენ მხოლოდ ადმინები და ის, ვისაც ადმინი ჩაურთავს">
            <div className="flex flex-col gap-1.5">
              {contact.person && <p className="flex items-center gap-1.5 text-[14.5px] font-semibold text-[#2a2017]"><User className="w-4 h-4 text-[#8a4b12]" aria-hidden />{contact.person}</p>}
              {contact.phone && (
                <a href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`} className="self-start inline-flex items-center gap-1.5 text-[15px] font-bold text-[#7a2028] hover:underline">
                  <Phone className="w-4 h-4" aria-hidden />{contact.phone}
                </a>
              )}
              {contact.other && <p className="text-[14px] text-[#574739] whitespace-pre-line leading-relaxed">{contact.other}</p>}
            </div>
          </Box>
        ) : contact !== undefined && <Quiet icon={<Lock />}>კონტაქტი ჯერ არ არის ჩაწერილი · ხედავენ მხოლოდ ნებადართულები</Quiet>)}

        {isAdmin && user && (editing
          ? <Editor id={c.id} uid={user.uid} info={info ?? null} contact={contact ?? null} onDone={() => setEditing(false)} />
          : <Btn kind="soft" icon={<Pencil />} onClick={() => setEditing(true)} className="self-start">საათების და კონტაქტის ჩაწერა</Btn>)}
      </div>
    </Sheet>
  );
};

/** „ვიყავი“: the pilgrim's book (hooks/useChurchVisits.ts); a second tap takes it off, with „გაუქმება“ */
const VisitButton: React.FC<{ id: string; today: string }> = ({ id, today }) => {
  const { visits, mark, unmark } = useChurchVisits();
  const day = visits[id];
  return day ? (
    <button type="button" onClick={() => { triggerHaptic(10); unmark(id); offerUndo('წიგნაკიდან ამოვიღე', () => mark(id, day)); }}
      className="self-start min-h-11 px-4 rounded-full bg-[#2f6b3a]/10 text-[#2f6b3a] text-[14px] font-bold inline-flex items-center gap-2 cursor-pointer transition active:scale-[0.97]">
      <Check className="w-[18px] h-[18px]" /> ვიყავი · {dayText(day)}
    </button>
  ) : (
    <button type="button" onClick={() => { triggerHaptic(15); mark(id, today); }}
      className="self-start min-h-11 px-4 rounded-full bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/40 text-[#4a3426] text-[14px] font-bold inline-flex items-center gap-2 cursor-pointer transition active:scale-[0.97]">
      <Footprints className="w-[18px] h-[18px] text-[#7a2028]" /> ვიყავი აქ
    </button>
  );
};

/** „გაზიარება“: the phone's share sheet, or the text copied on a computer (utils/churchShare.ts) */
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
    <button type="button" onClick={share} aria-label="გაზიარება"
      className={`min-h-11 px-4 rounded-full text-[14px] font-bold inline-flex items-center gap-2 cursor-pointer transition active:scale-[0.97] ${
        said === 'copied' ? 'bg-[#2f6b3a]/10 text-[#2f6b3a]' : said === 'failed' ? 'bg-red-50 text-red-700' : 'bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/40 text-[#4a3426]'}`}>
      {said === 'copied' ? <><Check className="w-[18px] h-[18px]" /> დაკოპირდა</> : said === 'failed' ? 'ვერ გაზიარდა' : <><Share2 className="w-[18px] h-[18px] text-[#7a2028]" /> გაზიარება</>}
    </button>
  );
};

/** „· N კმ შენგან“ after the place, once the phone's place is known (nothing is asked here) */
const Distance: React.FC<{ c: Church }> = ({ c }) => {
  const { fix } = useMyPlace();
  if (!fix || !c.located) return null;
  return <span className="text-[#8a4b12]"> · {distanceText(distanceM(fix.lat, fix.lng, c.lat, c.lng))} შენგან</span>;
};

/** Google Maps' hours, website and phone: a button first (each look is counted by Google), then a box or a quiet line.
 *  Once Google has answered, the window's own „საათები ჯერ არ არის ჩაწერილი“ steps aside and this part says it (`ownHours` false). */
const GooglePart: React.FC<{ g: ReturnType<typeof useGoogleInfo>; canSee: boolean; ownHours: boolean }> = ({ g, canSee, ownHours }) => {
  if (!g.can) return null;
  if (g.state === 'idle' || g.state === 'loading') {
    return (
      <Btn kind="soft" icon={<Clock3 />} onClick={g.load} disabled={g.state === 'loading'} className="self-start">
        {g.state === 'loading' ? 'იტვირთება…' : 'საათები Google Maps-იდან'}
      </Btn>
    );
  }
  if (g.state === 'failed') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Quiet icon={<Clock3 />}>Google-იდან ვერ ჩაიტვირთა</Quiet>
        <Btn kind="ghost" size="sm" onClick={g.load}>ხელახლა</Btn>
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
  return (
    <Box icon={<Clock3 />} title="Google Maps-ის მიხედვით">
      {(closed || (lines.length > 0 && info.openNow !== null)) && (
        <div className="flex">
          {closed ? <Tag tone="amber">{closed}</Tag> : info.openNow ? <Tag tone="green">ახლა ღიაა</Tag> : <Tag tone="muted">ახლა დაკეტილია</Tag>}
        </div>
      )}
      {!lines.length && <p className="px-1 text-[13.5px] font-semibold text-[#8a7a6a]">საათები არ არის მითითებული</p>}
      {lines.length > 0 && (
        <ul className="flex flex-col">
          {lines.map(l => (
            <li key={l.days} className={`flex items-baseline justify-between gap-3 px-2 py-1.5 rounded-lg text-[14.5px] leading-snug ${l.today ? 'bg-[#7a2028]/[0.07] text-[#7a2028]' : 'text-[#2a2017]'}`}>
              <span className={`min-w-0 ${l.today ? 'font-black' : 'font-semibold text-[#574739]'}`}>{l.days}</span>
              <span className="shrink-0 font-bold text-right tabular-nums flex flex-col items-end">
                {l.hours.split(', ').map(h => <span key={h} className="whitespace-nowrap">{h}</span>)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {(info.website || phone) && (
        <div className="flex flex-col gap-1.5 pt-0.5">
          {info.website && (
            <a href={info.website} target="_blank" rel="noopener noreferrer" className="self-start inline-flex items-center gap-1.5 text-[14.5px] font-bold text-[#8a4b12] hover:underline">
              <Globe className="w-4 h-4" aria-hidden />ვებგვერდი · {siteName(info.website)}<ExternalLink className="w-3.5 h-3.5" aria-hidden />
            </a>
          )}
          {phone && (
            <a href={`tel:${(info.phoneIntl || info.phone).replace(/[^\d+]/g, '')}`} className="self-start inline-flex items-center gap-1.5 text-[15px] font-bold text-[#7a2028] hover:underline">
              <Phone className="w-4 h-4" aria-hidden />{info.phone}
              <Lock className="w-3.5 h-3.5 text-[#8a7a6a]" aria-label="ხედავენ მხოლოდ ადმინები და ნებადართულები" />
            </a>
          )}
        </div>
      )}
    </Box>
  );
};

/** one quiet line instead of an empty box */
const Quiet: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
  <p className="px-1 flex items-center gap-1.5 text-[13px] font-semibold text-[#8a7a6a] [&>svg]:w-4 [&>svg]:h-4 [&>svg]:shrink-0">{icon}<span>{children}</span></p>
);

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
      credit: <a href={photoPage(c.photo)} target="_blank" rel="noopener noreferrer" className="hover:underline">ფოტო: ვიკიმედია</a>,
    });
  }
  for (const p of google ?? []) {
    if (!apiKey) break;
    shots.push({ key: p.name, src: googlePhotoUrl(p, apiKey), credit: <GoogleCredit p={p} /> });
  }
  const shown = shots.filter(s => !broken.has(s.key));
  const waiting = google === undefined && !!apiKey && c.located;
  if (!shown.length) {
    return waiting ? <div className="w-full aspect-[4/3] rounded-2xl bg-[#efe5d4] animate-pulse" aria-label="ფოტო იტვირთება" /> : null;
  }
  const i = Math.min(at, shown.length - 1);
  const shot = shown[i];
  const go = (d: number) => { triggerHaptic(8); setAt((i + d + shown.length) % shown.length); };
  return (
    <figure className="flex flex-col gap-1">
      <div className="relative">
        <img key={shot.key} src={shot.src} alt={c.name} onError={() => setBroken(b => new Set(b).add(shot.key))}
          className="w-full aspect-[4/3] object-cover rounded-2xl bg-[#efe5d4] shadow-sm" />
        {shown.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="წინა ფოტო"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/45 hover:bg-black/60 text-white flex items-center justify-center cursor-pointer">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="შემდეგი ფოტო"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/45 hover:bg-black/60 text-white flex items-center justify-center cursor-pointer">
              <ChevronRight className="w-5 h-5" />
            </button>
            <span className="absolute left-1/2 -translate-x-1/2 bottom-2 px-2 h-6 rounded-full bg-black/55 text-white text-[12px] font-bold tabular-nums inline-flex items-center">{i + 1} / {shown.length}</span>
          </>
        )}
      </div>
      <figcaption className="text-right text-[12px] font-semibold text-[#8a7a6a]">{shot.credit}</figcaption>
    </figure>
  );
};

/** Google asks for the photo's author and its own name beside every photo */
const GoogleCredit: React.FC<{ p: GooglePhoto }> = ({ p }) => (
  <span>
    ფოტო: {p.author ? (p.authorUri ? <a href={p.authorUri} target="_blank" rel="noopener noreferrer" className="hover:underline">{p.author}</a> : p.author) : 'მომხმარებელი'}
    {' · '}<span className="font-bold text-[#6b5c4e]">Google Maps</span>
  </span>
);

const Status: React.FC<{ c: Church }> = ({ c }) =>
  c.building ? <Tag tone="amber">მშენებარე</Tag>
    : c.kind === 'x' ? <Tag tone="muted">{KIND_LABEL.x}</Tag>
      : <Tag tone="green">მოქმედი</Tag>;

export const Tag: React.FC<{ tone: 'green' | 'gold' | 'muted' | 'amber' | 'plain'; children: React.ReactNode }> = ({ tone, children }) => (
  <span className={`inline-flex items-center h-7 px-2.5 rounded-full text-[12.5px] font-bold ${{
    green: 'bg-[#2f6b3a]/10 text-[#2f6b3a]',
    gold: 'bg-[#b07a1e]/12 text-[#8a5a0e]',
    muted: 'bg-[#8a7a6a]/12 text-[#6b5c4e]',
    amber: 'bg-[#c27c12]/12 text-[#9a5f08]',
    plain: 'bg-white ring-1 ring-[#e8dcc8] text-[#574739]',
  }[tone]}`}>{children}</span>
);

const Box: React.FC<{ icon: React.ReactNode; title: string; hint?: string; children: React.ReactNode }> = ({ icon, title, hint, children }) => (
  <section className="rounded-2xl bg-white/80 ring-1 ring-[#e8dcc8] p-3.5 flex flex-col gap-2">
    <h4 className="flex items-center gap-1.5 text-[13px] font-black text-[#8a4b12] [&>svg]:w-4 [&>svg]:h-4">{icon}{title}</h4>
    {hint && <p className="-mt-1.5 text-[12px] font-semibold text-[#8a7a6a]">{hint}</p>}
    {children}
  </section>
);

/** an admin's form: hours and services for everyone, the contact for the allowed */
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
      await Promise.all([
        saveChurchInfo(id, { hours, note }, uid),
        saveChurchContact(id, { person, phone, other }, uid),
      ]);
      onDone();
    } catch {
      setState('failed');
    }
  };

  return (
    <section className="rounded-2xl bg-[#7a2028]/[0.04] ring-1 ring-[#7a2028]/15 p-3.5 flex flex-col gap-3">
      <Field label="საათები (ყველა ხედავს)">
        <textarea value={hours} onChange={e => setHours(e.target.value)} rows={2} maxLength={300} placeholder="მაგ.: ყოველდღე 9:00–19:00" className={AREA} />
      </Field>
      <Field label="მსახურება, შენიშვნა (ყველა ხედავს)">
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} maxLength={600} placeholder="მაგ.: წირვა კვირას 9:00-ზე" className={AREA} />
      </Field>
      <Field label="ვისთან დაკავშირება (მხოლოდ ნებადართულები)">
        <input value={person} onChange={e => setPerson(e.target.value)} maxLength={100} placeholder="მაგ.: მამა გიორგი" className={FIELD} />
      </Field>
      <Field label="ტელეფონი">
        <input value={phone} onChange={e => setPhone(e.target.value)} maxLength={60} inputMode="tel" placeholder="+995 5__ __ __ __" className={FIELD} />
      </Field>
      <Field label="სხვა საკონტაქტო">
        <textarea value={other} onChange={e => setOther(e.target.value)} rows={2} maxLength={600} className={AREA} />
      </Field>
      {state === 'failed' && <p className="text-[13px] font-bold text-red-700">ვერ შეინახა — შეამოწმე ინტერნეტი და სცადე ხელახლა.</p>}
      <div className="flex gap-2">
        <Btn onClick={save} disabled={state === 'saving'} className="flex-1">{state === 'saving' ? 'ინახება…' : 'შენახვა'}</Btn>
        <Btn kind="ghost" onClick={onDone} className="flex-1">გაუქმება</Btn>
      </div>
    </section>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="flex flex-col gap-1">
    <span className="text-[12.5px] font-bold text-[#574739]">{label}</span>
    {children}
  </label>
);
