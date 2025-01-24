import { AppRoutePathIds } from '~/types/AppRoutePaths';
import { WhyLabsRouteMatch } from '~/types/routerTypes';
import { useMatches } from 'react-router-dom';

export const useRouteMatchesData = <TData extends Record<string, unknown>>(pathId: AppRoutePathIds) => {
  const matches = useMatches() as WhyLabsRouteMatch<TData>[];

  const data = matches.find((m) => m.id === pathId)?.data;
  if (data) return data;

  return null;
};
