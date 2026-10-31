import type React from 'react';
import type { LucideIcon } from 'lucide-react';
import type { PublicQ, RoundGame, RoundQ } from '../../../utils/roundGames';

// A quick game's own face over the shared screens of pages/games/rounds/ (the room, the lobby, the host's and the player's
// game, the one-phone game): its words, its rounds, how a player answers, how the answer is shown.

export interface RoundFace {
  game: RoundGame;
  title: string;
  Icon: LucideIcon;
  /** the intro card: what the game is, then how each variant goes */
  intro: string;
  online: string;
  hybrid: string;
  /** a game's rounds, as many as there are up to `count` (none without recordings) */
  draw(count: number): RoundQ[];
  /** the rounds a game asked, kept on this phone so the next games ask others first */
  remember(rounds: RoundQ[]): void;
  /** the line over a round while it is asked (the host's, the player's) */
  askHost: string;
  askPlayer: string;
  /** the one-phone game: what the teams do meanwhile */
  askTeams: string;
  /** the round's piece of a recording, when it has one */
  clip?: (q: PublicQ) => { url: string; from: number } | null;
  clipSeconds: number;
  /** a player's controls; `pick` is the answer marked, not sent yet */
  Pick: React.FC<{ q: PublicQ; pick: number | null; onPick: (p: number) => void }>;
  /** an answer in words (the confirm button, „შენ: …“) */
  pickName(q: PublicQ, pick: number): string;
  /** the confirm button's words, with the answer marked */
  confirm(q: PublicQ, pick: number | null): string;
  /** the reveal's picture: the right answer, how many picked what, my own pick */
  Reveal: React.FC<{ q: PublicQ; picks?: (number | null)[] | null; mine?: number | null }>;
  /** the answer's card (what it was, where from, who) */
  Answer: React.FC<{ q: PublicQ }>;
  /** my answer, in words */
  verdict(q: PublicQ, pick: number | null): { tone: 'right' | 'near' | 'wrong' | 'none'; text: string };
  /** the one-phone game: what the host may mark for a team */
  marks: readonly { points: number; label: string }[];
  /** the line when there is nothing to play (the recordings are not opened for this member) */
  empty: string;
  /** the lobby's call, in a line */
  callHint: string;
}

/** a round's full content once it is open (the reveal shows what was secret) */
export const openQ = <Q extends RoundQ>(q: PublicQ) => q as Partial<Q> & Pick<Q, 'kind'>;
