import { DataTypeFromLoader, deferredLoader } from '~/utils/routeUtils';
import { trpcProxyClient } from '~/utils/trpcProxyClient';
import invariant from 'tiny-invariant';

export const loader = deferredLoader(({ params: { orgId } }) => {
  invariant(orgId, 'orgId must exist in this route');

  const organization = trpcProxyClient.meta.memberships.describeOrganization.query({ orgId });
  return { organization };
});

export type OrgIdLoaderData = DataTypeFromLoader<typeof loader>;
