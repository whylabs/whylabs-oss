import ArrowDownwardIcon from '@material-ui/icons/ArrowDownward';
import ArrowUpwardIcon from '@material-ui/icons/ArrowUpward';
import { Skeleton } from '@mantine/core';
import { asPercentage, friendlyFormat } from 'utils/numberUtils';
import { WhyLabsText } from 'components/design-system';
import { TimePeriod } from 'generated/graphql';
import { useSummaryCardStyles } from '../useModelSummaryCSS';
import { getMidRangeComparisonText } from '../summaryCardUtils';

type NumericType = 'count' | 'raw' | 'percentage';

interface TrendMetricSlotProps {
  title: string;
  dataUnits?: string;
  referencedNumber: number;
  currentNumber: number;
  currentValueOverride?: string; // content to display instead of the `currentNumber`, if needed
  reverseColor?: boolean;
  forceRed?: boolean;
  loading?: boolean;
  isPercent?: boolean;
  isRaw?: boolean;
  hideSummary?: boolean;
  batchFrequency?: TimePeriod;
  titleClassName?: string;
}

interface DisplayValue {
  displayValue: string;
  positiveNum: boolean;
}

const TrendMetricSlot = ({
  title,
  dataUnits,
  referencedNumber,
  currentNumber,
  currentValueOverride,
  reverseColor = false,
  forceRed = false,
  loading = false,
  isPercent = false,
  isRaw = false,
  hideSummary,
  batchFrequency = TimePeriod.P1D,
  titleClassName,
}: TrendMetricSlotProps): JSX.Element => {
  const { classes: styles, cx } = useSummaryCardStyles();

  const getNumericType = (): NumericType => {
    if (isRaw) {
      return 'raw';
    }
    if (isPercent) {
      return 'percentage';
    }
    return 'count';
  };

  const numberDisplayType = getNumericType();

  const displayValueForAllPercentages = (): DisplayValue => {
    if (referencedNumber === 0) {
      return { displayValue: 'N/A', positiveNum: currentNumber > 0 };
    }

    const absolutePercentageDiff = Number(
      ((100 * Math.abs(currentNumber - referencedNumber)) / referencedNumber).toFixed(1),
    );
    const positiveNum = currentNumber - referencedNumber > 0;
    const displayValue = `${positiveNum ? '+' : ''}${absolutePercentageDiff}%`;
    return { displayValue, positiveNum };
  };

  const displayValueForRaw = (): DisplayValue => {
    return {
      displayValue: friendlyFormat(currentNumber - referencedNumber, 3),
      positiveNum: currentNumber - referencedNumber > 0,
    };
  };

  const displayValueForCount = (): DisplayValue => {
    let displayValue: string;
    let positiveNum: boolean;
    if (referencedNumber === 0 || currentNumber === 0) {
      // display alerts number change
      let countDisplayNumber = currentNumber;
      if (currentNumber === 0) {
        countDisplayNumber = -(referencedNumber >= 0 ? Math.ceil(referencedNumber) : Math.floor(referencedNumber));
      }
      positiveNum = countDisplayNumber > 0;
      displayValue = `${positiveNum ? '+' : ''}${
        countDisplayNumber > 0 && countDisplayNumber < 1
          ? asPercentage(countDisplayNumber)
          : friendlyFormat(countDisplayNumber, 0)
      }${dataUnits ? ` ${dataUnits}` : ''}`;
    } else {
      // display alerts percentage change
      const percentDiff = Number((((currentNumber - referencedNumber) / referencedNumber) * 100).toFixed(1));
      positiveNum = percentDiff > 0;
      displayValue = `${positiveNum ? '+' : ''}${percentDiff}%`;
    }
    return { displayValue, positiveNum };
  };

  const getChangeFromReferenceValue = (): DisplayValue => {
    switch (numberDisplayType) {
      case 'percentage':
        if (referencedNumber === 0) {
          return displayValueForRaw();
        }
        return displayValueForAllPercentages();
      case 'count':
        return displayValueForCount();
      case 'raw':
      default:
        return displayValueForAllPercentages();
    }
  };

  const getHeadlineNumber = (): string => {
    switch (numberDisplayType) {
      case 'percentage':
        return asPercentage(currentNumber);
      case 'count':
        return currentNumber > 0 && currentNumber < 1 ? asPercentage(currentNumber) : friendlyFormat(currentNumber, 0);
      case 'raw':
      default:
        return friendlyFormat(currentNumber, 3);
    }
  };

  const getHeadline = (): JSX.Element => {
    if (currentValueOverride) {
      return (
        <WhyLabsText inherit className={styles.mediumInfo}>
          {currentValueOverride}
        </WhyLabsText>
      );
    }

    return (
      <WhyLabsText inherit className={styles.largeInfo}>
        {getHeadlineNumber()}
      </WhyLabsText>
    );
  };

  const getSummaryTrend = (): JSX.Element => {
    if (referencedNumber === currentNumber) return <span>No changes</span>;

    const { displayValue, positiveNum } = getChangeFromReferenceValue();
    const colorInversion = reverseColor ? !positiveNum : positiveNum;

    return (
      <span
        className={cx(
          styles.contentTrendValue,
          colorInversion ? styles.contentTrendPositive : styles.contentTrendNegative,
          forceRed && styles.contentTrendNegative,
        )}
      >
        {positiveNum ? (
          <ArrowUpwardIcon className={styles.contentTrendArrow} />
        ) : (
          <ArrowDownwardIcon className={styles.contentTrendArrow} />
        )}
        {displayValue}
      </span>
    );
  };

  return (
    <>
      <WhyLabsText inherit className={cx(styles.contentTxt, titleClassName)}>
        {title}
      </WhyLabsText>
      {loading ? (
        <>
          <Skeleton variant="text" height={38} width={30} animate />
          <Skeleton variant="text" height={16} width={30} animate />
        </>
      ) : (
        <>
          {getHeadline()}
          {!hideSummary && (
            <WhyLabsText inherit className={styles.contentTrendTxt}>
              {getSummaryTrend()}
              <span>{` ${getMidRangeComparisonText(batchFrequency)}`}</span>
            </WhyLabsText>
          )}
        </>
      )}
    </>
  );
};

export default TrendMetricSlot;
