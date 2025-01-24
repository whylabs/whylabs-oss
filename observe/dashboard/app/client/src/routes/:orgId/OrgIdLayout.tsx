import { SuspenseAwait } from '~/components/await/SuspenseAwait';
import { WhyLabsLoadingOverlay } from '~/components/design-system';
import { useFlags } from '~/hooks/useFlags';
import { AppRoutePaths } from '~/types/AppRoutePaths';
import { useTypeSafeLoaderData } from '~/utils/routeUtils';
import { JSX } from 'react';
import { Link, Outlet } from 'react-router-dom';

import { loader } from './OrgIdLayoutLoader';

export const OrgIdLayout = (): JSX.Element => {
  const loaderData = useTypeSafeLoaderData<typeof loader>();
  const flags = useFlags();

  if (flags.isLoading) return <WhyLabsLoadingOverlay visible />;

  if (loaderData.organization === null) {
    return (
      <>
        <h2>Unknown organization</h2>
        <Link to={AppRoutePaths.root}>Back</Link>
      </>
    );
  }

  const children = (
    <SuspenseAwait resolve={loaderData.organization}>
      <Outlet />
    </SuspenseAwait>
  );

  return children;
};
