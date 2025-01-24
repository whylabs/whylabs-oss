import { parse } from 'yaml';

export function safeParseYamlAsObject(yaml: string | undefined | null): Record<string, unknown> | null {
  try {
    if (!yaml) {
      return null;
    }
    const parsed = parse(yaml);
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch (e) {
    return null;
  }
}

export function findArrayInYaml(yaml: string, key: string): Record<string, unknown>[] | null {
  const parsed = safeParseYamlAsObject(yaml);
  if (!parsed) {
    return null;
  }
  const array = parsed[key];
  if (!Array.isArray(array) || array.some((item) => typeof item !== 'object')) {
    return null;
  }
  return array as Record<string, unknown>[];
}

export function findJsonifiedStringsInYamlArray(yaml: string, key: string, itemKey: string, prefix?: string): string[] {
  const array = findArrayInYaml(yaml, key);
  if (!array) {
    return [];
  }
  return array.flatMap((item) => {
    if (!item[itemKey]) {
      return [];
    }
    const foundItem = item[itemKey];
    if (typeof foundItem !== 'string') {
      return [];
    }
    const foundString = foundItem;
    const usedString = prefix && foundString.startsWith(prefix) ? foundString.slice(prefix.length) : foundString;
    return [usedString.replaceAll('_', '-')];
  });
}
