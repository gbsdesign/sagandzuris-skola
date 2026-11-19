import React, { lazy } from 'react';
import { useNewLook } from '../../design/newLook';
import { PageSkeleton } from '../../components/shell/PageSkeleton';

// The games that open inside the games page, by their `mapItem` — each loads only when it is opened (redesign stage 3
// „სიჩქარე“: the list itself needs only data/games.ts and the metas; „ქარავანი“'s map alone is ~100 KB). Both looks' hubs
// (pages/GamesPage.tsx, pages/v2/tamashebi) open them from here.

const HangiGame = lazy(() => import('./HangiGame'));
const AmikhseniGame = lazy(() => import('./AmikhseniGame'));
const SitqvaGame = lazy(() => import('./SitqvaGame'));
const OtkheuliGame = lazy(() => import('./OtkheuliGame'));
const GatvlaGame = lazy(() => import('./GatvlaGame'));
const ChurchkhelaGame = lazy(() => import('./ChurchkhelaGame'));
const RaSadRodisGame = lazy(() => import('./RaSadRodisGame'));
const SamshvildeGame = lazy(() => import('./SamshvildeGame'));
const KutkheGame = lazy(() => import('./KutkheGame'));
const OtkhiGame = lazy(() => import('./OtkhiGame'));
const KhmebiGame = lazy(() => import('./KhmebiGame'));
const NotebiGame = lazy(() => import('./NotebiGame'));
const TurniriGame = lazy(() => import('./TurniriGame'));
const AkordiGame = lazy(() => import('./AkordiGame'));
const RvakhmaGame = lazy(() => import('./RvakhmaGame'));
const RukaGame = lazy(() => import('./RukaGame'));
const GagrdzeleGame = lazy(() => import('./GagrdzeleGame'));
const HangebiGame = lazy(() => import('./HangebiGame'));
const EqoGame = lazy(() => import('./EqoGame'));
const MprinaviGame = lazy(() => import('./MprinaviGame'));
const TsqvilebiGame = lazy(() => import('./TsqvilebiGame'));
const MesameGame = lazy(() => import('./MesameGame'));
const GundiGame = lazy(() => import('./GundiGame'));
const ChamotvaleGame = lazy(() => import('./ChamotvaleGame'));
const BadeGame = lazy(() => import('./BadeGame'));
const TsartseraGame = lazy(() => import('./TsartseraGame'));
const KhaziGame = lazy(() => import('./KhaziGame'));
const ChaitsviGame = lazy(() => import('./ChaitsviGame'));
const AnbaniGame = lazy(() => import('./AnbaniGame'));
const TsikheGame = lazy(() => import('./TsikheGame'));
const TsinapariGame = lazy(() => import('./TsinapariGame'));
const TabuGame = lazy(() => import('./TabuGame'));
const MinishnebaGame = lazy(() => import('./MinishnebaGame'));
const PantomimaGame = lazy(() => import('./PantomimaGame'));
const VinGame = lazy(() => import('./VinGame'));
const SaidumloGame = lazy(() => import('./SaidumloGame'));
const UtskhoGame = lazy(() => import('./UtskhoGame'));
const NakhatiGame = lazy(() => import('./NakhatiGame'));
const LotoGame = lazy(() => import('./LotoGame'));
const DzebnaGame = lazy(() => import('./DzebnaGame'));
const EzoGame = lazy(() => import('./EzoGame'));
const KariGame = lazy(() => import('./KariGame'));
const LurjiGame = lazy(() => import('./LurjiGame'));
const TakhtiGame = lazy(() => import('./TakhtiGame'));
const OkrosGame = lazy(() => import('./OkrosGame'));
const QaravaniGame = lazy(() => import('./QaravaniGame'));

export const INNER_GAMES: Record<string, React.ComponentType> = {
  hangi: HangiGame, amikhseni: AmikhseniGame, sitqva: SitqvaGame, otkheuli: OtkheuliGame, gatvla: GatvlaGame, churchkhela: ChurchkhelaGame, rsr: RaSadRodisGame,
  samshvilde: SamshvildeGame, kutkhe: KutkheGame, otkhi: OtkhiGame, khmebi: KhmebiGame, notebi: NotebiGame, turniri: TurniriGame,
  akordi: AkordiGame, rvakhma: RvakhmaGame, ruka: RukaGame, gagrdzele: GagrdzeleGame, hangebi: HangebiGame,
  eqo: EqoGame, mprinavi: MprinaviGame, tsqvilebi: TsqvilebiGame, mesame: MesameGame, gundi: GundiGame, chamotvale: ChamotvaleGame, bade: BadeGame, tsartsera: TsartseraGame, khazi: KhaziGame, chaitsvi: ChaitsviGame, anbani: AnbaniGame, tsikhe: TsikheGame, tsinapari: TsinapariGame, tabu: TabuGame, minishneba: MinishnebaGame, pantomima: PantomimaGame, vin: VinGame, saidumlo: SaidumloGame, utskho: UtskhoGame, nakhati: NakhatiGame, loto: LotoGame, dzebna: DzebnaGame, ezo: EzoGame, kari: KariGame, lurji: LurjiGame, takhti: TakhtiGame, qaravani: QaravaniGame, okros: OkrosGame,
};

/** while an opened game's part is still on its way: the new look's page shape, else the old spinner */
export const GameWaiting: React.FC = () =>
  useNewLook() ? <PageSkeleton /> : (
    <div className="py-20 flex justify-center" role="status" aria-label="იტვირთება"><span className="w-9 h-9 rounded-full border-[3px] border-[#7a2028]/20 border-t-[#7a2028] animate-spin" /></div>
  );
