/**
 * Utility function to restrict the length of a string
 * @param input The string to be potentially shortened
 * @param maxChar The max length of the string before it will be shortened
 * @param useRawEllipsis True only if three periods '...' are desired instead of the unicode ellipsis
 * @returns The input string if it is not longer than the limit, else the first part of the string, followed
 * by an ellipsis.
 */
export function stringMax(input: string, maxChar = 24, useRawEllipsis = false): string {
  const safeInput = input.toString(); // sometimes a number is passed in
  if (safeInput.length <= maxChar || maxChar <= 0 || maxChar % 1 !== 0) {
    return safeInput;
  }
  let stringPiece = safeInput.slice(0, maxChar);
  if (stringPiece.endsWith('_')) {
    stringPiece = stringPiece.slice(0, -1);
  }
  return useRawEllipsis ? stringPiece.concat('...') : stringPiece.concat('\u2026');
}

export function validateEmail(input: string): boolean {
  const re =
    /^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@(([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{2,})$/;
  return re.test(String(input).toLowerCase());
}

export function getDomain(input: string): string | null {
  if (!validateEmail(input)) {
    return null;
  }
  const atIndex = input.indexOf('@');
  const nextDotIndex = input.indexOf('.', atIndex);
  if (atIndex < 0 || nextDotIndex < atIndex || atIndex + 1 >= nextDotIndex) {
    // neither of these should be possible since we validate the email first.
    return null;
  }
  return input.substring(atIndex + 1, nextDotIndex).toLowerCase();
}

export function getFullDomain(email?: string): string | null {
  return email?.split('@')?.pop() ?? null;
}
