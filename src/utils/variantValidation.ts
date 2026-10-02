import { getAllRegistryItems, isValidRegistryId } from '../data/registry';

export const getValidVariantIds = (): Set<string> => {
  const registry = getAllRegistryItems();
  return new Set<string>(registry.keys());
};

export const filterValidVariants = <T extends Record<string, any>>(map: T): T => {
  if (!map || typeof map !== 'object') return {} as T;
  const result: Record<string, any> = {};
  for (const key in map) {
    if (isValidRegistryId(key)) {
      result[key] = map[key];
    }
  }
  return result as T;
};
