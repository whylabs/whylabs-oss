import { useMatches } from 'react-router-dom';
import { AppRoutePathIds } from '~/types/AppRoutePaths';

export const useRouteMatchesData = <T extends Record<string, unknown>>(pathId: AppRoutePathIds) => {
  const matches = useMatches();

  const data = matches.find((m) => m.id === pathId)?.data;
  if (data) return data as T;

  return null;
};
