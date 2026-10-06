import React, { useMemo, useRef, useState } from 'react';
import { deleteField, doc, setDoc } from 'firebase/firestore';
import { Disc3, Link2, Play, Pause, Save, Trash2, Search, Check, Info } from 'lucide-react';
import { db } from '../../firebase';
import { useAuth } from '../../context';
import { SERVICE_LISTS, SCHOOL_NAMES, schoolOf } from '../../data/chantLookup';
import { codeBindingCount, getChantMedia } from '../../data/chantMediaRegistry';
import { RecordingBinding, driveFileId, proxyUrl, useRecordingBindings } from '../../data/runtimeRecordings';
import { Btn, Card, CardTitle, FIELD, IconBtn, Label, Pill } from '../ui/kit';

const TRACKS = ['I ხმა', 'II ხმა', 'III ხმა', 'სამივე ხმა'];

interface VersionHit { vid: string; key: string; chantTitle: string; code: string; service: string }

// every version once (a chant may stand in several services)
const allVersions = (): VersionHit[] => {
  const seen = new Map<string, VersionHit>();
  for (const [service, chants] of SERVICE_LISTS)
    for (const ch of chants)
      for (const v of ch.variants || [])
        if (!seen.has(`${ch.id}|${v.code}`))
          seen.set(`${ch.id}|${v.code}`, { vid: v.id, key: `${ch.id}|${v.code}`, chantTitle: ch.title.replace(/[;\s]+$/, ''), code: v.code, service });
  return [...seen.values()];
};

// "ჩანაწერების მიბმა": a recording's Drive links are bound to a chant version here, without changing
// the code or republishing the site. Files must be shared "Anyone with the link" and be mp3.
export const RecordingsTab: React.FC<{ onMessage: (t: string, type: 'success' | 'error') => void }> = ({ onMessage }) => {
  const { user } = useAuth();
  const bindings = useRecordingBindings();
  const versions = useMemo(allVersions, []);
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<VersionHit | null>(null);
  const [links, setLinks] = useState(['', '', '', '']);
  const [saving, setSaving] = useState(false);
  const [playing, setPlaying] = useState<number | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  const hits = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return versions.filter(v => `${v.chantTitle} ${v.code}`.toLowerCase().includes(s)).slice(0, 30);
  }, [q, versions]);

  const ids = links.map(driveFileId);
  const bad = links.map((l, i) => l.trim() !== '' && !ids[i]);

  const pick = (v: VersionHit) => {
    setPicked(v);
    setQ('');
    const b = bindings[v.key];
    setLinks(b ? b.tracks.map(id => (id ? `https://drive.google.com/file/d/${id}/view` : '')) : ['', '', '', '']);
  };

  const listen = (i: number) => {
    if (playing === i) { audio.current?.pause(); setPlaying(null); return; }
    audio.current?.pause();
    const a = new Audio(proxyUrl(ids[i]));
    audio.current = a;
    a.onended = () => setPlaying(null);
    a.onerror = () => { setPlaying(null); onMessage(`${TRACKS[i]}: ფაილი ვერ ჩაირთო — შეამოწმე, რომ mp3-ია და „Anyone with the link“-ზეა გაზიარებული.`, 'error'); };
    a.play().then(() => setPlaying(i)).catch(() => setPlaying(null));
  };

  const save = async () => {
    if (!picked || !ids.some(Boolean)) return;
    setSaving(true);
    try {
      const binding: RecordingBinding = {
        title: `${picked.chantTitle} · ${picked.code}`,
        tracks: ids as RecordingBinding['tracks'],
        addedBy: user?.email || '',
        addedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'settings', 'recordings'), { bindings: { [picked.key]: binding } }, { merge: true });
      onMessage(`ჩანაწერი მიება: ${binding.title}. ყველას მაშინვე გამოუჩნდება.`, 'success');
      audio.current?.pause();
      setPlaying(null);
      setPicked(null);
      setLinks(['', '', '', '']);
    } catch {
      onMessage('ჩანაწერი ვერ შეინახა.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (key: string, title: string) => {
    if (!window.confirm(`მოვხსნა ჩანაწერი „${title}“?`)) return;
    try {
      await setDoc(doc(db, 'settings', 'recordings'), { bindings: { [key]: deleteField() } }, { merge: true });
      onMessage('ჩანაწერი მოიხსნა.', 'success');
    } catch {
      onMessage('ვერ მოიხსნა.', 'error');
    }
  };

  const list = Object.entries(bindings).sort((a, b) => (b[1].addedAt || '').localeCompare(a[1].addedAt || ''));
  const inCode = picked && !bindings[picked.key] ? getChantMedia(picked.key.split('|')[0], picked.code) : undefined;

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle icon={<Disc3 />} title="ჩანაწერის მიბმა" hint="აირჩიე საგალობლის ვერსია, ჩასვი Google Drive-ის ბმულები და მოუსმინე. კოდის შეცვლა და ხელახლა გამოქვეყნება აღარ სჭირდება." />

        {/* 1. the version */}
        <Label>1. საგალობლის ვერსია</Label>
        {picked ? (
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white ring-1 ring-[#e8dcc8] mb-4">
            <span className="flex-1 min-w-0">
              <span className="block font-semibold text-[#2a2017] truncate">{picked.chantTitle}</span>
              <span className="block text-xs text-[#8a7a6a]">{picked.service} · {SCHOOL_NAMES[schoolOf(picked.code)] || picked.code} · {picked.code}</span>
            </span>
            <Btn size="sm" kind="ghost" onClick={() => setPicked(null)}>შეცვლა</Btn>
          </div>
        ) : (
          <div className="mb-4 space-y-1.5">
            <div className="relative">
              <Search className="w-4 h-4 text-[#b3a594] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="მოძებნე: მაგ. მხოლოდ-შობილი" className={`${FIELD} pl-10`} />
            </div>
            {hits.length > 0 && (
              <ul className="max-h-72 overflow-y-auto rounded-2xl ring-1 ring-[#e8dcc8] bg-white divide-y divide-[#f1e8d9]">
                {hits.map(v => {
                  const has = Boolean(getChantMedia(v.key.split('|')[0], v.code));
                  return (
                    <li key={v.vid}>
                      <button type="button" onClick={() => pick(v)} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-[#fbf6ec] cursor-pointer">
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-[#2a2017] truncate">{v.chantTitle}</span>
                          <span className="block text-xs text-[#8a7a6a]">{v.service} · {v.code}</span>
                        </span>
                        {has && <Pill tone="green"><Check /> ჩანაწერი აქვს</Pill>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* 2. the files */}
        {picked && (
          <>
            {inCode && <p className="mb-3 p-3 rounded-xl bg-amber-50 ring-1 ring-amber-200 text-[13px] text-amber-900">ამ ვერსიას უკვე აქვს ჩანაწერი კოდში. აქ მიბმული ახალი ჩანაწერი მის ნაცვლად გაიჟღერებს.</p>}
            <Label hint="mp3, „Anyone with the link“">2. Drive-ის ბმულები</Label>
            <div className="space-y-2.5 mb-4">
              {TRACKS.map((t, i) => (
                <div key={t} className="flex items-center gap-2">
                  <span className="w-20 shrink-0 text-[13px] font-bold text-[#4a3426]">{t}</span>
                  <div className="relative flex-1 min-w-0">
                    <Link2 className="w-4 h-4 text-[#b3a594] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input value={links[i]} onChange={e => setLinks(l => l.map((x, j) => (j === i ? e.target.value : x)))}
                      placeholder="https://drive.google.com/file/d/…" className={`${FIELD} pl-9 ${bad[i] ? '!ring-red-300' : ''}`} />
                  </div>
                  <IconBtn label={`${t} — მოსმენა`} tone={playing === i ? 'wine' : 'plain'} disabled={!ids[i]} onClick={() => listen(i)}>
                    {playing === i ? <Pause /> : <Play />}
                  </IconBtn>
                </div>
              ))}
              {bad.some(Boolean) && <p className="text-xs font-semibold text-red-700">ზოგი ბმული Drive-ის ფაილის ბმულს არ ჰგავს.</p>}
            </div>
            <Btn icon={<Save />} disabled={saving || !ids.some(Boolean) || bad.some(Boolean)} onClick={save}>{saving ? 'ინახება…' : '3. მიბმა'}</Btn>
          </>
        )}
      </Card>

      <Card>
        <CardTitle title={`პანელიდან მიბმული · ${list.length}`} hint={`კოდში კიდევ ${codeBindingCount()} ვერსიას აქვს ჩანაწერი.`} />
        {list.length === 0 ? (
          <p className="text-sm text-[#8a7a6a]">ჯერ არცერთი.</p>
        ) : (
          <ul className="divide-y divide-[#f1e8d9]">
            {list.map(([key, b]) => (
              <li key={key} className="flex items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-[#2a2017] truncate">{b.title}</span>
                  <span className="block text-xs text-[#8a7a6a]">{b.tracks.filter(Boolean).length} ფაილი · {b.addedAt ? new Date(b.addedAt).toLocaleDateString('ka-GE') : ''}</span>
                </span>
                <IconBtn label="მოხსნა" tone="danger" onClick={() => remove(key, b.title)}><Trash2 /></IconBtn>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 flex gap-2 text-xs text-[#8a7a6a]"><Info className="w-4 h-4 shrink-0" /> ფაილები შენს Google Drive-ში რჩება და ჩვეულებრივ აუდიო-სერვერით იკვრება.</p>
      </Card>
    </div>
  );
};

