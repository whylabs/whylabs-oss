import LRU from 'lru-cache';

import { config, isDebugMode, isProdMode } from '../../config';
import { secretsManager } from '../../providers/aws';
import { getLogger } from '../../providers/logger';
import { fnThrow } from '../../util/misc';

const logger = getLogger('SecretService');

const secretsCache = new LRU({
  max: 100,
  ttl: 5 * 60 * 1000, // 5 minutes
});

const getStandardSecretPrefix = (): string => {
  // Returning development to allow testing with local build
  if (isProdMode() || isDebugMode()) return 'production/dashbird';
  return 'development/dashbird';
};

export enum SecretType {
  Feedback,
  SecureForm,
  Testing,
  Auth0,
}

// Maps secret type to its schema
type SecretTypes = {
  [SecretType.Feedback]: SlackWebhookSecret;
  [SecretType.Testing]: TestingSecret;
  [SecretType.SecureForm]: SlackWebhookSecret;
  [SecretType.Auth0]: Auth0Secret;
};

// Maps secret types to their secret manager ids
const secretConfigMap: { [key in SecretType]: string | undefined } = {
  [SecretType.Feedback]: config.feedbackSecretId,
  [SecretType.SecureForm]: `${getStandardSecretPrefix()}/llm-secure-form`,
  [SecretType.Testing]: 'development/dashbird/testing',
  [SecretType.Auth0]: `${getStandardSecretPrefix()}/auth0-secrets`,
};

interface TestingSecret {
  // secrets used in testing and only available in development
  readonly dashbirdIntTestPassword: string;
  readonly bypassKey: string;
  readonly bypassUserId: string;
}

interface SlackWebhookSecret {
  readonly webhook?: string;
}

interface Auth0Secret {
  sessionSecret: string;
  loginDomain: string;
  clientSecret: string;
  mgmtDomain: string; // can be different from auth/login domain
  clientId: string;
}

// Could not find an export for this in aws sdk v3
interface AWSGetSecretValueResponse {
  ARN?: string | undefined;
  Name?: string | undefined;
  SecretString?: string | undefined;
  SecretBinary?: Uint8Array | undefined;
}

/**
 * Fetches a secret from AWS SecretsManager. Secrets are cached for a few minutes.
 * @param secretType Cache key to use
 */
export const retrieveSecretManagerSecret = async <T extends SecretType>(
  secretType: T,
): Promise<SecretTypes[T] | null> => {
  const secretId: string | undefined = secretConfigMap[secretType];
  if (!secretId)
    throw new Error(
      `Secret of type ${secretType} does not map to a secret name or id. Mapping not specified or no secret id passed in config/env vars.`,
    );

  let secret = secretsCache.get(secretType) as Promise<AWSGetSecretValueResponse>;
  if (!secret) {
    logger.debug('Caching and returning secret for secret id %s', secretId);
    secret = secretsManager.getSecretValue({ SecretId: secretId });
    secretsCache.set(secretType, secret);
  } else {
    logger.debug('Returning cached secret for secret id %s', secretId);
  }

  try {
    const result = await secret;
    return (
      (result?.SecretString ? (JSON.parse(result.SecretString) as SecretTypes[T]) : null) ??
      fnThrow(`Empty secret ${secretId} of type ${SecretType[secretType]}`)
    );
  } catch (err) {
    logger.error('Failed to load or parse secret %s of type %s', secretId, SecretType[secretType]);
    return null;
  }
};
