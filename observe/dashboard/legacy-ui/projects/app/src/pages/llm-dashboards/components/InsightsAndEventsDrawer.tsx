import { useContext } from 'react';
import { WhyLabsDrawer } from 'components/design-system';
import { CloseButton, createStyles } from '@mantine/core';
import { IFrameContainer } from 'components/iframe/IFrameContainer';
import { getParam, usePageTypeWithParams } from 'pages/page-types/usePageType';
import { TARGET_ORG_QUERY_NAME } from 'graphql/apollo';
import { getNewStackEmbeddedURL, NewStackPath } from 'hooks/useNewStackLinkHandler';
import { NEW_STACK_RESOURCE_KEY, NEW_STACK_SELECTED_BATCH_KEY } from 'types/navTags';

import { useGetBatchesRangeTimestamps } from 'hooks/useGetBatchesRangeTimestamps';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { DashboardTabsContext } from '../DashboardTabsContext';

const useStyles = createStyles(() => ({
  closeButton: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    zIndex: 5,
  },
  drawerBody: {
    padding: 0,
  },
}));

export const InsightsAndEventsDrawer = (): JSX.Element => {
  const [{ securityTabDrawerOpenOn }, dispatchTabsState] = useContext(DashboardTabsContext);
  const { classes } = useStyles();
  const { modelId: resourceId } = usePageTypeWithParams();
  const {
    dateRange: { from: primaryStartTimestamp, to: primaryEndTimestamp },
    loading: loadingDateRange,
    datePickerSearchString,
  } = useSuperGlobalDateRange();

  const { batches } = useGetBatchesRangeTimestamps({
    modelId: resourceId,
    timestamps: [primaryStartTimestamp ?? 0, primaryEndTimestamp ?? 0],
    skip: loadingDateRange,
  });
  const closeDrawer = () => {
    dispatchTabsState({ securityTabDrawerOpenOn: null });
  };
  const isDrawerOpen = !!securityTabDrawerOpenOn;

  return (
    <WhyLabsDrawer
      uniqueId="insights-drawer"
      classNames={{ body: classes.drawerBody }}
      isOpen={isDrawerOpen}
      onClose={closeDrawer}
      size="80%"
      withCloseButton={false}
    >
      <CloseButton
        className={classes.closeButton}
        title="Close drawer"
        size="lg"
        iconSize={20}
        variant="outline"
        onClick={closeDrawer}
      />
      <IFrameContainer id="new-stack-iframe" height="100%" title="Events feed" url={getIframeUrl()} width="100%" />
    </WhyLabsDrawer>
  );

  function getIframeUrl() {
    const orgId = getParam(TARGET_ORG_QUERY_NAME);
    if (!isDrawerOpen || !orgId) return '';

    const newStackSearchParams = new URLSearchParams();
    newStackSearchParams.set(NEW_STACK_RESOURCE_KEY, resourceId);
    const isEventFeed = securityTabDrawerOpenOn === 'events-feed';
    const path: NewStackPath = isEventFeed ? 'event-feed' : 'insights';
    if (batches) {
      newStackSearchParams.set(NEW_STACK_SELECTED_BATCH_KEY, batches[batches.length - 1]?.from?.toString() ?? '');
    }
    return getNewStackEmbeddedURL({
      orgId,
      path,
      searchParams: newStackSearchParams,
      datePickerSearchString: isEventFeed ? datePickerSearchString : undefined,
    });
  }
};
