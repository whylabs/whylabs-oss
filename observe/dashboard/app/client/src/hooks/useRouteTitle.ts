import { RouteHandle, WhyLabsRouteMatch } from '~/types/routerTypes';
import { useMatches } from 'react-router-dom';

export const useRouteTitle = (): RouteHandle['title'] => {
  const matches = useMatches() as WhyLabsRouteMatch[];

  // We want to find the last matched route with a handle
  const match = matches.reverse().find(({ handle }) => !!handle?.title);
  return match?.handle?.title;
};
