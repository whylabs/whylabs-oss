/* eslint-disable no-console */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { ReactNode, useState } from 'react';
import { IS_TEST_ENV } from '~/utils/constants';
import { trpc } from '~/utils/trpc';

type WithTRPCProps = {
  children: ReactNode;
};

const testOptions = {
  defaultOptions: {
    queries: { retry: false },
    logger: {
      // Suppress errors in test mode
      error: () => {
        // Do nothing
      },
      log: console.log,
      warn: console.warn,
    },
  },
};

export const WithTRPC = ({ children }: WithTRPCProps) => {
  const [queryClient] = useState(() => new QueryClient(IS_TEST_ENV ? testOptions : undefined));

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api',
          fetch: (url, options) => {
            return fetch(url, {
              ...options,
              credentials: 'include',
            });
          },
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
};
