import { AnalysisMetric } from 'generated/graphql';
import { Colors } from '@whylabs/observatory-lib';
import { IconAlertCircle } from '@tabler/icons';
import { WhyLabsTooltip } from 'components/design-system';
import useProfilesTableCSS from './useProfilesTableCSS';
import { FeatureAlertBatchData, FeatureAnomaliesBatchData, TableFeatureDataType, TableHeaderAccessor } from './types';

interface ProfilesTableCellProps {
  featureValuesForEachProfile: TableFeatureDataType[];
  accessor: TableHeaderAccessor;
  rowPerProfileHeight: number;
  colValueClass: string;
  anomalyAccessor: AnalysisMetric[] | undefined;
}

interface CellViewStylesObject {
  cellProfileWrap: string;
  cellProfileValue: string;
  alertCellText: string;
}

interface CellViewProps {
  height: number;
  className: string;
  isAlerted: boolean;
  cellValue: JSX.Element;
  styles: CellViewStylesObject;
}

function CellView({ height, className, isAlerted, cellValue, styles }: CellViewProps) {
  const { cx } = useProfilesTableCSS();
  return (
    <div className={styles.cellProfileWrap} style={{ height: `${height}px` }}>
      <div className={cx(styles.cellProfileValue, className, isAlerted ? styles.alertCellText : '')}>{cellValue}</div>
    </div>
  );
}

export default function ProfilesTableCell({
  featureValuesForEachProfile,
  accessor,
  rowPerProfileHeight,
  colValueClass,
  anomalyAccessor,
}: ProfilesTableCellProps): JSX.Element {
  const { classes: styles } = useProfilesTableCSS();

  function renderCellText(
    text: string | number | JSX.Element[] | null | undefined,
    isAlert: boolean,
    cellAlerts: FeatureAlertBatchData[] | FeatureAnomaliesBatchData[],
  ) {
    if (isAlert) {
      return (
        <WhyLabsTooltip label={cellAlerts[0].explanation}>
          <div
            style={{
              color: Colors.red,
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <IconAlertCircle style={{ height: 16, width: 16 }} />
            <div>{text}</div>
          </div>
        </WhyLabsTooltip>
      );
    }

    return <div>{text}</div>;
  }

  return (
    <>
      <div className={styles.cellFeatureName} />
      {featureValuesForEachProfile.map((profileItem: TableFeatureDataType, profileItemIndex: number) => {
        if (!profileItem)
          return (
            <CellView
              // eslint-disable-next-line
              key={`cell-value-${profileItemIndex}-${accessor}`}
              height={rowPerProfileHeight}
              className={colValueClass}
              cellValue={<span className={styles.notShownText}>Data not found</span>}
              isAlerted={false}
              styles={styles}
            />
          );

        const cellValue = profileItem[accessor];
        const featureName = profileItem['feature-name'];
        const cellAnomalies = (profileItem.alerts as Array<FeatureAnomaliesBatchData>).filter(
          (pia) => pia.featureName === featureName && pia.metric && anomalyAccessor?.includes(pia.metric),
        );
        const isAnomalyCell = cellAnomalies.some((ca) => ca.metric && anomalyAccessor?.includes(ca.metric));

        return (
          <CellView
            // eslint-disable-next-line
            key={`cell-value-${profileItemIndex}-${accessor}`}
            height={rowPerProfileHeight}
            className={colValueClass}
            cellValue={renderCellText(cellValue, isAnomalyCell, cellAnomalies)}
            isAlerted={isAnomalyCell}
            styles={styles}
          />
        );
      })}
    </>
  );
}
