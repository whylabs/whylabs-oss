import { trpcProxyClient } from '~/utils/trpcProxyClient';
import { LoaderFunction } from 'react-router-dom';
import invariant from 'tiny-invariant';

export const loader = (async ({ params }) => {
  const { orgId, resourceId } = params;
  invariant(orgId, 'orgId must exist in this route');
  invariant(resourceId, 'resourceId must exist in this route');

  const resource = await trpcProxyClient.meta.resources.describe.query({
    id: resourceId,
    orgId,
  });
  return resource;
}) satisfies LoaderFunction;
