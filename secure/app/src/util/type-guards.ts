export const isString = (it: unknown): it is string => {
  return typeof it === 'string';
};

export const isNumber = (it: unknown): it is number => {
  return typeof it === 'number';
};

export const isValidNumber = (a: unknown): a is number => {
  return isNumber(a) && !Number.isNaN(Number(a)) && Math.abs(a) !== Infinity;
};

export const isObject = (it: unknown): it is object => {
  return typeof it === 'object';
};
