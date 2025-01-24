import { TRPCClientError } from '@trpc/client';
import { PageContentWrapper } from '~/components/page-padding-wrapper/PageContentWrapper';
import { DASHBIRD_URI } from '~/utils/constants';
import { JSX, useEffect } from 'react';
import { useRouteError } from 'react-router-dom';

import { WhyLabsButton, WhyLabsLoadingOverlay } from './components/design-system';
import { forceRedirectToOrigin } from './utils/oldStackUtils';

type ErrorType = 'SERVER_ERROR' | 'UNAUTHORIZED' | 'UNKNOWN';

export const ErrorPage = (): JSX.Element => {
  const error = useRouteError();

  const errorType: ErrorType = identifyErrorType();
  const isServerError = errorType === 'SERVER_ERROR';
  const isUnauthorizedError = errorType === 'UNAUTHORIZED';

  useEffect(() => {
    if (isUnauthorizedError) {
      // While dependent on ui-exp project we can't use the router here
      window.location.href = `${DASHBIRD_URI}/login?redirectUri=${encodeURIComponent(window.location.href)}`;
    }
  }, [isUnauthorizedError]);

  if (isUnauthorizedError) return <WhyLabsLoadingOverlay visible />;
  return (
    <PageContentWrapper>
      <header>
        <h1>{isServerError ? 'Sorry, an unhandled error occurred' : '404 - Page not found'}</h1>
      </header>
      <main>
        <WhyLabsButton onClick={goToHomeButtonClick} variant="filled">
          Go to home
        </WhyLabsButton>
        {isServerError ? (
          <p>An unhandled server error occurred and our team will be notified to fix it asap.</p>
        ) : (
          <>
            <p>Sorry, an unexpected error has occurred.</p>
            <pre>{JSON.stringify(error)}</pre>
          </>
        )}
      </main>
    </PageContentWrapper>
  );

  function identifyErrorType(): ErrorType {
    if (error instanceof TRPCClientError) {
      if (isTRPCUnauthorizedError(error.data)) {
        return 'UNAUTHORIZED';
      }
      return 'SERVER_ERROR';
    }

    return 'UNKNOWN';
  }

  function goToHomeButtonClick() {
    forceRedirectToOrigin();
  }
};

function isTRPCUnauthorizedError(data: Record<string, unknown>): data is {
  code: string;
  httpStatus: number;
} {
  if (data?.httpStatus && typeof data.httpStatus === 'number' && data?.code && typeof data.code === 'string') {
    return data.httpStatus === 401 && data.code === 'UNAUTHORIZED';
  }

  return false;
}
