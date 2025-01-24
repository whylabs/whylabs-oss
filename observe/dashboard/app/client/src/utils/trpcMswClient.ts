import { AppRouter } from '~server/trpc';
import { createTRPCMsw } from 'msw-trpc';

export const trpcMsw = createTRPCMsw<AppRouter>({
  baseUrl: '/api',
});
