import { Skeleton } from '@mantine/core';
import { formatDistance } from 'date-fns';
import { upperCaseFirstLetterOnly } from 'utils/stringUtils';
import { WhyLabsText } from 'components/design-system';
import { useSummaryCardStyles } from '../../useModelSummaryCSS';

type LastDataBatchProps = {
  loading?: boolean;
  timestamp?: number | null;
  label?: string;
  noTimestampLabel?: string;
};

const LastDataBatch = ({ loading, timestamp, label, noTimestampLabel }: LastDataBatchProps): JSX.Element => {
  const { classes: styles } = useSummaryCardStyles();

  return (
    <>
      <WhyLabsText inherit className={styles.contentSubtitle}>
        {label ?? 'Last profile analyzed'}:
      </WhyLabsText>
      <WhyLabsText inherit className={styles.contentTxt}>
        {loading ? (
          <Skeleton data-testid="loadingSkeleton" variant="text" height={16} width={40} animate />
        ) : (
          renderTimestamp()
        )}
      </WhyLabsText>
    </>
  );

  function renderTimestamp() {
    if (!timestamp) {
      return noTimestampLabel ?? 'No profiles';
    }
    return upperCaseFirstLetterOnly(formatDistance(timestamp, new Date(), { addSuffix: true }));
  }
};

export default LastDataBatch;
