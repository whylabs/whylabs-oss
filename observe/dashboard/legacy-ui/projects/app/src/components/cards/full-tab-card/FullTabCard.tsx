import Card from '@material-ui/core/Card';
import { CardContent, createStyles, makeStyles, Theme } from '@material-ui/core';
import { Colors } from '@whylabs/observatory-lib';
import cx from 'classnames';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    cardTop: {
      marginTop: theme.spacing(1),
    },
    firstCardTop: {
      marginTop: theme.spacing(2),
    },
    cardCommon: {
      marginBottom: theme.spacing(1),
      minWidth: '640px',
      border: `2px solid ${Colors.brandSecondary200}`,
      minHeight: '180px',
      maxHeight: '220px',
      overflowY: 'auto',
      padding: theme.spacing(2),
      paddingBottom: '8px',
    },
    contentDimensions: {
      height: '160px',
      padding: '0px 16px 0px 8px',
    },
    alertBorder: {
      border: `2px solid ${Colors.red}`,
    },
  }),
);

export interface FullTabCardProps {
  children: React.ReactNode;
  first?: boolean;
  width: number;
  height: number;
}
const FullTabCard: React.FC<FullTabCardProps> = ({ children, first = false, width, height }) => {
  const styles = useStyles();

  return (
    <Card
      variant="outlined"
      style={{ width, height, maxHeight: height }}
      className={cx(styles.cardCommon, first ? styles.firstCardTop : styles.cardTop)}
    >
      <CardContent className={styles.contentDimensions}>{children}</CardContent>
    </Card>
  );
};

export default FullTabCard;
