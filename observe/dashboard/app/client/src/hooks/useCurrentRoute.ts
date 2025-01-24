import { useRouteMatches } from './useRouteMatches';

export const useCurrentRoute = () => {
  const { currentRoute } = useRouteMatches();
  return currentRoute;
};
