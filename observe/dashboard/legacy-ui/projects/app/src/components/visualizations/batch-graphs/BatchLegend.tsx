import { createStyles } from '@mantine/core';
import { Colors, HtmlTooltip } from '@whylabs/observatory-lib';
import { WhyLabsTypography } from 'components/design-system';
import { IconAlertTriangle } from '@tabler/icons';

interface BatchLegendProps {
  hasReferenceData: boolean;
  toggleBatch: () => void;
  toggleReference: () => void;
  batchFieldName: string;
  referenceFieldName: string;
  colorBoxStyle: string;
  textStyle: string;
  batchVisible: boolean;
  referenceVisible: boolean;
}

const useStyles = createStyles(() => ({
  legendContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    height: '20px',
  },
  legendTextGroup: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignContent: 'baseline',
    padding: '0px 3px',
    transition: 'all .2s ease-in-out',
    border: `1px solid ${Colors.white}`,
  },
  hiddenTextGroup: {
    opacity: 0.7,
  },
  clickityGroup: {
    cursor: 'pointer',
    '&:hover': {
      borderColor: `${Colors.grey}33`,
      transform: 'scale(1.05)',
    },
  },
  rightSpace: {
    marginRight: 6,
  },
  leftSpace: {
    marginLeft: 6,
  },
  warningText: {
    color: Colors.orangeLight,
  },
  iconContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
}));

export const BatchLegend: React.FC<BatchLegendProps> = ({
  hasReferenceData,
  toggleBatch,
  toggleReference,
  batchFieldName,
  referenceFieldName,
  colorBoxStyle,
  textStyle,
  batchVisible,
  referenceVisible,
}) => {
  const { classes, cx } = useStyles();

  const handleKeyPressToggle = (event: React.KeyboardEvent<HTMLDivElement>, isBatch: boolean) => {
    if (event.key === 'Enter' || event.key === ' ') {
      if (isBatch) {
        toggleBatch();
      } else {
        toggleReference();
      }
    }
  };

  return (
    <div className={classes.legendContainer}>
      <div
        className={cx(
          classes.legendTextGroup,
          classes.clickityGroup,
          classes.rightSpace,
          !batchVisible && classes.hiddenTextGroup,
        )}
        onClick={toggleBatch}
        role="button"
        tabIndex={0}
        onKeyPress={(event) => handleKeyPressToggle(event, true)}
      >
        <div className={colorBoxStyle} style={{ backgroundColor: Colors.chartAqua }} />
        <WhyLabsTypography className={textStyle}>{batchFieldName}</WhyLabsTypography>
      </div>
      {hasReferenceData && (
        <div
          className={cx(classes.legendTextGroup, classes.clickityGroup, !referenceVisible && classes.hiddenTextGroup)}
          onClick={toggleReference}
          role="button"
          tabIndex={0}
          onKeyPress={(event) => handleKeyPressToggle(event, false)}
        >
          <div className={colorBoxStyle} style={{ backgroundColor: Colors.chartOrange }} />
          <WhyLabsTypography className={textStyle}>{referenceFieldName}</WhyLabsTypography>
        </div>
      )}
      {!hasReferenceData && (
        <div className={classes.legendTextGroup}>
          <div className={classes.iconContainer}>
            <IconAlertTriangle color={Colors.orangeLight} size={14} />
          </div>
          <WhyLabsTypography className={cx(textStyle, classes.warningText, classes.leftSpace)}>
            Baseline not available
          </WhyLabsTypography>
          <HtmlTooltip tooltipContent="Baseline not available due to insufficient data for the reference range, or from a missing reference profile." />
        </div>
      )}
    </div>
  );
};
