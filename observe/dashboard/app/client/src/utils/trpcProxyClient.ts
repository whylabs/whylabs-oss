import { createTRPCProxyClient, unstable_httpBatchStreamLink as httpBatchStreamLink } from '@trpc/client';
import type { AppRouter } from '@whylabs/dashboard/src/trpc';

export const trpcProxyClient = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchStreamLink({
      url: '/api',
      fetch: (url, options) => {
        return fetch(url, {
          ...options,
          credentials: 'include',
        });
      },
    }),
  ],
});
