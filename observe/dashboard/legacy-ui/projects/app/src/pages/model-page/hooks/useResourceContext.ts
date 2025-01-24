import { useContext, useMemo } from 'react';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { logOrThrowError } from 'utils/logUtils';
import { useGetResourceDataQuery } from 'generated/graphql';
import { ResourceContext, ResourceState } from '../context/ResourceContext';

export type UseResourceContextReturnType = {
  resourceId: string;
  resourceState: ResourceState;
  loading: boolean;
};

export function useResourceContext(): UseResourceContextReturnType {
  const [resourceState, resourceDispatch] = useContext(ResourceContext);
  if (!resourceDispatch) {
    logOrThrowError('Cannot use context outside of provider');
  }
  const { modelId: resourceId } = usePageTypeWithParams();
  const shouldSkip = !!(resourceState.resource?.id && resourceId === resourceState.resource.id);
  const { data, loading } = useGetResourceDataQuery({ variables: { resourceId }, skip: shouldSkip });

  if (data?.resource?.id && data.resource?.id !== resourceState.resource?.id) {
    resourceDispatch({ resource: data.resource });
  } else if (!resourceId && resourceState.resource) {
    resourceDispatch({ resource: null });
  }
  const hasState = Object.keys(resourceState ?? {}).length > 0;

  return useMemo(
    () => ({ resourceId, resourceState: hasState ? resourceState : data ?? {}, loading }),
    [resourceId, hasState, resourceState, data, loading],
  );
}
