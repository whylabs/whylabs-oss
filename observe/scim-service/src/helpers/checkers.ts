export const notNullish = <T>(obj: T | null | undefined): obj is T => obj !== null && obj !== undefined;
