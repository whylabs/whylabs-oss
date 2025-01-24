export function upperCaseFirstLetterOnly(text: string): string {
  return text.replace(/(^\w)(.*)/g, replaceFirstUpperCaseRestLowerCase);
}

export function upperCaseFirstLetterOfEachWord(text: string): string {
  return text.replace(/(^\w|\s\w)(\S*)/g, replaceFirstUpperCaseRestLowerCase);
}

function replaceFirstUpperCaseRestLowerCase(_: string, first: string, rest: string): string {
  return `${first.toUpperCase()}${rest.toLowerCase()}`;
}

// transform stringsLikeThis into STRINGS_LIKE_THIS
export const camelCaseToSnakeUpperCase = (text: string): string => {
  return text
    .replace(/[A-Z]/g, (letter) => {
      return `_${letter}`;
    })
    .toUpperCase();
};

export function isAllCaps(text: string): boolean {
  return text === text.toUpperCase();
}

export const handlePlural = (word: string, amount: number): string => {
  if (amount === 1) return word;
  return `${word}s`;
};

export const lowerCaseFirstLetterAndKeepRest = (text: string): string => {
  if (!text) return '';
  return text[0].toLowerCase() + text.slice(1);
};
