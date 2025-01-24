import { OrgBasicExecDashData } from 'pages/resource-overview-page/dashboards/executive-dashboard/hooks/useGetResourcesBasicData';
import { GetResourceModelTypeQueryResult, ModelType } from 'generated/graphql';
import { atom } from 'recoil';

type QueriesCache = {
  execDash?: OrgBasicExecDashData['data'];
  modelTypeData?: GetResourceModelTypeQueryResult['data'];
};
type ResolversCache = {
  resourceId?: string;
  cache?: QueriesCache;
  loading?: boolean;
};
export const resolversCachedData = atom<ResolversCache>({
  key: 'RoutesResolversCachedData',
  default: {},
});

export const CONSTRAINTS_SUPPORTED_RESOURCE_TYPE: ModelType[] = [
  ModelType.Unknown,
  ModelType.Classification,
  ModelType.Regression,
  ModelType.Embeddings,
  ModelType.ModelOther,
];
