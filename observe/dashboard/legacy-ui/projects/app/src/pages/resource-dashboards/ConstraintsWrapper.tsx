import { ReactElement } from 'react';
import { IFrameContainer } from 'components/iframe/IFrameContainer';
import { createStyles } from '@mantine/core';
import { TARGET_ORG_QUERY_NAME } from 'graphql/apollo';
import { getNewStackEmbeddedURL, NewStackPath } from 'hooks/useNewStackLinkHandler';
import { NEW_STACK_SEGMENT } from 'types/navTags';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { useSetHtmlTitle } from 'hooks/useSetHtmlTitle';
import { displaySegment } from '../page-types/pageUrlQuery';
import { getParam, usePageTypeWithParams } from '../page-types/usePageType';

const useStyles = createStyles(() => ({
  iframeWrapper: {
    width: '100%',
    height: '100%',
    backgroundColor: 'white',
  },
}));

export const ConstraintsWrapper = (): ReactElement => {
  useSetHtmlTitle('Constraints');
  const { classes } = useStyles();
  const { datePickerSearchString } = useSuperGlobalDateRange();
  const { modelId, segment } = usePageTypeWithParams();

  const getIframeUrl = () => {
    const orgId = getParam(TARGET_ORG_QUERY_NAME);
    if (!orgId || !modelId) return '';
    const path: NewStackPath = `${modelId}/constraints`;
    const searchParams = new URLSearchParams();
    const segmentString = displaySegment(segment);
    if (segmentString) {
      searchParams.set(NEW_STACK_SEGMENT, segmentString);
    }

    return getNewStackEmbeddedURL({
      orgId,
      path,
      searchParams,
      datePickerSearchString,
    });
  };

  return (
    <div className={classes.iframeWrapper}>
      <IFrameContainer
        id="new-stack-constraints-iframe"
        height="100%"
        title="Constraints"
        url={getIframeUrl()}
        width="100%"
      />
    </div>
  );
};
