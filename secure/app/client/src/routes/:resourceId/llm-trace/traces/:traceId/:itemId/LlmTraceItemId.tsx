import { createStyles } from '@mantine/core';
import { SkeletonGroup } from '~/components/design-system';

import { LlmTraceDetailsContent } from '../../components/LlmTraceDetailsContent';
import { useLlmTraceItemIdViewModel } from './useLlmTraceItemIdViewModel';

const useStyles = createStyles(() => ({
  loadingRoot: {
    display: 'flex',
    flexDirection: 'column',
    gap: 30,
  },
}));

export const LlmTraceItemId = () => {
  const { classes } = useStyles();
  const { isLoading, selectedItem } = useLlmTraceItemIdViewModel();

  if (isLoading)
    return (
      <div className={classes.loadingRoot}>
        <SkeletonGroup count={1} height={30} />
        <SkeletonGroup count={1} height={80} />
      </div>
    );

  return <LlmTraceDetailsContent trace={selectedItem} />;
};
