import * as useResourceContextHook from '../useResourceContext';
import { ResourceState } from '../../context/ResourceContext';

export function mockUseResourceContext({
  resource,
  loading = false,
}: {
  resource?: ResourceState['resource'];
  loading?: boolean;
}): jest.SpyInstance {
  return jest.spyOn(useResourceContextHook, 'useResourceContext').mockImplementation(() => ({
    resourceId: 'test-resource-id',
    resourceState: { resource },
    loading,
  }));
}
