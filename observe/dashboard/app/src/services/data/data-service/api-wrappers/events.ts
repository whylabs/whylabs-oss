import {
  DebugEvent,
  QueryDebugEventsRequest,
  QueryDebugEventsRequestOrderByEnum,
} from '@whylabs/data-service-node-client';

import { gqlToSortOrder } from '../../../../graphql/contract-converters/data-service/misc-converter';
import { SortDirection } from '../../../../graphql/generated/graphql';
import { CallOptions, axiosCallConfig, tryCall } from '../../../../util/async-helpers';
import { dataServiceClient } from '../data-service-client-factory';

interface GetDebugEventsProps {
  datasetId: string;
  orgId: string;
  interval: string;
  traceId?: string;
  offset?: number;
  limit?: number;
  sortDirection?: SortDirection;
  sortBy?: QueryDebugEventsRequestOrderByEnum;
}

interface GetDebugEventsResponse {
  events: DebugEvent[];
  hasNextPage: boolean;
  nextOffset: number;
}

export const getDebugEvents = async (
  { datasetId, orgId, interval, traceId, sortDirection, offset, limit, sortBy }: GetDebugEventsProps,
  options?: CallOptions,
): Promise<GetDebugEventsResponse> => {
  const req: QueryDebugEventsRequest = {
    orgId,
    datasetId,
    interval,
    traceId,
    // @ts-expect-error - This TS error makes no sense, so I'll ignore it
    order: gqlToSortOrder(sortDirection),
    startOffset: offset,
    maxPageSize: limit,
    orderBy: sortBy,
  };
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  const result = await tryCall(() => client.debugEvent.queryV2(req, axiosCallConfig(options)), options);
  // datasetTimestamp shouldn't be optional
  type ValidDebugEvent = DebugEvent & {
    datasetTimestamp: number;
  };

  const events = result.data.events.filter((e): e is ValidDebugEvent => !!e.datasetTimestamp);

  return { events, hasNextPage: result.data?.isTruncated, nextOffset: result.data?.nextOffset };
};
