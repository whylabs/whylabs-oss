import { JSX } from 'react';
import { Navigate } from 'react-router-dom';
import { useNavLinkHandler } from '~/hooks/useWhylabsNavigation';

export const AppIndex = (): JSX.Element => {
  const { getNavUrl } = useNavLinkHandler();

  const url = getNavUrl({ page: 'resources' });
  return <Navigate to={url} />;
};
