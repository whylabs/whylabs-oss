import { z } from 'zod';

/**
 * Attempts to parse a given message string to extract TRPC input validation errors.
 *
 * @param message - The message string to be parsed, expected to be in a specific format.
 * @returns An array of formatted validation error messages if parsing is successful, otherwise null.
 */
export const tryToGetTrpcInputValidationErrors = (message: string) => {
  const schema = z.array(
    z.object({
      message: z.string(),
      path: z.array(z.string()),
    }),
  );

  const parsedMessage = schema.safeParse(message);
  if (!parsedMessage.success) return [];

  return parsedMessage.data.map((e) => `Validation error for *${e.path.join('-')}*: ${e.message}`);
};
