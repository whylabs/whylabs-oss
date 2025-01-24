export function encodeObject<T extends Record<string, unknown>>(obj: T) {
  return encodeURIComponent(JSON.stringify(obj));
}

export function decodeObject<T extends Record<string, unknown>>(str: string) {
  return JSON.parse(decodeURIComponent(str)) as T;
}
