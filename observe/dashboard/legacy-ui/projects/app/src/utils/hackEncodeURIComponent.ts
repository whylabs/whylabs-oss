/**
 * This function is necessary because of a known bug in React Router 5, where
 * it cannot properly encode the % character using encodeURIComponent.
 *
 * The RR5 behavior automatically un-encodes the value, so %25 -> % in the URI,
 * causing a failure when you decodeURIComponent on the other end.
 *
 * Double-encoding works in this case because the second encoding encodes all the
 * % signs that are created by the first encoding, causing % -> %25, then exploiting
 * the bug to turn it back into %. This is a no-op for most encodings, but what it does
 * to a % sign is: % -> %25 -> %2525 -> (bug happens) -> %25, which is the correct encoding.
 *
 * TODO: this function must be removed when we move to a router system /version that doesn't have
 * a horrible bug.
 */
export function hackEncodeURIComponent(uriComponent: string | number | boolean): string {
  if (typeof uriComponent === 'number' || typeof uriComponent === 'boolean') {
    return encodeURIComponent(uriComponent);
  }
  // Here we handle the common case, for strings
  if (uriComponent.includes('%')) {
    return encodeURIComponent(encodeURIComponent(uriComponent));
  }
  return encodeURIComponent(uriComponent);
}
