import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import { SkeletonGroup } from 'components/design-system';
import { IFrameContainer } from 'components/iframe/IFrameContainer';
import { TARGET_ORG_QUERY_NAME } from 'graphql/apollo';
import { NewStackPath, getNewStackEmbeddedURL } from 'hooks/useNewStackLinkHandler';
import { useSetHtmlTitle } from 'hooks/useSetHtmlTitle';
import { getParam } from 'pages/page-types/usePageType';

const PAGE_TITLE = 'Resource Management';

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

export const NewResourceManagementIframe = (): JSX.Element => {
  useSetHtmlTitle(PAGE_TITLE);
  const { classes } = useStyles();

  function getIframeUrl() {
    const orgId = getParam(TARGET_ORG_QUERY_NAME);
    if (!orgId) return '';

    const path: NewStackPath = 'settings/resource-management';

    return getNewStackEmbeddedURL({
      orgId,
      path,
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
        id="new-resource-management-iframe"
        title={PAGE_TITLE}
        url={getIframeUrl()}
        height="100%"
        width="100%"
        loadingComponent={loadingSkeleton}
      />
    </div>
  );
};
