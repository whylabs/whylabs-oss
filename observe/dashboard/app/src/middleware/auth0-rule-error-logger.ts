import { ErrorRequestHandler } from 'express';

import { getLogger } from '../providers/logger';

const ruleOrActionErrorTypes = ['unauthorized', 'access_denied'];
const logger = getLogger('auth0errorhandler');

type OAuthRuleError = {
  error: string;
  error_description: string;
};

const isOAuthRuleError = (body: unknown): body is OAuthRuleError => {
  if (!body) return false;

  const errorBody = body as OAuthRuleError;
  return ruleOrActionErrorTypes.includes(errorBody.error) && !!errorBody.error_description;
};

/**
 * Filters out Auth0 /callback errors that contain Auth0 Rule error codes, so that they can be surfaced to users.
 * If not handled, these will cause a nondescript 500.
 * https://auth0.com/docs/rules/raise-errors-from-rules
 */
export const handleAuth0RuleErrors = (): ErrorRequestHandler => (err, req, res, next) => {
  if (req.url === '/callback' && req.method === 'POST') {
    if (isOAuthRuleError(req.body)) {
      logger.warn(`Auth0 Rule error: ${req.body.error_description}`);
      res.status(401).send(`WhyLabs authentication error: ${req.body.error_description}`);
    } else if (err.name === 'BadRequestError') {
      // common issue on logout/login with multiple tabs
      logger.warn(`${err.message} - maybe due to logout in multiple tabs`);
      // this redirect is less obnoxious than leaving you with invalid state in the callback url
      return res.redirect('/');
    }
  } else {
    // will be handled in default error handler
    next(err);
  }
};
