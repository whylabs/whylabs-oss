import { WhyLabsHeader } from '~/components/misc/WhyLabsHeader';
import {
  HeaderControlsProps,
  useHeaderControlsViewModel,
} from '~/routes/:orgId/:resourceId/segment-analysis/components/useHeaderControlsViewModel';
import { ReactElement } from 'react';

export const HeaderControls = (props: HeaderControlsProps): ReactElement => {
  const { generateHeaderSections } = useHeaderControlsViewModel(props);
  return <WhyLabsHeader sections={generateHeaderSections()} />;
};
