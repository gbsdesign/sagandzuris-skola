import { parseClass, parseStage, type ClassConf, type StageConf } from '../../../utils/gundi';
import { SONG_NUMS } from './songs';

// „ჩემი გუნდი“'s settings on the device: the stage's (`sg-gundi`) and the class's (`sg-gundi-klasi`), and the tab last used.

const load = (key: string): unknown => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
const save = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ } };

export const readStage = () => parseStage(load('sg-gundi'), SONG_NUMS);
export const saveStage = (c: StageConf) => save('sg-gundi', c);
export const readClass = () => parseClass(load('sg-gundi-klasi'), SONG_NUMS);
export const saveClass = (c: ClassConf) => save('sg-gundi-klasi', c);

export type GundiTab = 'stage' | 'class';
export const readTab = (): GundiTab => (load('sg-gundi-tab') === 'class' ? 'class' : 'stage');
export const saveTab = (t: GundiTab) => save('sg-gundi-tab', t);
