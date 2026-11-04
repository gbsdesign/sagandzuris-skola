import { RSR_QUESTIONS, RSR_TOPICS, type RsrQuestion } from '../../../data/raSadRodisQuestions';
import { LISTEN, MINE } from '../../../utils/raSadRodis';

// „რა? სად? როდის?“'s topics, one choice for both tabs: the written ones, „მოისმინე“ while this member may hear the
// recordings, and my own questions once I wrote some. None chosen means all.

export const LISTEN_LABEL = 'მოისმინე';
export const MINE_LABEL = 'ჩემი კითხვები';

export const topicLabel = (id: string) =>
  RSR_TOPICS.find(t => t.id === id)?.label ?? (id === LISTEN ? LISTEN_LABEL : id === MINE ? MINE_LABEL : '');

const COUNTS = RSR_QUESTIONS.reduce((m, q) => m.set(q.topic, (m.get(q.topic) ?? 0) + 1), new Map<string, number>());

export interface TopicRow { id: string; label: string; n: number }

/** the topics to choose from; `listen` — how many recordings this member may hear */
export const topicRows = (listen: number, mine: RsrQuestion[]): TopicRow[] => [
  ...RSR_TOPICS.map(t => ({ id: t.id, label: t.label, n: COUNTS.get(t.id) ?? 0 })),
  ...(listen ? [{ id: LISTEN, label: LISTEN_LABEL, n: listen }] : []),
  ...(mine.length ? [{ id: MINE, label: MINE_LABEL, n: mine.length }] : []),
];

/** the chosen topics that can still be drawn from; none of them (or none chosen): all */
export const activeTopics = (chosen: string[], all: string[]) => {
  const c = chosen.filter(t => all.includes(t));
  return c.length ? c : all;
};
