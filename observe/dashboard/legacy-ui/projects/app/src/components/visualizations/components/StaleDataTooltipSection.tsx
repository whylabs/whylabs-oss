import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import { WhyLabsText } from 'components/design-system';
import { TimePeriod } from 'generated/graphql';
import { timeLong } from 'utils/dateUtils';

interface StaleDataTooltipSectionProps {
  lastUploadTimestamp?: number;
  analysisTimestamp?: number;
  batchFrequency?: TimePeriod;
}

const useStyles = createStyles(() => ({
  tooltipSubHeader: {
    fontSize: 12,
    lineHeight: 1.75,
    fontWeight: 600,
    color: Colors.brandSecondary900,
  },
  tooltipSquishy: {
    fontSize: 12,
    lineHeight: 1.33,
    fontWeight: 'normal',
    color: Colors.brandSecondary900,
  },
  verticalContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
}));
export const StaleDataTooltipSection: React.FC<StaleDataTooltipSectionProps> = ({
  lastUploadTimestamp,
  analysisTimestamp,
  batchFrequency = TimePeriod.P1D,
}) => {
  const { classes } = useStyles();
  if (!lastUploadTimestamp || !analysisTimestamp) {
    return null;
  }

  if (lastUploadTimestamp <= analysisTimestamp) {
    return null;
  }
  return (
    <div className={classes.verticalContainer}>
      <WhyLabsText size={12} className={classes.tooltipSubHeader}>
        Analysis is stale
      </WhyLabsText>
      <WhyLabsText size={12} className={classes.tooltipSquishy}>
        Last upload: {timeLong(lastUploadTimestamp, batchFrequency)}
      </WhyLabsText>
      <WhyLabsText size={12} className={classes.tooltipSquishy}>
        Last analysis: {timeLong(analysisTimestamp, batchFrequency)}
      </WhyLabsText>
      <WhyLabsText size={12} className={classes.tooltipSquishy}>
        See docs.whylabs.ai/docs/faq for more info
      </WhyLabsText>
    </div>
  );
};
