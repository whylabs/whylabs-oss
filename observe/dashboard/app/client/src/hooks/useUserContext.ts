import { RootLoaderData } from '~/routes/rootLoader';
import { CurrentUser } from '~/types/userTypes';
import { getDomainFromEmail } from '~/utils/stringUtils';

import { useRouteMatchesData } from './useRouteMatchesData';

export const useUserContext = () => {
  const currentUser = useRouteMatchesData<RootLoaderData>('root')?.user as CurrentUser;

  const isWhyLabsUser = getDomainFromEmail(currentUser?.email) === 'whylabs';

  return {
    currentUser,
    isWhyLabsUser,
  };
};
