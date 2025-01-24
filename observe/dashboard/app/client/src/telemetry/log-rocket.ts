import { CurrentUser } from '~/types/userTypes';
import { IS_DEV_ENV } from '~/utils/constants';
import LogRocket from 'logrocket';
import setupLogRocketReact from 'logrocket-react';

import { toTrackableUser } from './common';

export const initLogRocketSession = (user: CurrentUser): void => {
  const trackableUser = toTrackableUser(user);
  if (!trackableUser) {
    return;
  }

  LogRocket.identify(trackableUser.auth0Id, {
    orgId: trackableUser.organization.id,
    whyLabsUserId: trackableUser.whyLabsId ?? '',
    auth0UserId: trackableUser.auth0Id,
  });
};

export const initLogRocket = (): void => {
  if (IS_DEV_ENV) return;

  LogRocket.init('vebyvq/dashbird-ui', {
    shouldCaptureIP: false,
    console: {
      shouldAggregateConsoleErrors: true,
    },
    release: process.env.LOGROCKET_RELEASE,
    dom: {
      textSanitizer: true,
      inputSanitizer: true,
    },
    network: {
      // Drop the response bodies of all requests until we need to see them.
      responseSanitizer: (response) => {
        response.body = undefined;
        response.headers = {};
        return response;
      },
      requestSanitizer: (request) => {
        request.headers = {};
        request.credentials = undefined;
        return request;
      },
    },
  });
  setupLogRocketReact(LogRocket);

  window.addEventListener('unhandledrejection', (err) => {
    const error: Error = err.reason;
    LogRocket.captureException(error, {
      tags: {
        type: 'UncaughtPromise',
        exceptionName: error.name,
      },
    });
  });
};
