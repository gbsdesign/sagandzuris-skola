// The quiz topics' looks on paper — each topic's colour and icon, the band on its cards — shared by the kits of
// „რა? სად? როდის?“ and „ოთხიდან ერთი“ (both ask the topics of `data/kartuliQuiz.ts` and their own faith ones).
export const TOPIC_LOOK = {
  istoria: { color: '#3d6b6b', icon: 'landmark' },
  gmirebi: { color: '#8a2432', icon: 'swords' },
  adamianebi: { color: '#a87d14', icon: 'star' },
  mtserloba: { color: '#5a4636', icon: 'feather' },
  kino: { color: '#3f4652', icon: 'clapperboard' },
  simgera: { color: '#6b4c9a', icon: 'music' },
  tsekva: { color: '#8e3d7f', icon: 'footprints' },
  samzareulo: { color: '#c7701e', icon: 'utensils' },
  samosi: { color: '#b0475f', icon: 'shirt' },
  kutkhe: { color: '#2f7d4f', icon: 'mountain' },
  dzeglebi: { color: '#a0522d', icon: 'castle' },
  buneba: { color: '#6b7f1a', icon: 'trees' },
  zgaprebi: { color: '#4a55a0', icon: 'scroll-text' },
  sporti: { color: '#2a7aa8', icon: 'trophy' },
  musika: { color: '#2f5d8a', icon: 'music-4' },
  tsmindanebi: { color: '#c69214', icon: 'sparkles' },
  sagmrto: { color: '#7b5e3b', icon: 'book-open' },
  dgesastsauli: { color: '#d0613c', icon: 'calendar-days' },
  galoba: { color: '#1d5c63', icon: 'audio-lines' },
};

/** a game's topics with their looks; a topic without one stops the build */
export const lookedTopics = topics => topics.map(t => {
  if (!TOPIC_LOOK[t.id]) throw new Error(`no look for the topic ${t.id}`);
  return { ...t, ...TOPIC_LOOK[t.id] };
});
