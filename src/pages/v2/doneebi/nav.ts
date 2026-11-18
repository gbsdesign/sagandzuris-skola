// „ოსტატობის გზა“'s two screens are steps of page `gz`, by the navigation's `mapItem`:
//   ostatoba~levels        the six levels (x-ai-sapekhurebi)
//   ostatoba~cert/<n>      the certificate of level n (x-ai-motsmoba)
export const LEVELS_ITEM = 'ostatoba~levels';
export const certItem = (n: number) => `ostatoba~cert/${n}`;
/** the level a `gz` mapItem asks the certificate of — null when it is not one */
export const certOf = (item: string | null | undefined): number | null => {
  const m = item?.match(/^ostatoba~cert\/(\d+)$/);
  return m ? Number(m[1]) : null;
};
