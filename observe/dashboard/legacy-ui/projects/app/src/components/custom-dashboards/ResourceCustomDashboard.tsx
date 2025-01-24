import { useSetHtmlTitle } from 'hooks/useSetHtmlTitle';
import { TARGET_ORG_QUERY_NAME } from 'graphql/apollo';
import { NewStackPath, getNewStackEmbeddedURL } from 'hooks/useNewStackLinkHandler';
import { getParam } from 'pages/page-types/usePageType';
import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import { CustomDashboard } from 'generated/graphql';
import { NEW_STACK_CUSTOM_EMBEDDED_KEY } from 'types/navTags';
import { useSuperGlobalDateRange } from '../super-date-picker/hooks/useSuperGlobalDateRange';
import { IFrameContainer } from '../iframe/IFrameContainer';
import { SkeletonGroup } from '../design-system';

const useStyles = createStyles(() => ({
  root: {
    background: Colors.brandSecondary100,
    height: '100%',
    padding: 0,
    width: '100%',
  },
  skeletonRoot: {
    display: 'flex',
    flexDirection: 'column',
    gap: 15,
  },
  skeletonPadding: {
    padding: `0 15px`,
  },
}));

type ResourceCustomDashboardProps = {
  dashboard: CustomDashboard;
};

export const ResourceCustomDashboard = ({ dashboard }: ResourceCustomDashboardProps): JSX.Element => {
  useSetHtmlTitle(dashboard.displayName);
  const { classes } = useStyles();
  const { datePickerSearchString } = useSuperGlobalDateRange();

  function getIframeUrl() {
    const orgId = getParam(TARGET_ORG_QUERY_NAME);
    if (!orgId) return '';
    const path: NewStackPath = `dashboards/${dashboard.id}`;

    const searchParams = new URLSearchParams();
    searchParams.set(NEW_STACK_CUSTOM_EMBEDDED_KEY, 'true');

    return getNewStackEmbeddedURL({
      datePickerSearchString,
      orgId,
      path,
      searchParams,
    });
  }

  const loadingSkeleton = (
    <div className={classes.skeletonRoot}>
      <SkeletonGroup count={1} height={40} width="100%" />
      <div className={classes.skeletonPadding}>
        <SkeletonGroup count={1} height={420} width="100%" />
      </div>
    </div>
  );

  return (
    <div className={classes.root}>
      <IFrameContainer
        id={`resource-dashboard-${dashboard.id}`}
        title={dashboard.id}
        url={getIframeUrl()}
        height="100%"
        width="100%"
        loadingComponent={loadingSkeleton}
      />
    </div>
  );
};
