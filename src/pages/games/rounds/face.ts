import type React from 'react';
import type { LucideIcon } from 'lucide-react';
import type { PublicQ, RoundGame, RoundQ } from '../../../utils/roundGames';
import type { Clip } from './useSnippet';

// A quick game's own face over the shared screens of pages/games/rounds/ (the room, the lobby, the host's and the player's
// game, the one-phone game): its words, its rounds, how a player answers, how the answer is shown.

export interface RoundFace {
  game: RoundGame;
  /** the stem of its keys on this phone (the settings, a paused one-phone game): `sg-<game>` unless named — „დღის ჰანგი“'s
   * daily record already holds that one */
  store?: string;
  title: string;
  Icon: LucideIcon;
  /** the intro card: what the game is, then how each variant goes */
  intro: string;
  online: string;
  hybrid: string;
  /** a game's rounds, as many as there are up to `count` (none without recordings); `program` — the version ids of the
   * class's program (the chant games ask its chants too) */
  draw(count: number, program?: readonly string[]): RoundQ[];
  /** the rounds a game asked, kept on this phone so the next games ask others first */
  remember(rounds: RoundQ[]): void;
  /** the line over a round while it is asked (the host's, the player's) */
  askHost: string;
  askPlayer: string;
  /** the one-phone game: what the teams do meanwhile */
  askTeams: string;
  /** the round's piece at a step (a recording's, or a chant's on the synthesizer), when it has one */
  clip?: (q: PublicQ, step: number) => Clip | null;
  clipSeconds: number;
  /** a round of several steps (more of the piece at each): the host's button that brings the next one sooner */
  nextLabel?: string;
  /** a game of so many rounds only (no choice in the lobby or the one-phone setup) */
  fixedRounds?: number;
  /** the one-phone game goes one by one, the phone passed hand to hand: each one's own `Pick` gives their points (no
   * marks); `sides` names them */
  turns?: boolean;
  sides?: { many: string; one: string };
  /** the round in words, when the game asks one (a question): under the clock on every screen while it is asked */
  Ask?: React.FC<{ q: PublicQ; who: 'host' | 'player' | 'teams'; step: number; steps: number }>;
  /** what only the host sees while a round is asked, from the whole round (2026-11-01: the word the host shows in
   * „პანტომიმა“) */
  Secret?: React.FC<{ q: RoundQ }>;
  /** the host's own tool while a round is asked, under `Secret` (2026-11-01: „ნახატობანა“'s drawing pad): it may change the
   * round's public part (`edit`), which reaches every phone at once */
  Tool?: React.FC<{ q: RoundQ; edit: (q: RoundQ) => void }>;
  /** the line under the online tab's „new room“ for its opener (else: the host leads and does not play) */
  hostLine?: string;
  /** the game's own choices: under the rounds in the lobby (the host's) and in the one-phone setup */
  Options?: React.FC;
  /** more on the game's page, under both tabs (the teacher's own questions) */
  Extra?: React.FC;
  /** an answer that grows as the player plays (2026-11-01, „ხმის წყვილები“: the pairs found so far): it goes in by itself
   * once it is whole (`autoSend`), and what is marked goes in by itself as the time runs out (`sendLate`) */
  autoSend?: (q: PublicQ, pick: number) => boolean;
  sendLate?: boolean;
  /** a player's controls; `pick` is the answer marked, not sent yet (null: taken back) */
  Pick: React.FC<{ q: PublicQ; pick: number | null; onPick: (p: number | null) => void }>;
  /** an answer in words (the confirm button, „შენ: …“) */
  pickName(q: PublicQ, pick: number): string;
  /** the confirm button's words, with the answer marked */
  confirm(q: PublicQ, pick: number | null): string;
  /** the reveal's picture: the right answer, how many picked what, my own pick */
  Reveal: React.FC<{ q: PublicQ; picks?: (number | null)[] | null; mine?: number | null }>;
  /** the answer's card (what it was, where from, who) */
  Answer: React.FC<{ q: PublicQ }>;
  /** my answer, in words (`step`: the step it was sent at) */
  verdict(q: PublicQ, pick: number | null, step?: number | null): { tone: 'right' | 'near' | 'wrong' | 'none'; text: string };
  /** the one-phone game: what the host may mark for a team */
  marks: readonly { points: number; label: string }[];
  /** the line when there is nothing to play (the recordings are not opened for this member) */
  empty: string;
  /** the lobby's call, in a line */
  callHint: string;
}

/** a round's full content once it is open (the reveal shows what was secret) */
export const openQ = <Q extends RoundQ>(q: PublicQ) => q as Partial<Q> & Pick<Q, 'kind'>;
