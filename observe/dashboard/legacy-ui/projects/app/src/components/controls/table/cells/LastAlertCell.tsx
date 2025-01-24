import { Cell, CellProps } from 'fixed-data-table-2';
import { useCommonStyles } from 'hooks/useCommonStyles';
import { createStyles } from '@mantine/core';
import { Colors, Spacings } from '@whylabs/observatory-lib';
import { timeLong } from 'utils/dateUtils';
import useTypographyStyles from 'styles/Typography';
import { WhyLabsText } from 'components/design-system';

const useStyles = createStyles({
  textContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignContent: 'center',
    width: 200,
    padding: 0,
    marginLeft: 0,
    maxHeight: 40,
  },
  alertText: {
    width: '100%',
    padding: `0 ${Spacings.pageLeftPadding}px`,
  },
  noAlertText: {
    width: '100%',
    padding: `0 ${Spacings.pageLeftPadding}px`,
    fontStyle: 'italic',
    color: Colors.brandSecondary700,
  },
});

export interface LastAlertCellProps extends CellProps {
  alertTimestampsInMillis: (number | undefined)[];
}

// TODO: Make this more generic
const LastAlertCell: React.FC<LastAlertCellProps> = ({ alertTimestampsInMillis, rowIndex, width, height }) => {
  const { classes: commonStyles, cx } = useCommonStyles();
  const { classes: typography } = useTypographyStyles();
  const { classes: styles } = useStyles();
  if (rowIndex === undefined) {
    return <Cell width={width} height={height} className={cx(commonStyles.cellFont)} />;
  }

  const renderNoAlertText = () => (
    <WhyLabsText
      inherit
      className={cx(typography.noDataText, commonStyles.cellNestedPadding, styles.noAlertText, typography.monoFont)}
    >
      No alerts in range
    </WhyLabsText>
  );

  const renderAlertText = () => {
    if (!alertTimestampsInMillis[rowIndex]) {
      return null;
    }
    return (
      <WhyLabsText
        inherit
        className={cx(typography.textTable, commonStyles.cellNestedPadding, styles.alertText, typography.monoFont)}
      >
        {timeLong(alertTimestampsInMillis[rowIndex] || 0)}
      </WhyLabsText>
    );
  };

  return (
    <Cell width={width} height={height} className={cx(commonStyles.cellFont)}>
      {alertTimestampsInMillis[rowIndex] ? renderAlertText() : renderNoAlertText()}
    </Cell>
  );
};

export default LastAlertCell;
