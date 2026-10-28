// მედავითნეობა's books live in `mapItem` as „w“, „w:s:biblia“, „w:c:<collection>“, „w:c:<collection>:<n>“,
// „w:c:<collection>:<n>:<part>“. When the page was opened straight on one of them (a reload, a link), the bar's „←“
// goes one level up: „w:c:jamni:3:1“ → „w:c:jamni:3“ → „w:c:jamni“ → „w“ → the lessons.
export const wignebiParent = (item: string): string | null => {
  const parts = item.split(':');
  if (parts.length <= 1) return null;
  parts.pop();
  return parts.length >= 3 ? parts.join(':') : 'w';
};
