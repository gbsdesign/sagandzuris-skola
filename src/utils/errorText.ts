// One plain Georgian line for a failed save or load: Firebase's English messages and codes never reach the screen.
export const errorText = (e: unknown): string => {
  const code = String((e as { code?: unknown } | null)?.code || '');
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  if (offline || /unavailable|deadline-exceeded|network/.test(code)) return 'ინტერნეტი არ ჩანს — შეამოწმე და სცადე ისევ.';
  if (code.includes('permission-denied')) return 'ამის უფლება არ გაქვს.';
  if (code.includes('not-found')) return 'ჩანაწერი აღარ არსებობს.';
  if (code.includes('resource-exhausted')) return 'ახლა ძალიან ბევრი მოთხოვნაა — ცოტა ხანში სცადე.';
  return 'რაღაც შეფერხდა — სცადე ისევ.';
};
