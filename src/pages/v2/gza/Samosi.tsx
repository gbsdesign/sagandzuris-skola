import React, { useEffect, useState } from 'react';
import { useAuth, useViewing } from '../../../context';
import { useAccess } from '../../../hooks/useAccess';
import { nameGender } from '../../../data/georgianNames';
import { useKabaSettings } from '../../../utils/kabaArt';
import { clearTried } from '../../../utils/samosiTry';
import { useTryOn } from '../../../utils/samosiTryOn';
import { useChokha } from './SamosiChokha';
import { useKaba } from './SamosiKaba';
import { PartSheet } from './SamosiPartSheet';
import { MoreSheetView, SamosiMode } from './SamosiSheets';
import { TryOnSheet, tryOnStatus } from './SamosiTryOn';
import { SamosiCheer, SamosiView } from './SamosiView';

export { SamosiView } from './SamosiView';
export type { SamosiViewProps, SamosiTile, TileGroup, TileMark, SamosiCheer } from './SamosiView';

// „ჩემი სამოსი“ in the new look (board x-samosi; the path page renders it under page `gz`, mapItem `samosi`). The old
// ChemiSamosi's behaviour, laid out as the board: the figure big in the middle, the parts as tiles under it, one button
// — photograph the next part —, and the rare things behind the ⋯: the outfit (ჩოხა / ქართული კაბა, while the kaba is
// published), what the figure shows (ნამდვილი / მოჩვენებითი), the colour and the papakha's kind, „ჩოხა შენს ფოტოზე“.
// • a part tried on lives only in memory (utils/samosiTry.ts) and goes when this page is left (clearTried below);
// • a part stays for good once the member photographs their own and the AI sees it (the part's sheet, SamosiPartSheet);
// • a teacher's look at a student (useViewing) has no camera; the photo try-on needs „ფოტოზე ჩოხის ჩაცმა“ (samosiPhoto)
//   and is never shown in the kids' mode (it sends the photo to Google's AI, as the AI teacher does).

type Win = null | 'more' | 'tryon';

export const SamosiPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user, isOwner } = useAuth();
  const viewing = !!useViewing();
  const access = useAccess();
  const uid = user?.uid;
  const [mode, setMode] = useState<SamosiMode>('real');
  const [win, setWin] = useState<Win>(null);
  const [partId, setPartId] = useState<string | null>(null);
  const [cheer, setCheer] = useState<{ n: number; finale: boolean } | null>(null);

  // leaving the page takes the tried parts off
  useEffect(() => () => clearTried(), []);
  useEffect(() => {
    if (!cheer) return;
    const t = setTimeout(() => setCheer(null), 2600);
    return () => clearTimeout(t);
  }, [cheer]);

  const onCheer = (finale: boolean) => setCheer({ n: Date.now(), finale });
  const kabaSet = useKabaSettings();
  const kabaOn = kabaSet.published || isOwner;
  const chokha = useChokha({ uid, mode, openPart: setPartId, onCheer });
  // the member's choice, else the kaba first for a girl's name
  const shown = !kabaOn ? 'chokha' : chokha.outfit ?? (nameGender(chokha.firstName) === 'f' ? 'kaba' : 'chokha');
  const kaba = useKaba({
    uid, mode, enabled: shown === 'kaba', published: kabaSet.published, heads: kabaSet.heads, isOwner, openPart: setPartId, onCheer,
  });
  const m = shown === 'kaba' ? kaba : chokha.model;

  const tryOnAllowed = !!user && access.can('samosiPhoto') && !access.kids;
  const tryOn = useTryOn(tryOnAllowed ? uid : null, isOwner);
  const part = partId ? m.part(partId) : undefined;

  const whole: SamosiCheer['whole'] = shown === 'kaba' ? 'კაბა სრულადაა!' : 'ჩოხა სრულადაა!';

  return (
    <SamosiView
      onBack={onBack}
      done={m.realDone}
      total={m.total}
      onMore={() => setWin('more')}
      figure={m.figure}
      cheer={cheer && { ...cheer, whole }}
      groups={m.groups}
      empty={viewing ? 'ring' : mode === 'tried' ? 'plus' : 'camera'}
      onTile={m.tap}
      onNext={!viewing && uid && m.nextId ? () => setPartId(m.nextId) : undefined}
      footer={m.footer}
    >
      <MoreSheetView
        open={win === 'more'}
        onClose={() => setWin(null)}
        outfit={kabaOn ? {
          value: shown,
          onChange: o => { setPartId(null); chokha.chooseOutfit(o); },
        } : undefined}
        mode={{ value: mode, onChange: setMode }}
        colour={shown === 'chokha' ? chokha.colour : undefined}
        kind={shown === 'chokha' ? chokha.kind : undefined}
        tryOn={shown === 'chokha' && tryOnAllowed ? {
          thumb: tryOn.url,
          status: tryOnStatus(tryOn, isOwner),
          onOpen: () => setWin('tryon'),
        } : undefined}
      />
      {tryOnAllowed && uid && (
        <TryOnSheet open={win === 'tryon'} onClose={() => setWin(null)} uid={uid} unlimited={isOwner} look={chokha.tryOnLook} tryOn={tryOn} />
      )}
      {part && (
        <PartSheet
          key={`${shown}-${part.id}`}
          outfit={shown}
          part={part}
          pic={part.pic}
          real={m.stateOf(part.id) === 'real'}
          onClose={() => setPartId(null)}
          onProved={id => { m.proved(id); setPartId(null); }}
          onRemoved={m.unproved}
        />
      )}
    </SamosiView>
  );
};
