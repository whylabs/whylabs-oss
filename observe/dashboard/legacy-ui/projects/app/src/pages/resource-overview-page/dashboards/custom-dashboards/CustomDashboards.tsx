import { createStyles } from '@mantine/core';
import { IFrameContainer } from 'components/iframe/IFrameContainer';
import { getParam } from 'pages/page-types/usePageType';
import { TARGET_ORG_QUERY_NAME } from 'graphql/apollo';
import { getNewStackEmbeddedURL, NewStackPath } from 'hooks/useNewStackLinkHandler';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { SkeletonGroup } from 'components/design-system';
import { MainStackEvents } from 'hooks/useStackCustomEventListeners';
import { useCallback, useEffect } from 'react';
import { NEW_STACK_SORT_BY_KEY, NEW_STACK_SORT_DIRECTION_KEY } from 'types/navTags';
import { useSearchParams } from 'react-router-dom';

const useStyles = createStyles(() => ({
  root: {
    background: 'white',
    width: '100%',
    height: '100%',
  },
  flexRow: {
    display: 'flex',
  },
  fakeContent: {
    width: '100%',
    height: '100%',
    background: 'white',
    display: 'flex',
    flexDirection: 'column',
  },
}));

export const CustomDashboards = (): JSX.Element => {
  const { classes } = useStyles();
  const { datePickerSearchString } = useSuperGlobalDateRange();
  const [searchParams, setSearchParams] = useSearchParams();

  const newStackSetSearchParamsEventHandler = useCallback(
    (event: Event) => {
      try {
        const { detail } = event as CustomEvent;
        const newStackSearchParams = new URLSearchParams(detail);

        const sortBy = newStackSearchParams.get(NEW_STACK_SORT_BY_KEY);

        // If the new stack changes the sort, update the search params here
        if (sortBy) {
          const sortDirection = newStackSearchParams.get(NEW_STACK_SORT_DIRECTION_KEY) ?? '';
          setSearchParams((next) => {
            next.set(NEW_STACK_SORT_BY_KEY, sortBy);
            next.set(NEW_STACK_SORT_DIRECTION_KEY, sortDirection);
            return next;
          });
        }
      } catch (error) {
        console.error('Error getting search params from new stack event listener', error);
      }
    },
    [setSearchParams],
  );

  useEffect(() => {
    window.document.addEventListener(MainStackEvents.SetSearchParams, newStackSetSearchParamsEventHandler);
    return () => {
      window.document.removeEventListener(MainStackEvents.SetSearchParams, newStackSetSearchParamsEventHandler);
    };
  }, [newStackSetSearchParamsEventHandler]);

  const getIframeUrl = () => {
    const orgId = getParam(TARGET_ORG_QUERY_NAME);
    if (!orgId) return '';
    const path: NewStackPath = 'dashboards';

    const iFrameSearchParams = new URLSearchParams();

    const sortBy = searchParams.get(NEW_STACK_SORT_BY_KEY);
    // If the search params have a sort, pass it to the new stack iframe
    if (sortBy) {
      const sortDirection = searchParams.get(NEW_STACK_SORT_DIRECTION_KEY) ?? '';
      iFrameSearchParams.set(NEW_STACK_SORT_BY_KEY, sortBy);
      iFrameSearchParams.set(NEW_STACK_SORT_DIRECTION_KEY, sortDirection);
    }

    return getNewStackEmbeddedURL({
      orgId,
      path,
      datePickerSearchString,
      searchParams: iFrameSearchParams,
    });
  };

  const loadingSkeleton = (
    <div className={classes.fakeContent}>
      <SkeletonGroup count={1} height={90} width="100%" mt={1} />
      <SkeletonGroup count={1} height={30} width="100%" mt={1} />
      <SkeletonGroup count={1} height="100%" width="100%" mt={1} />
    </div>
  );

  return (
    <div className={classes.root}>
      <IFrameContainer
        id="custom-dashboards-iframe"
        title="My dashboards"
        url={getIframeUrl()}
        height="100%"
        width="100%"
        loadingComponent={loadingSkeleton}
      />
    </div>
  );
};
