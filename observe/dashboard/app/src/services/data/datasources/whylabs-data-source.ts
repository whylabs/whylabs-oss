import { Serializable } from 'child_process';

import { DataSource, DataSourceConfig } from 'apollo-datasource';
import DataLoader from 'dataloader';
import LRU from 'lru-cache';
import pino from 'pino';

import { GraphQLContext } from '../../../graphql/context';
import { getLogger } from '../../../providers/logger';
import {
  CallOptions,
  WhyLabsCallContext,
  defaultCallOptions,
  runTimedActivityAsync,
  unknownContext,
  whylabsCxtFromGraphqlCxt,
} from '../../../util/async-helpers';
import { BatchableRequest, SerializableObject, cacheKeyFn, createDataLoader } from '../data-utils';

const CACHE_TTL_IN_MS = 600_000;

/**
 * Generic class for datasources
 */
export class WhyLabsDataSource extends DataSource<GraphQLContext> {
  /**
   * NOTE: in Apollo Server v4, Context is no longer available by default from inside data sources.
   * It's probably a bad idea to implement functionality here that relies on unlimited GraphQL Context access.
   * If needed, specific arguments can be passed into the constructor when the datasource is created for the request.
   * See https://www.apollographql.com/docs/apollo-server/data/fetching-data/#using-datasource-subclasses
   */
  callContext: WhyLabsCallContext;
  logger: pino.Logger;

  constructor() {
    super();
    this.callContext = unknownContext;
    this.logger = getLogger(this.constructor.name);
  }

  /**
   * Sets the call context.
   */
  initialize(config: DataSourceConfig<GraphQLContext>): void | Promise<void> {
    this.callContext = whylabsCxtFromGraphqlCxt(config.context);
  }

  /**
   * See notes in data-service-source
   * @private
   */
  private cache = new LRU({
    max: 500,
    ttl: CACHE_TTL_IN_MS,
  });

  /**
   * A function to generate the cache key for the given request object
   * @private
   */
  private cacheKey = cacheKeyFn;

  /**
   * Creates a getter to fetch the data via the specified handler. De-dupes requests via the datasource's cache if the request is already in progress
   * @private
   */
  protected get =
    <TRequest extends Serializable, TResult>(handler: (req: TRequest, options?: CallOptions) => Promise<TResult>) =>
    async (request: TRequest, options?: CallOptions): Promise<TResult> => {
      // create the cache key for this request
      const cacheKey = this.cacheKey(request);

      // if there's already a pending request for this key, just return it
      const cachedResult = this.cache.get(cacheKey);
      if (cachedResult) {
        return cachedResult as TResult;
      }

      // otherwise, create a new pending request and cache it
      const httpRequest = handler(request, {
        ...defaultCallOptions,
        context: this.callContext,
        ...options,
      });
      this.cache.set(cacheKey, httpRequest);
      return runTimedActivityAsync(
        this.logger,
        `${this.constructor.name}.${handler.name}`,
        this.callContext,
        async () => {
          try {
            return await httpRequest;
          } catch (err) {
            // Delete this from the cache or every subsequent request will inherit its failure status.
            // Hopefully the failure is transient.
            this.cache.delete(cacheKey);
            throw err;
          }
        },
      );
    };

  /**
   * Helper function to generate a data loader that logs data service requests.
   * @param requestHandler Function to run for each batched request
   * @param filterFn Function to run on the results of the batch request, to find the results corresponding to each individual request
   */
  protected createDataLoader = <TRequestKey extends SerializableObject, TRequestParam, TIntermediateResult, TResult>(
    requestHandler: (key: TRequestKey, params: TRequestParam[], options?: CallOptions) => Promise<TIntermediateResult>,
    filterFn: (param: TRequestParam, possibleResult: TIntermediateResult | null) => TResult,
  ): DataLoader<BatchableRequest<TRequestKey, TRequestParam>, TResult> => {
    const wrappedRequest = (
      key: TRequestKey,
      params: TRequestParam[],
      options?: CallOptions,
    ): Promise<TIntermediateResult> => {
      return runTimedActivityAsync(this.logger, `DataService.${requestHandler.name}`, this.callContext, async () => {
        return requestHandler(key, params, {
          ...defaultCallOptions,
          context: this.callContext,
          ...options,
        });
      });
    };
    return createDataLoader(wrappedRequest.bind(this), filterFn);
  };
}
