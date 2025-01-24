import { useReducer, createContext } from 'react';
import { GetResourceDataQuery } from 'generated/graphql';

type Resource = GetResourceDataQuery['resource'];

export interface ResourceState {
  resource?: Resource;
}

function generateResourceState(): ResourceState {
  return {};
}

const ResourceContext = createContext<[ResourceState, React.Dispatch<{ resource?: Resource }>]>([
  generateResourceState(),
  () => {
    /**/
  },
]);

function resourceReducer(state: ResourceState, action: { resource?: Resource | null }): ResourceState {
  if (action.resource === null) {
    return { resource: undefined };
  }
  if (action.resource) {
    return { resource: { ...action.resource } };
  }
  return state;
}

const ResourceContextProvider = (props: { children: React.ReactNode }): JSX.Element => {
  const [ResourceState, resourceDispatch] = useReducer(resourceReducer, generateResourceState());
  const { children } = props;
  return <ResourceContext.Provider value={[ResourceState, resourceDispatch]}>{children}</ResourceContext.Provider>;
};

export { ResourceContext, ResourceContextProvider };
