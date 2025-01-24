import meta from './meta';
import monitoring from './monitoring';
import { router } from './trpc';

export const appRouter = router({
  meta,
  monitoring,
});

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;
