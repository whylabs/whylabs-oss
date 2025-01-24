import { createTRPCReact, inferReactQueryProcedureOptions } from '@trpc/react-query';
import { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '~server/trpc';

export const trpc = createTRPCReact<AppRouter>();

/**
 * Utility to infer types from TRPC router for React Query
 */
export type ReactQueryOptions = inferReactQueryProcedureOptions<AppRouter>;

/**
 * Utility to infer types from TRPC router input
 */
export type RouterInputs = inferRouterInputs<AppRouter>;

/**
 * Utility to infer types from TRPC router ouput
 */
export type RouterOutputs = inferRouterOutputs<AppRouter>;
