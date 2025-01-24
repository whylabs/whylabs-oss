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
