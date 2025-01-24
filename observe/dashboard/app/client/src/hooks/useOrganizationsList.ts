import { RootLoaderData } from '~/routes/rootLoader';
import { clearHeapSession } from '~/telemetry';
import { useLocation } from 'react-router-dom';

import { useOrgId } from './useOrgId';
import { useRouteMatchesData } from './useRouteMatchesData';

export const useOrganizationsList = () => {
  const location = useLocation();

  const orgId = useOrgId();

  const memberships = useRouteMatchesData<RootLoaderData>('root')?.memberships || [];

  const selectedOrg = memberships.find(({ orgId: id }) => id === orgId);

  function onChangeOrganization(newOrgId: string | null) {
    if (!newOrgId || orgId === newOrgId) return;

    const pathToNavigate = location.pathname.replace(orgId, newOrgId);

    clearHeapSession();

    // Since we don't have an easy way to animate the transition between organizations,
    // we're going to reload the page to use the same strategy we already have on ui-exp
    window.location.href = `${pathToNavigate}${location.search}`;
  }

  return {
    onChangeOrganization,
    organizationsList: memberships.map(({ name, orgId: id }) => ({
      value: id,
      label: `${name} (${id})`,
    })),
    selectedOrg,
    orgId,
  };
};
