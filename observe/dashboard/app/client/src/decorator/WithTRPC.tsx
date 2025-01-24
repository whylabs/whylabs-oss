/* eslint-disable no-console */

import { QueryClient, QueryClientConfig, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { httpBatchLink } from '@trpc/client';
import { IS_TEST_ENV } from '~/utils/constants';
import { trpc } from '~/utils/trpc';
import { ReactNode, Suspense, lazy, useEffect, useState } from 'react';

type WithTRPCProps = {
  children: ReactNode;
};

const testOptions: QueryClientConfig = {
  defaultOptions: {
    queries: { retry: false },
  },
  logger: {
    // Suppress errors in test mode
    error: () => {
      // Do nothing
    },
    log: console.log,
    warn: console.warn,
  },
};

const ReactQueryDevtoolsProduction = lazy(() =>
  import('@tanstack/react-query-devtools/build/modern/production.js').then((d) => ({
    default: d.ReactQueryDevtools,
  })),
);

export const WithTRPC = ({ children }: WithTRPCProps) => {
  const [showDevtools, setShowDevtools] = useState(false);
  const [queryClient] = useState(() => new QueryClient(IS_TEST_ENV ? testOptions : undefined));
  useEffect(() => {
    // @ts-expect-error toggleDevtools is injected by tanstack devtools
    window.toggleDevtools = () => setShowDevtools((old) => !old);
  }, []);

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api',
          fetch: (url, options) => {
            return fetch(url, {
              ...options,
              credentials: 'include',
            }).then((response) => {
              if (response.status === 401 && !window.location.pathname.startsWith('/login')) {
                window.location.href = `${window.location.origin}/login`;
              }
              return response;
            });
          },
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
        {showDevtools && (
          <Suspense fallback={null}>
            <ReactQueryDevtoolsProduction initialIsOpen buttonPosition="bottom-left" />
          </Suspense>
        )}
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
};
