/**
 * Utility function to restrict the length of a string
 * @param input The string to be potentially shortened
 * @param maxChar The max length of the string before it will be shortened
 * @param useRawEllipsis True only if three periods '...' are desired instead of the unicode ellipsis
 * @returns The input string if it is not longer than the limit, else the first part of the string, followed
 * by an ellipsis.
 */
export function stringMax(input: string, maxChar = 24, useRawEllipsis = false): string {
  if (input.length <= maxChar || maxChar <= 0 || maxChar % 1 !== 0) {
    return input;
  }
  let stringPiece = input.slice(0, maxChar);
  if (stringPiece.endsWith('_')) {
    stringPiece = stringPiece.slice(0, -1);
  }
  return useRawEllipsis ? stringPiece.concat('...') : stringPiece.concat('\u2026');
}

export const nextAlphabetLetter = (current: string): string => {
  const currentIndex = alphabetIndexByLetter(current);
  return alphabetLetterByIndex(currentIndex + 1);
};

const alphabetLetterByIndex = (index: number): string => {
  return 'abcdefghijklmnopqrstuvwxyz'[index];
};

const alphabetIndexByLetter = (letter: string): number => {
  return 'abcdefghijklmnopqrstuvwxyz'.indexOf(letter);
};

export const parseJsonContent = (content: string | undefined): object | null => {
  if (!content) return null;
  try {
    const jsonObject = JSON.parse(content);
    return jsonObject as object;
  } catch (_) {
    return null;
  }
};

export const upperCaseFirstLetterAndKeepRest = (text: string): string => {
  if (!text) return '';
  return text[0].toUpperCase() + text.slice(1);
};

export const upperCaseFirstLetterOnly = (text: string): string => {
  return text.replace(/(^\w)(.*)/g, replacerFirstUpperCaseRestLowerCase);
};

export const upperCaseFirstLetterOfEachWord = (text: string): string => {
  return text.replace(/(^\w|\s\w)(\S*)/g, replacerFirstUpperCaseRestLowerCase);
};

const replacerFirstUpperCaseRestLowerCase = (_: string, first: string, rest: string): string => {
  return `${first.toUpperCase()}${rest.toLowerCase()}`;
};

export const handlePlural = (word: string, amount: number) => {
  if (amount === 1) return word;
  return `${word}s`;
};

export const validateEmail = (input: string): boolean => {
  const re =
    /^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@(([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{2,})$/;
  return re.test(String(input).toLowerCase());
};

export const getDomainFromEmail = (input?: string | null): string | null => {
  if (!input || !validateEmail(input)) return null;

  const atIndex = input.indexOf('@');
  const nextDotIndex = input.indexOf('.', atIndex);
  if (atIndex < 0 || nextDotIndex < atIndex || atIndex + 1 >= nextDotIndex) {
    // neither of these should be possible since we validate the email first.
    return null;
  }
  return input.substring(atIndex + 1, nextDotIndex).toLowerCase();
};
