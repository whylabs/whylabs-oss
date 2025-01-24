import { useNavLinkHandler } from '~/hooks/useWhylabsNavigation';
import { IS_DEV_ENV } from '~/utils/constants';
import { JSX } from 'react';
import { Navigate } from 'react-router-dom';

import { useRootIndexViewModel } from './useRootIndexViewModel';

export const AppIndex = (): JSX.Element => {
  const { orgId } = useRootIndexViewModel();
  const { getNavUrl } = useNavLinkHandler(orgId);

  if (!IS_DEV_ENV) {
    return <></>;
  }
  if (orgId) {
    const url = getNavUrl({ page: 'resources' });
    return <Navigate to={url} />;
  }

  return <>Only visible on DEV for now -- no organization found</>;
};
