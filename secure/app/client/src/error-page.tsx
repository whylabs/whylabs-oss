import { TRPCClientError } from '@trpc/client';
import { JSX } from 'react';
import { useNavigate, useRouteError } from 'react-router-dom';
import { PageContentWrapper } from '~/components/page-padding-wrapper/PageContentWrapper';

import { WhyLabsButton } from './components/design-system';

type ErrorType = 'SERVER_ERROR' | 'UNAUTHORIZED' | 'UNKNOWN';

export const ErrorPage = (): JSX.Element => {
  const error = useRouteError();
  const navigate = useNavigate();

  const errorType: ErrorType = identifyErrorType();
  const isServerError = errorType === 'SERVER_ERROR';

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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      if (isTRPCUnauthorizedError(error.data)) {
        return 'UNAUTHORIZED';
      }
      return 'SERVER_ERROR';
    }

    return 'UNKNOWN';
  }

  function goToHomeButtonClick() {
    navigate('/');
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
