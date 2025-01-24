import { ApolloServerPlugin, BaseContext } from '@apollo/server';
import type { DataSource } from 'apollo-datasource';

type DataSources = Record<string, DataSource>;
export type DataSourcesFn = () => DataSources;

export interface ContextWithDataSources extends BaseContext {
  dataSources?: DataSources;
}

export const ApolloDataSources = (options: {
  dataSources: DataSourcesFn;
}): ApolloServerPlugin<ContextWithDataSources> => ({
  requestDidStart: async (requestContext) => {
    const dataSources = options.dataSources();
    const initializers = Object.values(dataSources).map(async (dataSource) => {
      if (dataSource.initialize)
        dataSource.initialize({
          cache: requestContext.cache,
          context: requestContext.contextValue,
        });
    });

    await Promise.all(initializers);

    requestContext.contextValue.dataSources = dataSources;
  },
});
