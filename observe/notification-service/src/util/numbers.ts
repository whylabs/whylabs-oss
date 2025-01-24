// rounds the given number to 2 decimal places
export const round = (num: number): number => Math.round((num + Number.EPSILON) * 100) / 100;
