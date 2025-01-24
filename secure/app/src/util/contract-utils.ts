export const invertMap = <K, V>(original: Map<K, V>): Map<V, K> =>
  new Map([...original].map((kvPair) => [kvPair[1], kvPair[0]]));

export const commaSeparatedToArray = (commaSeparated?: string, trim = true): string[] => {
  if (!commaSeparated) return []; // handle empty list as well as undefined
  const listOfString = commaSeparated.split(',');
  return trim ? listOfString.map((s) => s.trim()) : listOfString;
};

export const arrayToCommaSeparated = (stringArray?: string[], trim = true): string => {
  const maybeTrimmedStrings = (stringArray ?? []).map((s) => (trim ? s.trim() : s));
  return maybeTrimmedStrings.join(',');
};
