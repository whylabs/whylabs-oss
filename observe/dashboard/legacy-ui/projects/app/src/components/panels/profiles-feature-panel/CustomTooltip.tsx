import { createStyles, makeStyles } from '@material-ui/core';
import { Colors } from '@whylabs/observatory-lib';

const useStyles = makeStyles(() =>
  createStyles({
    tooltipContainer: {
      background: Colors.white,
      border: `1px solid ${Colors.brandPrimary700}`,
      borderRadius: '5px',
      padding: '10px',
      color: Colors.brandSecondary900,
    },
    tooltipLabel: {
      fontWeight: 600,
      marginTop: '10px',
      marginBottom: '10px',
    },
    tooltipItem: {
      display: 'flex',
      alignItems: 'center',
      marginTop: '10px',
    },
  }),
);

export interface IDataItem {
  label: string;
  color: string;
}

interface ICustomTooltipProps {
  label: string;
  data: IDataItem[];
}

export default function CustomTooltip({ label, data }: ICustomTooltipProps): JSX.Element {
  const styles = useStyles();

  return (
    <div className={styles.tooltipContainer}>
      <span className={styles.tooltipLabel}>{label}</span>
      {data.map((item, i) => (
        // eslint-disable-next-line
        <div className={styles.tooltipItem} key={`payload-map-${item.label}-${i}`}>
          <div style={{ backgroundColor: item.color, height: '11px', width: '11px', marginRight: '5px' }} />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
