import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, ChevronRight, Eye, ListChecks, Loader2, Plus, Search, X } from 'lucide-react';
import { SERVICE_LISTS } from '../../data/chantLookup';
import { FOLK_SONGS, getFolkRegion } from '../../data/songsData';
import { MTKMELI_AUTHORS } from '../../data/mtkmeliData';
import { INSTRUMENTS_LIST } from '../../data/instrumentsData';
import { CatalogNode, buildCatalog } from '../../data/catalog';
import { SERVICES, shortcutLabel } from '../../utils/shortcuts';
import { CATEGORY_LABEL, CatalogEntry, findCatalogEntry, searchCatalog } from '../../utils/pathItems';
import { triggerHaptic } from '../../utils/haptics';
import { ProgramItem, SchoolClass } from '../../hooks/useClasses';
import { saveClassProgram } from '../admin/ClassesAdmin';
import { useOpenShortcut } from '../home/ShortcutShelf';
import { Btn, Card, CardTitle, FIELD, Flash, Sheet, useFlash } from '../ui/kit';

// „სასწავლო პროგრამა“ in the teacher's panel: what the class learns, in order; 👁 opens an item, ✕ takes it out.
// „დამატება“ opens everything to walk through — chants by service down to every version (recordings too), the prayer
// book, the library, songs, poems, instruments, the great chanters — with 👁 to look and + to add. The choice is saved
// when the window closes (or before 👁 leaves the page); chants, songs, poems and instruments go onto every member's path.

/** The button id that shows a program item (a path item's notes page or map, or the item's own button). */
const openIdOf = (id: string) => {
  const e = findCatalogEntry(id);
  if (!e) return shortcutLabel(id) ? id : '';
  return e.category === 'galoba' ? `chant:${id}` : e.category === 'simghera' ? `song:${id}` : e.category === 'mtkmeli' ? 'section:mtkmeli' : 'section:sakravebi';
};

export const ClassProgramPanel: React.FC<{ cls: SchoolClass }> = ({ cls }) => {
  const msg = useFlash();
  const openShortcut = useOpenShortcut();
  const [draft, setDraft] = useState<ProgramItem[] | null>(null);
  const [saving, setSaving] = useState(false);
  const program = cls.program;

  const commit = async (next: ProgramItem[]) => {
    setSaving(true);
    try {
      const failed = await saveClassProgram(cls, next);
      if (failed) msg.fail(`პროგრამა შენახულია, მაგრამ ${failed} წევრის გზა ვერ განახლდა.`);
      else msg.ok('პროგრამა შენახულია — წევრების გზაზეც განახლდა.');
    } catch {
      msg.fail('პროგრამა ვერ შეინახა.');
    } finally {
      setSaving(false);
    }
  };
  const toggle = (item: ProgramItem) => {
    triggerHaptic(10);
    setDraft(d => d && (d.some(p => p.id === item.id) ? d.filter(p => p.id !== item.id) : [...d, item]));
  };
  const close = () => {
    if (draft && JSON.stringify(draft) !== JSON.stringify(program)) void commit(draft);
    setDraft(null);
  };
  // looking at an item leaves the page: the choice so far is kept first
  const look = (id: string) => {
    close();
    openShortcut(id);
  };

  return (
    <Card>
      <CardTitle icon={<ListChecks />} title="სასწავლო პროგრამა"
        hint={program.length ? `${program.length} ერთეული · საგალობლები და სიმღერები წევრების გზაზეც` : 'რასაც კლასი სწავლობს — საგალობლები და სიმღერები წევრების გზაზეც ემატება'}
        right={<Btn size="sm" icon={<Plus />} onClick={() => setDraft(program)} disabled={saving}>დამატება</Btn>} />
      {program.length === 0 ? (
        <p className="text-sm text-[#8a7a6a]">პროგრამა ჯერ ცარიელია — „დამატებით“ გადაათვალიერე გალობა, ლოცვანი, ბიბლიოთეკა, სიმღერა და სხვა.</p>
      ) : (
        <ol className="-mx-2 divide-y divide-[#f1e8d9]">
          {program.map((p, i) => {
            const cat = p.id ? findCatalogEntry(p.id)?.category : undefined;
            const openId = p.id ? openIdOf(p.id) : '';
            const sub = cat ? `${CATEGORY_LABEL[cat]}${p.code ? ` · ${p.code}` : ''}` : p.code || (p.id && shortcutLabel(p.id)?.sub) || 'ტექსტი';
            return (
              <li key={p.id || i} className="flex items-center gap-2 px-2 py-2">
                <span className="w-7 h-7 shrink-0 rounded-full bg-[#7a2028]/[0.08] text-[#7a2028] text-[13px] font-bold flex items-center justify-center tabular-nums">{i + 1}</span>
                <span className="flex-1 min-w-0 pl-1">
                  <span className="block text-sm font-semibold text-[#2a2017] truncate">{p.title}</span>
                  <span className="block text-xs text-[#8a7a6a] truncate">{sub}</span>
                </span>
                {openId && <RowIcon label={`${p.title} — გახსნა`} onClick={() => openShortcut(openId)}><Eye /></RowIcon>}
                <RowIcon label={`${p.title} — პროგრამიდან ამოღება`} danger disabled={saving} onClick={() => commit(program.filter((_, j) => j !== i))}><X /></RowIcon>
              </li>
            );
          })}
        </ol>
      )}
      {saving && <p className="mt-2 text-xs font-semibold text-[#8a7a6a]">ინახება და წევრების გზა ახლდება…</p>}
      {msg.flash && <div className="mt-3"><Flash flash={msg.flash} onClose={msg.clear} /></div>}
      {draft && <ProgramPicker picked={draft} onToggle={toggle} onLook={look} onClose={close} />}
    </Card>
  );
};

const RowIcon: React.FC<{ label: string; onClick: () => void; danger?: boolean; disabled?: boolean; children: React.ReactNode }> = ({ label, onClick, danger, disabled, children }) => (
  <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label}
    className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-[#c2b092] cursor-pointer transition disabled:opacity-40 [&>svg]:w-[17px] [&>svg]:h-[17px] ${danger ? 'hover:bg-red-50 hover:text-red-700' : 'hover:bg-[#7a2028]/[0.06] hover:text-[#7a2028]'}`}>
    {children}
  </button>
);

/** A row of the tree: `item` is what + adds, `open` the button id that shows it, `children` the next level. */
interface Node { key: string; title: string; sub?: string; item?: ProgramItem; open?: string; children?: () => Node[] | Promise<Node[]> }

const pathLeaf = (id: string, title: string, sub?: string): Node[] => {
  const e = findCatalogEntry(id);
  return e ? [{ key: id, title, sub: sub ?? e.code, item: { id: e.id, title: e.title, code: e.code }, open: openIdOf(id) }] : [];
};
const entryNode = (e: CatalogEntry): Node => ({ key: e.id, title: e.title, sub: `${CATEGORY_LABEL[e.category]} · ${e.code}`, item: { id: e.id, title: e.title, code: e.code }, open: openIdOf(e.id) });

/** a node of the buttons' catalogue (prayer book, library, chanters): its button is the program item */
const fromCatalog = (n: CatalogNode): Node => {
  const l = n.id ? shortcutLabel(n.id) : null;
  const sub = n.sub ?? l?.sub;
  return {
    key: `c:${n.key}`, title: n.title, sub,
    ...(n.id ? { item: { id: n.id, title: l?.label || n.title, code: sub || '' }, open: n.id } : {}),
    ...(n.children?.length ? { children: () => n.children!.map(fromCatalog) } : n.load ? { children: async () => (await n.load!()).map(fromCatalog) } : {}),
  };
};

// the buttons' catalogue (as the home buttons' picker shows it), for the parts the path catalogue doesn't have
const BUTTONS = () => buildCatalog({ signedIn: true, owner: false, hasClass: true, habits: [], allowed: () => true });
const fromButtons = (key: string) => BUTTONS().filter(n => n.key === key).map(fromCatalog);

const roots = (): Node[] => [
  {
    key: 'g', title: 'გალობა', sub: 'მსახურებები → საგალობელი → ყველა ვერსია',
    children: () => SERVICE_LISTS.filter(([s]) => (SERVICES as readonly string[]).includes(s)).map(([service, list]) => {
      const chants = list.filter(c => c.variants?.length);
      return {
        key: `g:${service}`, title: service, sub: `${chants.length} საგალობელი`,
        children: () => chants.flatMap(c => {
          const title = c.title.replace(/[;\s]+$/, '');
          const versions = c.variants!.flatMap(v => pathLeaf(v.id, v.code || v.label, v.label && v.code ? v.label : undefined));
          if (versions.length === 1) return [{ ...versions[0], title, sub: versions[0].title }];
          return versions.length ? [{ key: `g:${service}:${c.id}`, title, sub: `${versions.length} ვერსია`, children: () => versions }] : [];
        }),
      };
    }),
  },
  ...fromButtons('prayers'),
  ...fromButtons('library'),
  {
    key: 's', title: 'სიმღერა', sub: 'კუთხეების მიხედვით',
    children: () => [...new Set(FOLK_SONGS.map(s => s.region))]
      .map(r => ({ r, name: getFolkRegion(r).nameGe, songs: FOLK_SONGS.filter(s => s.region === r) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ka'))
      .map(({ r, name, songs }) => ({ key: `s:${r}`, title: name, sub: `${songs.length} სიმღერა`, children: () => songs.flatMap(s => pathLeaf(s.id, s.title, name)) })),
  },
  {
    key: 'm', title: 'მთქმელი', sub: 'ავტორების მიხედვით',
    children: () => MTKMELI_AUTHORS.map(a => ({ key: `m:${a.id}`, title: a.name, sub: `${a.works.length} ნაწარმოები`, children: () => a.works.flatMap(w => pathLeaf(w.id, w.title, a.name)) })),
  },
  { key: 'i', title: 'საკრავები', sub: `${INSTRUMENTS_LIST.length} საკრავი`, children: () => INSTRUMENTS_LIST.flatMap(i => pathLeaf(i.id, i.nameGe, 'საკრავი')) },
  ...fromButtons('ancestors'),
];

/** every button of the prayer book, library and chanters (books loaded later aren't searched) */
let buttonIndex: Node[] | null = null;
const searchButtons = (words: string[]) => {
  if (!buttonIndex) {
    const out: Node[] = [];
    const walk = (n: CatalogNode) => { if (n.id) out.push(fromCatalog({ ...n, children: undefined, load: undefined })); n.children?.forEach(walk); };
    BUTTONS().filter(n => ['prayers', 'library', 'ancestors'].includes(n.key)).forEach(walk);
    buttonIndex = out;
  }
  return buttonIndex.filter(n => { const hay = `${n.title} ${n.sub || ''}`.toLowerCase(); return words.every(w => hay.includes(w)); }).slice(0, 30);
};

/** Everything to walk through: 👁 shows an item, + adds it (✓ once in the program); the search finds it at once. */
const ProgramPicker: React.FC<{ picked: ProgramItem[]; onToggle: (item: ProgramItem) => void; onLook: (id: string) => void; onClose: () => void }> = ({ picked, onToggle, onLook, onClose }) => {
  const top = useMemo(roots, []);
  const [path, setPath] = useState<Node[]>([]);
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Node[] | null>(top);
  const here = path[path.length - 1];

  useEffect(() => {
    const words = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (words.length) { setRows([...searchCatalog(q, 30).map(entryNode), ...searchButtons(words)]); return; }
    const next = here?.children ? here.children() : top;
    if (!(next instanceof Promise)) { setRows(next); return; }
    let live = true;
    setRows(null);
    next.then(r => live && setRows(r), () => live && setRows([]));
    return () => { live = false; };
  }, [here, q, top]);

  const on = new Set(picked.map(p => p.id));

  return (
    <Sheet open onClose={onClose} title={`პროგრამაში დამატება · ${picked.length}`} wide
      footer={<Btn size="lg" full icon={<Check />} onClick={onClose}>მზადაა</Btn>}>
      <div className="relative mb-3">
        <Search className="w-4 h-4 text-[#b3a594] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="მოძებნე საგალობელი, ლოცვა, წიგნი, სიმღერა…" className={`${FIELD} pl-10`} />
      </div>
      {!q.trim() && path.length > 0 && (
        <button type="button" onClick={() => setPath(p => p.slice(0, -1))}
          className="mb-1 w-full flex items-center gap-2 h-10 px-2 rounded-xl text-left text-[13px] font-bold text-[#7a2028] hover:bg-[#7a2028]/[0.05] cursor-pointer">
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span className="truncate">{path.map(n => n.title).join(' › ')}</span>
        </button>
      )}
      {rows === null ? (
        <p className="py-8 flex justify-center text-[#8a7a6a]"><Loader2 className="w-5 h-5 animate-spin" /></p>
      ) : (
        <ul className="divide-y divide-[#f1e8d9]">
          {rows.map(n => {
            const added = !!n.item && on.has(n.item.id);
            return (
              <li key={n.key} className="flex items-center gap-1">
                <button type="button" onClick={() => (n.children ? setPath(p => [...p, n]) : n.item && onToggle(n.item))}
                  className="flex-1 min-w-0 flex items-center gap-2 px-2 py-2.5 text-left rounded-xl hover:bg-[#fbf6ec] cursor-pointer transition-colors">
                  <span className="flex-1 min-w-0">
                    <span className={`block text-sm truncate ${n.children ? 'font-bold text-[#4a3426]' : 'font-semibold text-[#2a2017]'}`}>{n.title}</span>
                    {n.sub && <span className="block text-xs text-[#8a7a6a] truncate">{n.sub}</span>}
                  </span>
                  {n.children && <ChevronRight className="w-4 h-4 shrink-0 text-[#b3a594]" />}
                </button>
                {n.open && <RowIcon label={`${n.title} — გახსნა`} onClick={() => onLook(n.open!)}><Eye /></RowIcon>}
                {n.item && (
                  <button type="button" onClick={() => onToggle(n.item!)} aria-pressed={added} aria-label={`${n.title} — ${added ? 'პროგრამიდან ამოღება' : 'პროგრამაში დამატება'}`}
                    className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center cursor-pointer transition active:scale-90 ${added ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-[#7a2028]/[0.07] text-[#7a2028] hover:bg-[#7a2028]/[0.12]'}`}>
                    {added ? <Check className="w-4 h-4 stroke-[3]" /> : <Plus className="w-4 h-4 stroke-[2.5]" />}
                  </button>
                )}
              </li>
            );
          })}
          {rows.length === 0 && <li className="py-6 text-center text-sm text-[#8a7a6a]">ვერ მოიძებნა.</li>}
        </ul>
      )}
    </Sheet>
  );
};
