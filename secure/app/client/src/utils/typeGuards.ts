export function isString(it: unknown): it is string {
  return typeof it === 'string';
}

export function isNumber(it: unknown): it is number {
  return typeof it === 'number';
}

export function isObject(it: unknown): it is object {
  return typeof it === 'object';
}
