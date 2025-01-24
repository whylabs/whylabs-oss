import {
  AnalysisApi,
  AnalysisAsyncApi,
  Configuration,
  CustomDashboardApi,
  DatasetsApi,
  DebugEventApi,
  EntitySchemaApi,
  MetricsApi,
  OrganizationApi,
  ProfileApi,
  TracesApi,
} from '@whylabs/data-service-node-client';
// This and the cast as below is an ugly workaround because the Api may pickup the wrong axios prior to this
import { AxiosInstance as OrigAxiosInstance } from 'axios';
import axios from 'axios-ds';

import { OpenAPIClientKind, getOpenAPIClientConfig } from '../openapi-client-factory';

const dataServiceClientConfig = getOpenAPIClientConfig(OpenAPIClientKind.DataService);

const getClient = (config: Configuration) => {
  const axiosInstance: OrigAxiosInstance = axios.create(config.baseOptions) as OrigAxiosInstance;

  return {
    analysis: new AnalysisApi(config, undefined, axiosInstance),
    analysisAsync: new AnalysisAsyncApi(config, undefined, axiosInstance),
    entities: new EntitySchemaApi(config, undefined, axiosInstance),
    debugEvent: new DebugEventApi(config, undefined, axiosInstance),
    datasetsApi: new DatasetsApi(config, undefined, axiosInstance),
    profiles: new ProfileApi(config, undefined, axiosInstance),
    traces: new TracesApi(config, undefined, axiosInstance),
    customDashboards: new CustomDashboardApi(config, undefined, axiosInstance),
    metrics: new MetricsApi(config, undefined, axiosInstance),
    organizationsApi: new OrganizationApi(config, undefined, axiosInstance),
    axios: axiosInstance,
  };
};

export type DataServiceClient = ReturnType<typeof getClient>;

export const dataServiceClient = getClient(dataServiceClientConfig);
