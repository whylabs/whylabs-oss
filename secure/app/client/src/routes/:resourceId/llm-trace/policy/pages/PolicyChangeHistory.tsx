import { createStyles } from '@mantine/core';
import { useElementSize } from '@mantine/hooks';
import { ReactElement } from 'react';
import { Colors } from '~/assets/Colors';
import { WhyLabsCodeEditor } from '~/components/code-editor/WhyLabsCodeEditor';
import { SkeletonGroup, WhyLabsButton, WhyLabsDrawer, WhyLabsText } from '~/components/design-system';
import { usePolicyChangeHistoryViewModel } from '~/routes/:resourceId/llm-trace/policy/pages/usePolicyChangeHistoryViewModel';
import { CARD_WIDTH } from '~/routes/:resourceId/llm-trace/policy/utils';
import { arrayOfLength } from '~/utils/arrayUtils';
import { dateToUTCDateString, dateToUTCTimeString } from '~/utils/dateRangeUtils';
import { upperCaseFirstLetterOnly } from '~/utils/stringUtils';

const useStyles = createStyles(() => ({
  root: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    alignItems: 'center',
  },
  card: {
    border: `1px solid ${Colors.lightGray}`,
    borderRadius: 4,
    padding: 16,
    display: 'flex',
    justifyContent: 'space-between',
    maxWidth: CARD_WIDTH.max,
    minWidth: CARD_WIDTH.min,
    width: '100%',
  },
  cardContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    width: 'max-content',
  },
  title: {
    fontSize: 16,
    fontWeight: 400,
    lineHeight: 1.5,
    color: Colors.secondaryLight1000,
  },
  list: {
    margin: 0,
    fontSize: 14,
    fontWeight: 400,
    color: Colors.secondaryLight900,
    '& li': {
      lineHeight: 1.75,
    },
  },
  configDrawer: {
    width: '800px',
  },
  drawerRoot: {
    width: '100%',
    height: '100%',
  },
}));

export const PolicyChangeHistory = (): ReactElement => {
  const { classes } = useStyles();
  const { data, isLoading, viewConfigHandler, policyVersionDetails } = usePolicyChangeHistoryViewModel();
  const { height, ref } = useElementSize();
  if (isLoading) {
    return (
      <div className={classes.root}>
        {arrayOfLength(3).map((i) => (
          <div className={classes.card} key={`fake-card-loading-${i}`}>
            <SkeletonGroup count={2} height={24} />
          </div>
        ))}
      </div>
    );
  }

  const renderContent = () => {
    if (!data?.length) {
      return (
        <div className={classes.card}>
          <WhyLabsText className={classes.title}>No policy version history available.</WhyLabsText>
        </div>
      );
    }
    return data.map((config) => {
      const possibleTimestamp = Number(config.creationTime);
      const creationTime = Number.isNaN(possibleTimestamp) ? null : new Date(possibleTimestamp);
      const { author, identity } = config;
      const isCreatedViaUI = config.source === 'ui';
      const creationSource = (() => {
        if (!config.source) return null;
        if (isCreatedViaUI) return 'WhyLabs Platform';
        return upperCaseFirstLetterOnly(config.source);
      })();
      return (
        <div className={classes.card} key={`policy-version-${config.version}`}>
          <div className={classes.cardContent}>
            <WhyLabsText className={classes.title}>Policy version: {config.version}</WhyLabsText>
            <ul className={classes.list}>
              {creationTime && (
                <li>
                  Created on: {dateToUTCDateString(creationTime)} {dateToUTCTimeString(creationTime)} UTC
                </li>
              )}
              {author && isCreatedViaUI && <li>Created by: {author}</li>}
              {creationSource && <li>Source: {creationSource}</li>}
              {identity && !isCreatedViaUI && <li>Identity: {identity}</li>}
            </ul>
          </div>
          <WhyLabsButton variant="outline" size="xs" color="gray" onClick={viewConfigHandler(Number(config.version))}>
            View configuration
          </WhyLabsButton>
        </div>
      );
    });
  };

  return (
    <div className={classes.root} ref={ref}>
      {renderContent()}
      <WhyLabsDrawer
        size="max(30%, 600px)"
        isOpen={policyVersionDetails.isOpened}
        onClose={viewConfigHandler(null)}
        classNames={{ content: classes.configDrawer }}
        title={
          <WhyLabsText className={classes.title}>
            Policy version: {policyVersionDetails.selectedPolicyVersion}
          </WhyLabsText>
        }
      >
        <div className={classes.drawerRoot}>
          <WhyLabsCodeEditor
            readOnly
            language="yaml"
            code={policyVersionDetails.data ?? '// no content'}
            height={`${height}px`}
            isLoading={policyVersionDetails.isLoading}
          />
        </div>
      </WhyLabsDrawer>
    </div>
  );
};
