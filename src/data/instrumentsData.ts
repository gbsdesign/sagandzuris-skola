export interface InstrumentItem {
  id: string;
  nameGe: string;
  /** false: not a Georgian folk instrument (e.g. the guitar) */
  folk?: boolean;
}

export const INSTRUMENTS_LIST: InstrumentItem[] = [
  { id: 'chonguri', nameGe: 'ჩონგური' },
  { id: 'fanduri', nameGe: 'ფანდური' },
  { id: 'doli', nameGe: 'დოლი' },
  { id: 'garmoni', nameGe: 'გარმონი' },
  { id: 'chuniri', nameGe: 'ჭუნირი' },
  { id: 'changi', nameGe: 'ჩანგი' },
  { id: 'salamuri', nameGe: 'სალამური' },
  { id: 'larchemi', nameGe: 'ლარჩემი' },
  { id: 'gitara', nameGe: 'გიტარა', folk: false },
];
