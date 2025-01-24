import userAgentParser from 'ua-parser-js';

type BrowserFingerprint = {
  hash: string; // hash of the entire UserAgent string + IP address
  ipAddress: string;
  parsedUA: userAgentParser.IResult;
};

export type WhyLabsSession = {
  /**
   * Information about the user's machine and browser from when the session was initially established (during login)
   * Used to validate subsequent requests for any changes, so we can initiate a re-authentication flow if we suspect any shenanigans.
   */
  initialFingerprint: BrowserFingerprint;
  sessionId: string;
};
