import qs from 'query-string';

export function removeKeys(keys: string[], queryString: string): string {
  const beginsWithQuestion = queryString.startsWith('?');
  const parsed = qs.parse(queryString, { arrayFormat: 'none', sort: false });
  keys.forEach((key) => {
    delete parsed[key];
  });
  const stringifiedKeys = qs.stringify(parsed, { arrayFormat: 'none', sort: false });
  return beginsWithQuestion && stringifiedKeys ? `?${stringifiedKeys}` : stringifiedKeys;
}

function mutateQueryString({
  targetKeys,
  keepTargetKeys,
  queryString,
}: {
  targetKeys: string[];
  keepTargetKeys: boolean;
  queryString: string;
}): string {
  const beginsWithQuestion = queryString.startsWith('?');
  const parsed = qs.parse(queryString, { arrayFormat: 'none', sort: false });
  Object.keys(parsed).forEach((key) => {
    if (keepTargetKeys && !targetKeys.includes(key)) {
      delete parsed[key];
    } else if (!keepTargetKeys && targetKeys.includes(key)) {
      delete parsed[key];
    }
  });
  const stringifiedKeys = qs.stringify(parsed, { arrayFormat: 'none', sort: false });
  return beginsWithQuestion && stringifiedKeys ? `?${stringifiedKeys}` : stringifiedKeys;
}

export function cleanupQueryString({ keysToKeep, queryString }: { keysToKeep: string[]; queryString: string }): string {
  return mutateQueryString({ targetKeys: keysToKeep, keepTargetKeys: true, queryString });
}

export function cherryPickQueryString({
  keysToRemove,
  queryString,
}: {
  keysToRemove: string[];
  queryString: string;
}): string {
  return mutateQueryString({ targetKeys: keysToRemove, keepTargetKeys: false, queryString });
}
