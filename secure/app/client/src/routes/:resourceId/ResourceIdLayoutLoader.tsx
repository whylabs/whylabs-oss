import { LoaderFunction } from 'react-router-dom';
import invariant from 'tiny-invariant';
import { trpcProxyClient } from '~/utils/trpcProxyClient';

export const loader = (async ({ params }) => {
  const { resourceId } = params;
  invariant(resourceId, 'resourceId must exist in this route');

  const resource = await trpcProxyClient.meta.resources.describe.query({
    id: resourceId,
  });
  return resource;
}) satisfies LoaderFunction;
