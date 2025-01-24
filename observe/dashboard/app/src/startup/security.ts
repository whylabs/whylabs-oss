/* eslint-disable max-lines */
import crypto from 'crypto';
import { IncomingMessage, ServerResponse } from 'http';

import bodyParser from 'body-parser';
import cookie from 'cookie-parser';
import cors from 'cors';
import { Request, Response } from 'express';
import { ConfigParams, auth } from 'express-openid-connect';
import helmet, { HelmetOptions } from 'helmet';

import { config, isDebugMode, isLocalMode, isProdMode } from '../config';
import { AWS_MARKETPLACE_HEADER_TOKEN_NAME, SESSION_TOKEN_QUERY, WHYLABS_SESSION_COOKIE_NAME } from '../constants';
import { extractAuth0ImpersonationContext, extractAuth0UserContext } from '../middleware/auth0-context';
import { checkJwt } from '../middleware/jwt';
import { WhyLabsSession, getBrowserFingerprint, whyLabsSessionValidator } from '../middleware/whylabs-sessions';
import { revokeUserSession } from '../services/data/songbird/api-wrappers/security';
import { SecretType, retrieveSecretManagerSecret } from '../services/security/secrets';
import { DashboardStartupFunc, DashboardStartupOptions } from './types';

export const getCorsSettings = (opts: DashboardStartupOptions): cors.CorsOptions => {
  // when running in development mode, allow front end address as well
  const allowedOrigins = isProdMode()
    ? opts.serviceUrl
    : ['http://localhost:3000', 'http://localhost:3030', opts.serviceUrl];
  return {
    origin: allowedOrigins,
    methods: ['POST', 'OPTIONS', 'GET'],
    credentials: !isProdMode(),
  };
};

const nonceDirective = (_: IncomingMessage, res: ServerResponse): string => {
  return `'nonce-${(res as Response).locals.cspNonce}'`;
};

export const setupSecurity: DashboardStartupFunc<void> = async (app, logger, opts) => {
  logger.info('Setting up security');

  // add CSP nonce to response
  app.use((req, res, next) => {
    res.locals.cspNonce = crypto.randomBytes(16).toString('hex');
    next();
  });

  const { pendoSubId } = config.analytics;

  // local dev websocket for remix development locally
  const localDevSocket = config.stage === 'local' ? 'ws://localhost:8002' : '';

  const baseStyleSrc = [
    "'self'", //
    'https://fonts.googleapis.com', // fonts
    'https://app.pendo.io', // Pendo
    'https://cdn.pendo.io', // Pendo
    `https://pendo-static-${pendoSubId}.storage.googleapis.com`, // Pendo
    'https://js.stripe.com', // Stripe - payments processing
    "'sha256-wkY2X5hecQzbhnFCqvTpwrUJ1f4X8LH5WFjYUzv1wmU='", // Plotlly
    "'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='", // Plotlly
    localDevSocket,
  ];
  const cspDirectives = {
    'default-src': ["'self'"],
    'connect-src': [
      "'self'",
      'https://www.google-analytics.com', // GA
      'https://ampcid.google.com', // GA
      'https://analytics.google.com', // GA
      'https://stats.g.doubleclick.net/j/collect', // GA
      'https://heapanalytics.com', // heap
      'https://r.lr-ingest.io', // LogRocket
      'https://r.logr-ingest.io', // LogRocket
      'https://r.logr-ingest.com', // LogRocket
      'https://r.ingest-lr.com', // LogRocket
      'https://data.pendo.io', // Pendo
      `https://pendo-static-${pendoSubId}.storage.googleapis.com`, // Pendo
      'https://api.hsforms.com', // HubSpot forms
      localDevSocket,
    ],
    'script-src': [
      nonceDirective,
      "'strict-dynamic'",
      'https://cdn.heapanalytics.com', // heap
      'https://www.googletagmanager.com', // GA
      'https://www.google-analytics.com', // GA
      'https://analytics.google.com', // GA
      'https://ssl.google-analytics.com', // GA
      'https://cdn.lr-ingest.io', // LogRocket
      'https://cdn.logr-ingest.io', // LogRocket
      'https://cdn.ingest-lr.com', // LogRocket
      'https://cdn.jsdelivr.net', // GraphQL playground
      'https://pendo-io-static.storage.googleapis.com', // Pendo
      'https://cdn.pendo.io', // Pendo
      `https://pendo-static-${pendoSubId}.storage.googleapis.com`, // Pendo
      'https://data.pendo.io', // Pendo
      `${opts.serviceUrl}`,
    ],
    'object-src': "'none'",
    'base-uri': "'none'",
    'img-src': [
      "'self'",
      'data:',
      'https://www.google-analytics.com', // GA
      'https://analytics.google.com', // GA
      'https://www.googletagmanager.com', // GA
      'https://www.google.com/ads/ga-audiences', // GA
      'https://stats.g.doubleclick.net/r/collect', // GA
      'https://cdn.heapanalytics.com', // heap
      'https://heapanalytics.com', // heap
      'https://cdn.pendo.io', // Pendo
      'https://app.pendo.io', // Pendo
      `https://pendo-static-${pendoSubId}.storage.googleapis.com`, // Pendo
      'https://data.pendo.io', // Pendo,
      'https://colab.research.google.com', // Google Colab
    ],
    'style-src': [
      ...baseStyleSrc, //
      "'unsafe-hashes'",
      "'unsafe-inline'",
    ],
    'font-src': [
      "'self'",
      'https://fonts.gstatic.com', // fonts
    ],
    'frame-src': [
      "'self'",
      'https://docs.whylabs.ai',
      'https://www.youtube.com', // youtube for educational videos and such
      'https://app.pendo.io', // Pendo
      'https://js.stripe.com', // Stripe - payments processing
    ],
    'frame-ancestors': ["'self'"],
  };
  /**
   * Set CSP headers. See here for more info:
   * https://whylabs.atlassian.net/wiki/spaces/EN/pages/366706689/Dashbird+Service+SOP#Content-Security-Policy-(CSP)
   *
   * NOTE: even though some libraries/tools might say they require the following directives, they should not be set,
   * because they're both unsafe and will result in us failing pentests. Try to find alternatives:
   * unsafe-inline, unsafe-eval
   *
   * For Google Analytics policies, see: https://csplite.com/csp/test31/
   * For Heap policies, see: https://developers.heap.io/docs/web#content-security-policy-csp
   */
  const cspReportingRule = helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      reportOnly: true,
      directives: {
        ...cspDirectives, // make sure we copy the rest of the directives or CSP reporting gets noisy
        'style-src': [
          ...baseStyleSrc, //
          nonceDirective,
        ],
        'report-uri': config.ddCspReportingUrl,
        upgradeInsecureRequests: null, // it is ignored when report-only is enabled
      },
    },
  });
  app.use(cspReportingRule);
  app.use(cookie());
  app.use(bodyParser.urlencoded({ extended: true }));

  // special CSP policy just for GraphQL playground in local mode
  if (isLocalMode() || isDebugMode()) {
    logger.warn('Setting unsafe CSP header for /graphql endpoint');
    const playgroundCSP: HelmetOptions = {
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          'default-src': ['*', "'unsafe-inline'"],
          'script-src': [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            // this is the equivalent for sandbox, when we move to it, but it was giving cors issues that may be plugin issue,
            'https://embeddable-sandbox.cdn.apollographql.com',
            'https://apollo-server-landing-page.cdn.apollographql.com',
            'https://sandbox.embed.apollographql.com/',
            // 'http://cdn.jsdelivr.net', // GraphQL playground
            'blob:',
            'data:',
          ],
          'object-src': "'none'",
          'base-uri': "'none'",
          'img-src': ['*', "'unsafe-inline'", 'data:'],
        },
      },
    };
    app.get('/graphql', helmet(playgroundCSP));
  }

  const auth0Secret = await retrieveSecretManagerSecret(SecretType.Auth0);
  if (!auth0Secret) {
    throw Error('Failed to retrieve Auth0 secret');
  }

  const authConfig: ConfigParams = {
    auth0Logout: true,
    // We don't require auth because we only have a single /graphql endpoint and we handle auth-z in the application layer.
    authRequired: false,
    secret: auth0Secret?.sessionSecret,
    session: {
      name: WHYLABS_SESSION_COOKIE_NAME,
      rolling: false,
      absoluteDuration: 24 * 60 * 60, // 1 day - user MUST log in at least this often
      cookie: {
        httpOnly: !isLocalMode(),
        sameSite: 'Strict',
        secure: !isLocalMode(),
        domain: new URL(opts.serviceUrl).hostname,
      },
    },
    baseURL: opts.serviceUrl,
    clientID: auth0Secret.clientId,
    clientSecret: auth0Secret.clientSecret,
    issuerBaseURL: `https://${auth0Secret.loginDomain}`,
    errorOnRequiredAuth: true,
    routes: {
      login: false,
      logout: false,
    },
    afterCallback: (req, res, session): WhyLabsSession => {
      const initialFingerprint = getBrowserFingerprint(req);
      const sessionId = crypto.randomUUID();
      return {
        ...session,
        initialFingerprint,
        sessionId,
      };
    },
  };

  const corsOptions = getCorsSettings(opts);

  // the order in which the middleware is applied here is super important for resolving the request context correctly
  app.use(auth(authConfig));
  app.use(whyLabsSessionValidator());
  app.use(checkJwt(auth0Secret.loginDomain));
  app.use(extractAuth0UserContext());
  app.use(extractAuth0ImpersonationContext());
  app.use(cors(corsOptions));

  const handleSessionClaimLogin = async (req: Request, res: Response, sessionToken: string | string[]) => {
    logger.debug(`Moving ${SESSION_TOKEN_QUERY} query var to cookie.`);
    const expiration = new Date();
    expiration.setMinutes(expiration.getMinutes() + 10);
    res.cookie(SESSION_TOKEN_QUERY, sessionToken, { expires: expiration });
    return handleLoginLogout(req, res, 'signup');
  };

  const handleAwsMarketplaceLogin = async (req: Request, res: Response, customerToken?: string | string[]) => {
    if (!customerToken) {
      // TODO This is unlikely to happen but we may need to augment this with a redirect to a dedicated
      // error page on the front end.
      res.status(400).send(`Missing customer token in aws marketplace signup.`);
      return;
    }

    logger.info(`Moving ${AWS_MARKETPLACE_HEADER_TOKEN_NAME} header to cookie.`);
    const expiration = new Date();
    expiration.setMinutes(expiration.getMinutes() + 10);
    res.cookie(AWS_MARKETPLACE_HEADER_TOKEN_NAME, customerToken, { expires: expiration });
    return handleLoginLogout(req, res, 'signup');
  };

  const handleLoginLogout = async (
    req: Request,
    res: Response,
    operation: 'login' | 'logout' | 'signup',
  ): Promise<void> => {
    try {
      const { redirectUri, login_hint, skip_prompt } = req.query;

      if (login_hint !== undefined && typeof login_hint !== 'string') {
        throw Error('Invalid login_hint param');
      }
      if (skip_prompt !== undefined && typeof skip_prompt !== 'string') {
        throw Error('Invalid skip_prompt param');
      }

      const returnTo = redirectUri ? decodeURI(redirectUri as string) : opts.frontEndUrl;

      // allowed to redirect to http*://our.site.com/some/path or http*//our.site.com
      const allowedUrls = [opts.serviceUrl, opts.frontEndUrl, 'https://whylabs.ai'];

      if (
        !isLocalMode() &&
        !allowedUrls.some((url) => returnTo.startsWith(`${url}/`)) &&
        !allowedUrls.some((url) => url === returnTo)
      ) {
        throw Error(`Attempted to redirect to an unknown URL ${returnTo}. Aborting ${operation} process`);
      }
      const { sessionId } = req[WHYLABS_SESSION_COOKIE_NAME] ?? {};

      switch (operation) {
        case 'login': {
          /**
           * Set 'prompt' to undefined if we intend to skip it.
           * Setting it to 'none' explicitly can result in a 'login_required' error from Auth0,
           * if silent login cannot be performed for whatever reason.
           *
           * Default to 'login' to prompt the user for their login info/preferred social account.
           */
          const prompt = skip_prompt === 'true' ? undefined : 'login';
          return res.oidc.login({
            returnTo,
            authorizationParams: { login_hint, prompt },
          });
        }
        case 'signup':
          return res.oidc.login({
            returnTo,
            /**
             * This needs to be picked up as config.extraParams.initialScreen
             * in Auth0 Lock (Classic universal login page).
             * https://auth0.com/docs/libraries/lock/lock-configuration#initialscreen-string-
             * On the New universal login page, we need to set screen_hint: https://community.auth0.com/t/how-do-i-redirect-users-directly-to-the-hosted-signup-page/42520
             */
            authorizationParams: {
              login_hint,
              initialScreen: 'signUp', // for Classic universal login
              prompt: 'login',
              screen_hint: 'signup', // for New universal login
            },
          });
        case 'logout':
          logger.info('Logging out of session %s', sessionId);
          if (sessionId) {
            revokeUserSession(sessionId).then(() => logger.debug('Revoked session %s', sessionId));
          }
          // logout redirects must be whitelisted in Auth0
          return res.oidc.logout({ returnTo });
        default:
          throw Error(`Unsupported auth operation ${operation}`);
      }
    } catch (err) {
      logger.error(err, 'Failure during login process');
      if (!res.headersSent) {
        res.sendStatus(400);
      }
    }
  };

  app.get('/signup', (req, res) => handleLoginLogout(req, res, 'signup'));

  app.get('/login', (req, res) => handleLoginLogout(req, res, 'login'));

  app.get('/logout', (req, res) => handleLoginLogout(req, res, 'logout'));

  app.get('/claim', (req, res) => {
    const sessionToken = req.query[SESSION_TOKEN_QUERY];
    if (typeof sessionToken !== 'string') {
      res.status(400).send(`Missing ${SESSION_TOKEN_QUERY} query var.`);
      return;
    }

    if (!sessionToken) {
      // TODO This is unlikely to happen but we may need to augment this with a redirect to a dedicated
      // error page on the front end.
      res.status(400).send(`Missing session token in signup.`);
      return;
    }

    return handleSessionClaimLogin(req, res, sessionToken);
  });

  const marketplaceSignupPath = '/signup/aws-marketplace';
  // Debugging endpoint to make it reasonable to actually call the marketplace signup url. They insist on
  // calling from marketplace as a POST with a header and hard coded URL which makes it difficult to test on
  // localhost in a browser.
  app.get(marketplaceSignupPath, (req, res) => {
    const customerToken = req.query[AWS_MARKETPLACE_HEADER_TOKEN_NAME];
    if (typeof customerToken !== 'string') {
      res.status(400).send(`Missing ${AWS_MARKETPLACE_HEADER_TOKEN_NAME} query var.`);
      return;
    }

    return handleAwsMarketplaceLogin(req, res, customerToken);
  });

  app.post(marketplaceSignupPath, (req, res) => {
    const customerToken = req.body[AWS_MARKETPLACE_HEADER_TOKEN_NAME];
    return handleAwsMarketplaceLogin(req, res, customerToken);
  });
};
