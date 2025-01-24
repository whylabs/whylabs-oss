import { WhyLabsHeader } from 'components/panels/header/WhyLabsHeader';
import { ReactElement } from 'react';
import { HeaderControlsProps, useHeaderControlsViewModel } from './useHeaderControlsViewModel';

/*
 * This component is being copied from dashbird-ui due to iframe limitations,
 * if we fix some bug here, would be a good idea to replicate the code there as well
 * */
export const HeaderControls = (props: HeaderControlsProps): ReactElement => {
  const { generateHeaderSections } = useHeaderControlsViewModel(props);

  return <WhyLabsHeader sections={generateHeaderSections()} />;
};
