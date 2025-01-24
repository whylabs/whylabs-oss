export function isString(it: unknown): it is string {
  return typeof it === 'string';
}

export function isNumber(it: unknown): it is number {
  return typeof it === 'number';
}

export function isValidNumber(a: unknown): a is number {
  return isNumber(a) && !Number.isNaN(Number(a)) && Math.abs(a) !== Infinity;
}
