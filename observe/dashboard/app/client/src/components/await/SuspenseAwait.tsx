import { AwaitProps, AwaitTypeSafe } from '~/utils/routeUtils';
import { JSX, ReactElement, Suspense } from 'react';

import { WhyLabsLoadingOverlay } from '../design-system';

type FallbackProp = {
  fallback?: ReactElement;
};
export const SuspenseAwait = <T,>({
  children,
  resolve,
  errorElement,
  fallback,
}: AwaitProps<T> & FallbackProp): JSX.Element => {
  return (
    <Suspense fallback={fallback ?? <WhyLabsLoadingOverlay visible />}>
      <AwaitTypeSafe resolve={resolve} errorElement={errorElement}>
        {children}
      </AwaitTypeSafe>
    </Suspense>
  );
};
