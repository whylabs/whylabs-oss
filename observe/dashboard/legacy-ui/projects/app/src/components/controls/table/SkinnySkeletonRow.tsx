import { createStyles, makeStyles, Theme } from '@material-ui/core/styles';
import { Colors } from '@whylabs/observatory-lib';
import { useCommonStyles } from 'hooks/useCommonStyles';
import Skeleton from '@material-ui/lab/Skeleton';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    tableContrast: {
      backgroundColor: Colors.contrastTableRow,
    },
    rowCommon: {
      '&:hover': {
        backgroundColor: theme.palette.grey[200],
      },
    },
    abbreviatedCell: {
      textOverflow: 'ellipsis',
      maxWidth: '19em',
      lineHeight: 1.5,
      paddingTop: '2px',
      paddingBottom: '2px',
    },
    iconContainer: {
      minWidth: '2em',
      flexGrow: 0,
      display: 'flex',
      justifyContent: 'center',
      paddingRight: '15px',
    },
    iconCell: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
  }),
);

export interface SkinnySkeletonRowProps {
  index: number;
}

const SkinnySkeletonRow: React.FC<SkinnySkeletonRowProps> = () => {
  const styles = useStyles();
  const { classes: commonStyles, cx } = useCommonStyles();

  const backgroundClassName = commonStyles.cellBack;

  return (
    <div className={cx(backgroundClassName, styles.rowCommon)}>
      <div
        className={cx(
          styles.iconCell,
          commonStyles.clickity,
          commonStyles.tableFirstColumn,
          commonStyles.cellStandardHeight,
          commonStyles.commonLeftPadding,
        )}
        // align="left"
      >
        <div className={cx(styles.abbreviatedCell)}>
          <Skeleton variant="text" animation="wave" width={144} />
        </div>
        <div className={styles.iconContainer}>
          <Skeleton variant="circle" animation="wave" width={24} height={24} />
        </div>
      </div>
    </div>
  );
};

export default SkinnySkeletonRow;
