export function isString(it: unknown): it is string {
  return typeof it === 'string';
}

export function isNumber(it: unknown): it is number {
  return typeof it === 'number';
}

export const isValidNumber = (a: unknown): a is number => {
  return isNumber(a) && !Number.isNaN(Number(a)) && Math.abs(a) !== Infinity;
};

export function isObject(it: unknown): it is object {
  return typeof it === 'object';
}

export function isBoolean(it: unknown): it is boolean {
  return typeof it === 'boolean';
}
