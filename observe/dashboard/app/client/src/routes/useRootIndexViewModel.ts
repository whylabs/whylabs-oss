import { LoaderData } from '~/types/LoaderData';
import { forceRedirectToOrigin } from '~/utils/oldStackUtils';
import { trpcProxyClient } from '~/utils/trpcProxyClient';
import { LoaderFunction, useLoaderData } from 'react-router-dom';
import invariant from 'tiny-invariant';

export const loader = (async () => {
  const { defaultOrganization } = await trpcProxyClient.meta.user.getCurrentUser.query({});
  invariant(defaultOrganization, 'No default organization found');

  return { orgId: defaultOrganization };
}) satisfies LoaderFunction;

export function useRootIndexViewModel() {
  const { orgId } = useLoaderData() as LoaderData<typeof loader>;

  function onClosePage() {
    forceRedirectToOrigin();
  }

  return {
    orgId,
    onClosePage,
  };
}
