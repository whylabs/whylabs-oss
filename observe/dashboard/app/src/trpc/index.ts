import admin from './admin';
import analysis from './analysis';
import dashboard from './dashboard';
import meta from './meta';
import metrics from './metrics';
import monitoring from './monitoring';
import { router } from './trpc';

export const appRouter = router({
  admin,
  analysis,
  dashboard,
  meta,
  metrics,
  monitoring,
});

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;
