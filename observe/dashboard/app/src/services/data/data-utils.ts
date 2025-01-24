import { Serializable } from 'child_process';

import DataLoader from 'dataloader';

import { DATA_SOURCE_BATCH_WINDOW_MS } from '../../constants';
import { SetType, fnThrow } from '../../util/misc';

type SerializableValue = null | number | string | boolean;

type SerializableCollection<T> = Array<T>; // note - Sets are not serializable as JSON strings in JavaScript by default

/**
 * An object composed strictly of primitive JSON-serializable values or arrays, and string keys.
 * Node's default `Serializable` type is too lax because it includes the arbitrary `object` type, which is essentially anything,
 * including objects with circular or other non-serializable properties.
 */
export type SerializableObject = {
  [key in string]:
    | SerializableObject
    | SerializableValue
    | SerializableCollection<SerializableObject>
    | SerializableCollection<SerializableValue>;
};

/**
 * Represents an external data request (to a database or service) where many such requests can be grouped into a single external query.
 * These queries will be grouped on JSON serialized `key`, whereas `params` will be combined and passed to the one outgoing query for the `key`.
 */
export type BatchableRequest<TKey extends SerializableObject, TParams> = {
  // Key properties on which to group requests. One key = one query. Anything security-related (like orgId), should go in here
  // Must be JSON-serializable
  key: TKey;
  // Params portion of the request. These will be batched together for dispatch as a single query (e.g. featureName -> featureNames[])
  params: TParams;
};

/**
 * A helper method to make interacting with DataLoader less painful.
 * You pass it an array of requests, and it will group them by key, collect all the params with the same key into an array,
 * process the batch, and then filter it given the provided filter to make the results line up with the initial batch of requests
 * Note: consider using the `createDataLoader` helper within datasources instead, which offers an even higher level abstraction for the batching/filtering logic
 * @param requests Requests that should be aggregated on their key property and batched on params
 * @param processor A function (generally a DB call) that will take in the key and a list of params and return the results
 * @param filter A function that given the results for each key and batched params[] can filter out the data for a given param value, associated with the initial request
 */
export const batchProcessRequests = async <TKey extends SerializableObject, TParam, TResult, TIntermediateResult>(
  requests: readonly BatchableRequest<TKey, TParam>[],
  processor: (key: TKey, paramArray: TParam[]) => Promise<TIntermediateResult | null>,
  filter: (param: TParam, possibleResult: TIntermediateResult | null) => TResult,
): Promise<TResult[]> => {
  // group incoming batchable requests by the groupable properties (the key)
  const groupedReqs = new Map<string, { params: TParam[]; results: TIntermediateResult | null }>();
  for (const req of requests) {
    const idx = JSON.stringify(req.key);
    const reqs = groupedReqs.get(idx) ?? { params: [], results: null };
    reqs.params.push(req.params);
    groupedReqs.set(idx, reqs);
  }

  // for every key and its collected parameters, get the results
  await Promise.all(
    [...groupedReqs.keys()].map(async (key) => {
      const parsedKey: TKey = JSON.parse(key);
      const reqs = groupedReqs.get(key) ?? fnThrow(`Could not find requests for key ${key}`);
      reqs.results = await processor(parsedKey, reqs.params);
    }),
  );

  // map the requests back to their matching results by filtering the batched results
  return requests.map((req) => {
    const idx = JSON.stringify(req.key);
    const possibleResults = groupedReqs.get(idx)?.results ?? null;
    // m * n perf here due to filtering the results many times, but the number of requests should generally be small
    return filter(req.params, possibleResults);
  });
};

/**
 * Helper method for converting an array of sets of params into a single array of unique values of the specified field
 * @param params Array of batchable values we want to filter Druid results by
 * @param targetParamName Name of the property we are aggregating
 */
const convertParamsToArrayFilter = <
  TResult extends SetType<TParams[TKey]>,
  TKey extends keyof TParams,
  TParams extends Partial<Record<TKey, Set<unknown>>>,
>(
  params: TParams[],
  targetParamName: TKey,
): TResult[] => {
  if (
    // first check if we should even construct the set of params for the query
    // if any of the requests DON'T filter on the specified param, then return empty array to prevent Druid
    // from filtering by this param
    params.some((p) => !p[targetParamName]?.size)
  ) {
    return [];
  }

  // create a set of all the sets of the params we're interested in, convert it to an array for passing to the query engine
  return Array.from(new Set(params.flatMap((p) => Array.from(p[targetParamName] as Set<TResult>))));
};

/**
 * Helper method for converting array of request parameters, where each item comes with a set of values to filter by
 * into separate arrays of unique values for each parameter name
 * @param params
 * @param targets
 */
export const paramSetsToArrays = <TParams extends Partial<Record<TKey, Set<unknown>>>, TKey extends keyof TParams>(
  params: TParams[],
  targets: TKey[],
): { [key in keyof Required<TParams>]: SetType<TParams[key]>[] } => {
  const res = {} as { [key in keyof Required<TParams>]: SetType<TParams[key]>[] };
  for (const target of targets) {
    res[target] = convertParamsToArrayFilter(params, target);
  }
  return res;
};

/**
 * Creates a cache key for the incoming request, so that subsequent requests with the same key can re-use existing response promises instead of generating additional network requests
 * @param request
 */
export const cacheKeyFn = (request: Serializable): string =>
  `${JSON.stringify(
    request,
    (_, value) => {
      // JS doesn't properly stringify Sets by default, so we need this hacky fix
      return value instanceof Set ? [...value] : value;
    },
    0,
  )}`;

/**
 * Helper function to generate the DataLoader to be used with the given API request handler.
 * NOTE: DataLoaders must not be re-used between requests! They should be created on a per-request basis.
 * @param requestHandler Function to run for each batched request
 * @param filterFn Function to run on the results of the batch request, to find the results corresponding to each individual request
 */
export const createDataLoader = <TRequestKey extends SerializableObject, TRequestParam, TIntermediateResult, TResult>(
  requestHandler: (key: TRequestKey, params: TRequestParam[]) => Promise<TIntermediateResult | null>,
  filterFn: (param: TRequestParam, possibleResult: TIntermediateResult | null) => TResult,
): DataLoader<BatchableRequest<TRequestKey, TRequestParam>, TResult> =>
  new DataLoader<BatchableRequest<TRequestKey, TRequestParam>, TResult, string>(
    (reqs) => batchProcessRequests(reqs, requestHandler, filterFn),
    {
      cacheKeyFn,
      batchScheduleFn: (cb) => setTimeout(cb, DATA_SOURCE_BATCH_WINDOW_MS),
    },
  );
