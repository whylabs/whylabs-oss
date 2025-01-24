import { PAGINATION_MAX_LIMIT } from '../constants';
import { PaginationLimitExceeded, ValidationError } from '../errors/dashbird-error';
import { isEmail } from './misc';

/**
 * Ensures the email address is valid-ishs
 * @param email The email address
 */
export const validateEmail = (email: string): void => {
  // Super simple validation, see here: https://davidcel.is/posts/stop-validating-email-addresses-with-regex/#just-send-them-an-email-already
  if (!isEmail(email)) {
    throw new ValidationError(`Email ${email} appears to be invalid.`);
  }
};

/**
 * Ensures that pagination limit param never exceeds maximum limit.
 */
export const validatePaginationLimit = (limit: number): void => {
  // TODO: check for unset (0) limit as well
  if (limit > PAGINATION_MAX_LIMIT) throw new PaginationLimitExceeded();
};
