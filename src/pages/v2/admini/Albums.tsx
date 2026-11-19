import React, { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button, Chips, Choice, Helper, Note, Row, Rows, Sheet } from '../../../components/ui2';
import { ALL_ALBUMS, ALBUM_NAMES, MTKMELI_ALBUMS, isAlbumOn } from '../../../components/admin/AlbumRights';
import { FAIL } from '../../../components/admin/CentreDownload';
import { changed } from '../../../components/admin/changed';
import {
  type AlbumRight, type AlbumRights, setEveryoneAlbum, setMemberAlbum, useEveryoneAlbums, useMemberAlbums,
} from '../../../data/albumAccess';
import { matchScore, searchNormalize } from '../../../utils/searchMatch';
import { SearchBox } from '../klasi/teacher/SearchBox';
import { useAdmin } from './ctx';

const PAGE = 25;
type Level = 'none' | 'listen' | 'both';
const LEVELS: { id: Level; label: string; right: AlbumRight }[] = [
  { id: 'none', label: 'დამალულია', right: { l: false, d: false } },
  { id: 'listen', label: 'მხოლოდ მოსმენა', right: { l: true, d: false } },
  { id: 'both', label: 'მოსმენა და ჩამოწერა', right: { l: true, d: true } },
];
const wordOf = (r: AlbumRight) => (r.l && r.d ? 'მოსმენა და ჩამოწერა' : r.l ? 'მხოლოდ მოსმენა' : r.d ? 'მხოლოდ ჩამოწერა' : 'დამალულია');
const levelOf = (r: AlbumRight): Level => (r.l && r.d ? 'both' : r.l || r.d ? 'listen' : 'none');
const rank: Record<Level, number> = { none: 0, listen: 1, both: 2 };

/** The albums, each with one value — hidden, listening only, listening and saving; a tap chooses it (x-skola-albomebi).
 *  `inherited` = what every member has already (a member's own list): a value under it cannot be chosen. */
const AlbumList: React.FC<{
  rights: AlbumRights;
  inherited?: AlbumRights;
  onSet: (album: string, name: string, next: AlbumRight, before: AlbumRight) => void;
}> = ({ rights, inherited = {}, onSet }) => {
  const [query, setQuery] = useState('');
  const [onlyOn, setOnlyOn] = useState<'all' | 'on'>('all');
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState<string | null>(null);
  const onCount = ALL_ALBUMS.filter(a => isAlbumOn(rights[a[0]]) || isAlbumOn(inherited[a[0]])).length;
  const list = useMemo(() => {
    const q = searchNormalize(query);
    let l = ALL_ALBUMS.filter(a => onlyOn === 'all' || isAlbumOn(rights[a[0]]) || isAlbumOn(inherited[a[0]]));
    if (q) {
      l = l.map(a => ({ a, s: matchScore(ALBUM_NAMES.get(a[0]) ?? '', q) }))
        .filter((x): x is { a: (typeof l)[number]; s: number } => x.s !== null)
        .sort((x, y) => x.s - y.s)
        .map(x => x.a);
    }
    return l;
  }, [query, onlyOn, rights, inherited]);
  const shownOf = (id: string): AlbumRight => {
    const r = rights[id] ?? {}, i = inherited[id] ?? {};
    return { l: Boolean(r.l || i.l), d: Boolean(r.d || i.d) };
  };
  const picked = open ? ALL_ALBUMS.find(a => a[0] === open) : undefined;
  const floor = open ? levelOf({ l: Boolean(inherited[open]?.l), d: Boolean(inherited[open]?.d) }) : 'none';

  return (
    <>
      <SearchBox value={query} onChange={v => { setQuery(v); setLimit(PAGE); }} placeholder="ალბომის ძებნა" />
      <Chips label="რომელი ალბომები" value={onlyOn} onChange={v => { setOnlyOn(v); setLimit(PAGE); }}
        items={[{ id: 'all', label: `ყველა · ${ALL_ALBUMS.length}` }, { id: 'on', label: `ჩართულები · ${onCount}` }]} />
      {list.length === 0 ? (
        <Helper>{onlyOn === 'on' ? 'ჯერ არცერთი ალბომი არ არის ჩართული.' : 'ასეთი ალბომი ვერ მოიძებნა.'}</Helper>
      ) : (
        <Rows>
          {list.slice(0, limit).map(([id, name, count]) => {
            const r = shownOf(id);
            const shared = isAlbumOn(inherited[id]);
            return (
              <Row key={id} title={name} wrap onClick={() => setOpen(id)}
                sub={`${count} ჩანაწერი · ${wordOf(r)}${shared ? ' (ყველას)' : ''}${MTKMELI_ALBUMS.has(id) ? ' · მთქმელი' : ''}`} />
            );
          })}
        </Rows>
      )}
      {list.length > limit && (
        <Button kind="ghost" full icon={<ChevronDown />} onClick={() => setLimit(l => l + PAGE * 4)}>კიდევ · სულ {list.length}</Button>
      )}
      <Sheet open={!!picked} onClose={() => setOpen(null)} title={picked?.[1] || ''}>
        {picked && (
          <Rows role="radiogroup" aria-label="ვის რა შეუძლია">
            {LEVELS.map(lv => {
              const r = shownOf(picked[0]);
              const own = rights[picked[0]] ?? {};
              const below = rank[lv.id] < rank[floor];
              return (
                <Choice key={lv.id} title={lv.label} on={levelOf(r) === lv.id} disabled={below}
                  sub={below ? 'ყველა წევრს მეტი აქვს ჩართული (სკოლა → ალბომები)' : undefined}
                  onClick={() => {
                    setOpen(null);
                    if (levelOf(r) === lv.id) return;
                    onSet(picked[0], picked[1], lv.right, { l: Boolean(own.l), d: Boolean(own.d) });
                  }} />
              );
            })}
          </Rows>
        )}
      </Sheet>
    </>
  );
};

/** x-skola-albomebi — an album for every member. */
export const SchoolAlbums: React.FC = () => {
  const { say } = useAdmin();
  const { rights } = useEveryoneAlbums();
  const n = ALL_ALBUMS.filter(a => isAlbumOn(rights[a[0]])).length;
  return (
    <>
      <Note>{n ? `ყველა წევრს ჩართული აქვს ${n} ალბომი.` : 'წევრებს ჯერ არცერთი ალბომი არ უჩანთ.'} ცალკე წევრს — მის გვერდზე, „როლი და უფლებები“. ადმინები და მასწავლებლები ყველა ალბომს ხედავენ.</Note>
      <AlbumList rights={rights} onSet={(album, name, next, before) => {
        setEveryoneAlbum(album, next).then(
          () => changed('right', `„${name}“ — ყველა წევრს: ${wordOf(next)}`, '', () => setEveryoneAlbum(album, before)),
          () => say(FAIL, 'error'));
      }} />
    </>
  );
};

/** A person's „ალბომები“: this member's own albums (what everyone has shows as the least they can have). */
export const MemberAlbumsV2: React.FC<{ uid: string; name: string }> = ({ uid, name }) => {
  const { say } = useAdmin();
  const { rights } = useMemberAlbums(uid);
  const everyone = useEveryoneAlbums().rights;
  const own = ALL_ALBUMS.filter(a => isAlbumOn(rights[a[0]])).length;
  const shared = ALL_ALBUMS.filter(a => isAlbumOn(everyone[a[0]])).length;
  return (
    <>
      <Note>{own ? `ჩართულია ${own} ალბომი` : 'ალბომები არ აქვს ჩართული'}{shared ? ` · + ${shared} ყველასთვის ჩართული` : ''}.</Note>
      <AlbumList rights={rights} inherited={everyone} onSet={(album, albumName, next, before) => {
        const inh = everyone[album] ?? {};
        const mine = { l: next.l && !inh.l, d: next.d && !inh.d };
        setMemberAlbum(uid, album, mine).then(
          () => changed('right', `${name} — „${albumName}“: ${wordOf(next)}`, uid, () => setMemberAlbum(uid, album, before)),
          () => say(FAIL, 'error'));
      }} />
    </>
  );
};
