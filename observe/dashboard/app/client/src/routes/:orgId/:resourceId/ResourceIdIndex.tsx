import { UnfinishedFeatureFlag } from '~/components/misc/UnfinishedFeatureFlag';
import { JSX } from 'react';

export const ResourceIdIndex = (): JSX.Element => {
  return (
    <UnfinishedFeatureFlag>
      <>
        <h2>Resource overview, not implemented yet</h2>
        <p>Here we should build a summary page for the resource.</p>
      </>
    </UnfinishedFeatureFlag>
  );
};
