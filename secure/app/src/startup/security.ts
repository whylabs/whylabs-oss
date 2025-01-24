/* eslint-disable max-lines */
import crypto from 'crypto';
import { IncomingMessage, ServerResponse } from 'http';

import bodyParser from 'body-parser';
import cookie from 'cookie-parser';
import cors from 'cors';
import { Response } from 'express';
import helmet from 'helmet';

import { config, isProdMode } from '../config';
import { DashboardStartupFunc, DashboardStartupOptions } from './types';

export const getCorsSettings = (opts: DashboardStartupOptions): cors.CorsOptions => {
  // when running in development mode, allow front end address as well
  const allowedOrigins = isProdMode() ? opts.serviceUrl : ['http://localhost:3030', opts.serviceUrl];
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

  // local dev websocket for remix development locally
  const localDevSocket = config.stage === 'local' ? 'ws://localhost:8002' : '';

  const baseStyleSrc = [
    "'self'", //
    'https://fonts.googleapis.com', // fonts
    'https://js.stripe.com', // Stripe - payments processing
    "'sha256-wkY2X5hecQzbhnFCqvTpwrUJ1f4X8LH5WFjYUzv1wmU='", // Plotlly
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
      'https://api.hsforms.com', // HubSpot forms
      localDevSocket,
    ],
    'script-src': [
      nonceDirective,
      "'strict-dynamic'",
      'https://www.googletagmanager.com', // GA
      'https://www.google-analytics.com', // GA
      'https://analytics.google.com', // GA
      'https://ssl.google-analytics.com', // GA
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
      'https://js.stripe.com', // Stripe - payments processing
    ],
    'frame-ancestors': ["'self'"],
  };
  /**
   * For Google Analytics policies, see: https://csplite.com/csp/test31/
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

  const corsOptions = getCorsSettings(opts);
  app.use(cors(corsOptions));
};
