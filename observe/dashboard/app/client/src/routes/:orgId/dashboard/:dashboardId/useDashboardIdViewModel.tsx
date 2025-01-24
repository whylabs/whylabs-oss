import { useWhyLabsBreadCrumbsFactory } from '~/components/design-system/bread-crumbs/useWhyLabsBreadCrumbsFactory';
import { useIsEmbedded } from '~/hooks/useIsEmbedded';
import { useNavLinkHandler } from '~/hooks/useWhylabsNavigation';
import { useWhyLabsSearchParams } from '~/hooks/useWhyLabsSearchParams';
import { LoaderData } from '~/types/LoaderData';
import { SELECTED_ORG_QUERY_NAME } from '~/utils/searchParamsConstants';
import { LoaderFunction, useLoaderData } from 'react-router-dom';
import invariant from 'tiny-invariant';

export const loader = (({ params }) => {
  const { orgId } = params;
  invariant(orgId, 'orgId must exist in this route');

  return { orgId };
}) satisfies LoaderFunction;

export function useDashboardIdViewModel() {
  const { orgId } = useLoaderData() as LoaderData<typeof loader>;
  const { orgCrumb, resourceCrumb, myDashboards } = useWhyLabsBreadCrumbsFactory();
  const breadCrumbs = { orgCrumb, resourceCrumb, ...myDashboards };
  const { handleNavigation } = useNavLinkHandler();
  const { isEmbeddedIntoCustomContext, isEmbedded } = useIsEmbedded();
  const { backToMainStackURL } = useWhyLabsSearchParams();
  const onClosePage = () => {
    if (isEmbedded) {
      window.location.href =
        backToMainStackURL || `${window.location.origin}/summary/dashboards?${SELECTED_ORG_QUERY_NAME}=${orgId}`;
      return;
    }

    handleNavigation({ page: 'dashboards' });
  };

  return {
    breadCrumbs,
    isEmbeddedIntoCustomContext,
    onClosePage,
  };
}
