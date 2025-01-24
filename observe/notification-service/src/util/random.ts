export const getRandomElement = <T>(arr: Array<T>): T => arr[Math.floor(Math.random() * arr.length)];

export const getRandomPercent = (): number => Math.floor(Math.random() * 100) + 1;
