import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { WhyLabsBadge, WhyLabsText, WhyLabsTooltip } from '~/components/design-system';
import { dateConstructorToReadableISOString } from '~/components/super-date-picker/utils';
import { useNavLinkHandler } from '~/hooks/useWhylabsNavigation';
import { formatUtcDateString } from '~/utils/dateUtils';
import { upperCaseFirstLetterOnly } from '~/utils/stringUtils';
import { RouterOutputs } from '~/utils/trpc';
import { isNumber } from '~/utils/typeGuards';
import { mapStringToGranularity } from '~server/util/time-period-utils';
import { ReactElement } from 'react';
import { Link } from 'react-router-dom';

const useStyles = createStyles({
  root: {
    height: '240px',
    background: 'white',
    borderRadius: 4,
    border: `1px solid ${Colors.mantineLightGray}`,
    padding: 12,
    overflow: 'hidden',
  },
  content: {
    paddingTop: 12,
  },
  resourceId: {
    maxWidth: '180px',
  },
  resourceName: {
    color: Colors.secondaryLight1000,
    fontSize: 16,
    fontWeight: 400,
    lineHeight: 1.3,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginTop: 4,
  },
  cellWrapper: {
    marginTop: 12,
  },
  cellTitle: {
    color: Colors.brandSecondary600,
    fontSize: 12,
  },
  cellValue: {
    color: Colors.secondaryLight1000,
    fontSize: 12,
  },
  linkStyle: {
    color: Colors.linkColor,
    fontSize: 12,
    '&:hover': {
      color: Colors.linkColor,
    },
  },
  notFoundLabel: {
    fontStyle: 'italic',
    fontSize: 13,
    color: Colors.secondaryLight1000,
    fontWeight: 400,
  },
  flexRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
});
type ResourceCardProps = {
  data: RouterOutputs['meta']['resources']['list'][number];
};
export const ResourceCard = ({ data }: ResourceCardProps): ReactElement => {
  const { classes } = useStyles();
  const { getNavUrl } = useNavLinkHandler();
  const isLLM = data.modelType === 'LLM';
  const renderCell = (title: string, content: ReactElement) => (
    <div className={classes.cellWrapper}>
      <WhyLabsText className={classes.cellTitle}>{title}</WhyLabsText>
      {content}
    </div>
  );

  const renderBatchFrequency = () => {
    const { timePeriod } = data;
    const batchFrequency = mapStringToGranularity.get(timePeriod) ?? 'Not defined';
    return <WhyLabsText className={classes.cellValue}>{upperCaseFirstLetterOnly(batchFrequency)}</WhyLabsText>;
  };

  const renderLineage = () => {
    const { oldestTimestamp, latestTimestamp } = data.dataAvailability ?? {};
    if (!isNumber(oldestTimestamp) || !isNumber(latestTimestamp))
      return <WhyLabsText className={classes.notFoundLabel}>No batch profiles found</WhyLabsText>;
    const lineageString = `${formatUtcDateString(oldestTimestamp)} to ${formatUtcDateString(latestTimestamp)}`;
    const readableStartDate = dateConstructorToReadableISOString(oldestTimestamp);
    const readableEndDate = dateConstructorToReadableISOString(latestTimestamp);

    if (isLLM && readableStartDate && readableEndDate) {
      const llmSecureUrl = getNavUrl({
        page: 'llm-secure',
        resourceId: data.id,
        setParams: [
          { name: 'startDate', value: readableStartDate },
          { name: 'endDate', value: readableEndDate },
        ],
      });
      return (
        <WhyLabsTooltip label="Go to LLM Secure with lineage range">
          <Link to={llmSecureUrl} className={classes.linkStyle}>
            {lineageString}
          </Link>
        </WhyLabsTooltip>
      );
    }
    return <WhyLabsText className={classes.cellValue}>{lineageString}</WhyLabsText>;
  };

  return (
    <div className={classes.root}>
      <div className={classes.flexRow}>
        <WhyLabsText className={classes.cellTitle}>{data.modelCategory}:</WhyLabsText>
        <WhyLabsBadge customBackground={Colors.brandPrimary700} radius="lg" className={classes.resourceId}>
          {data.modelType ?? 'NOT_DEFINED'}
        </WhyLabsBadge>
      </div>
      <div className={classes.content}>
        <WhyLabsText displayTooltip className={classes.resourceName}>
          {data.name}
        </WhyLabsText>
        <WhyLabsText className={classes.cellTitle}>ID: {data.id}</WhyLabsText>
        {renderCell('Batch frequency', renderBatchFrequency())}
        {renderCell('Batch profile lineage', renderLineage())}
      </div>
    </div>
  );
};
