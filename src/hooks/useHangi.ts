import { useDailyRecord } from './useDailyRecord';

// The daily game's record („დღის ჰანგი“): students/{uid}.games.hangi.days for a member, the device for a guest.
// The shared mechanics live in useDailyRecord.ts (the same record serves „დღის სიტყვა“ and „ოთხეული“).
export const useHangi = () => useDailyRecord('hangi');
