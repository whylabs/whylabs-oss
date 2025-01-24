import { RouterOutputs } from '~/utils/trpc';

export type TraceItem = RouterOutputs['meta']['llmTrace']['list']['list'][0];

export type TraceContent = TraceItem['contents'][0];
