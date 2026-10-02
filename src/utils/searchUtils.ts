/**
 * Smart Georgian search & phonetic normalization utilities.
 * Handles fuzzy matching, punctuation removal, and common Georgian liturgical phonetic variants
 * (e.g. 'წმიდაო' <-> 'წმინდაო', 'ღირს-არს' <-> 'ღირს არს', etc.).
 */

export const normalizeGeorgianText = (text: string): string => {
  if (!text) return '';

  return (
    text
      .toLowerCase()
      // Replace Georgian liturgical common variants
      .replace(/წმიდა/g, 'წმინდა')
      .replace(/ქრისტეჲს/g, 'ქრისტეს')
      .replace(/ღმრთ/g, 'ღვთ')
      // Remove dashes, quotes, brackets, punctuation
      .replace(/[-_.,/\\()[\]{}„"':;!?]/g, ' ')
      // Collapse multiple whitespace
      .replace(/\s+/g, ' ')
      .trim()
  );
};

/**
 * Checks if a target text matches search query with fuzzy and phonetic normalization.
 */
export const matchesSearch = (targetText: string, query: string): boolean => {
  if (!query || !query.trim()) return true;
  if (!targetText) return false;

  const rawTarget = targetText.toLowerCase();
  const rawQuery = query.toLowerCase().trim();

  // Direct substring check
  if (rawTarget.includes(rawQuery)) return true;

  // Normalized check
  const normTarget = normalizeGeorgianText(targetText);
  const normQuery = normalizeGeorgianText(query);

  if (normTarget.includes(normQuery)) return true;

  // Word-by-word tokenized matching (all search tokens must match target)
  const tokens = normQuery.split(' ').filter(Boolean);
  if (tokens.length > 1) {
    return tokens.every((token) => normTarget.includes(token) || rawTarget.includes(token));
  }

  return false;
};
