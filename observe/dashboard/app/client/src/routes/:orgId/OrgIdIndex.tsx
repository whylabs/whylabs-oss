import { UnfinishedFeatureFlag } from '~/components/misc/UnfinishedFeatureFlag';
import { AppRoutePaths } from '~/types/AppRoutePaths';
import { JSX } from 'react';
import { Link } from 'react-router-dom';

export const OrgIdIndex = (): JSX.Element => {
  return (
    <UnfinishedFeatureFlag>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Link to={AppRoutePaths.orgIdDashboards}>Dashboard</Link>
        <Link to={AppRoutePaths.orgIdPlayground}>Playground</Link>
      </div>
    </UnfinishedFeatureFlag>
  );
};
