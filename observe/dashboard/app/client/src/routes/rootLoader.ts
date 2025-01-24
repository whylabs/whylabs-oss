import { LoaderData } from '~/types/LoaderData';
import { trpcProxyClient } from '~/utils/trpcProxyClient';
import { DEMO_GLOBAL_ORG_ID } from '~server/constants';
import logRocket from 'logrocket';
import { LoaderFunction, redirect } from 'react-router-dom';

export const rootLoader = (async ({ params, request }) => {
  const [demoOrgId, memberships, user] = await Promise.all([
    trpcProxyClient.meta.general.demoOrgId.query(),
    trpcProxyClient.meta.memberships.list.query(),
    trpcProxyClient.meta.user.getCurrentUser.query({
      orgId: params.orgId,
    }),
  ]);

  // This fixes demo org usage when running on localhost
  // since dashbird does the redirect at Dev/Prod environments
  if (params.orgId === DEMO_GLOBAL_ORG_ID) {
    if (demoOrgId) {
      return redirect(request.url.replace(`/${DEMO_GLOBAL_ORG_ID}`, `/${demoOrgId}`));
    }

    logRocket.warn('Failed to get valid demo org id to redirect.');
  }

  return { memberships, user };
}) satisfies LoaderFunction;

export type RootLoaderData = LoaderData<typeof rootLoader>;
