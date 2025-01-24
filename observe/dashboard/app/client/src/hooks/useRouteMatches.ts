import { AppRoutePathIds } from '~/types/AppRoutePaths';
import { WhyLabsRouteMatch } from '~/types/routerTypes';
import { useMatches } from 'react-router-dom';

export const useRouteMatches = () => {
  const matches = useMatches() as WhyLabsRouteMatch[];

  // The current route is the last matched route
  const currentRoute = matches[matches.length - 1];

  const latestMatchForIds = (ids: Array<AppRoutePathIds>) => {
    // Reverse the matches array to find the last matched route with the given id
    return [...matches].reverse().find((match) => ids.includes(match.id));
  };

  return {
    currentRoute,
    latestMatchForIds,
  };
};
