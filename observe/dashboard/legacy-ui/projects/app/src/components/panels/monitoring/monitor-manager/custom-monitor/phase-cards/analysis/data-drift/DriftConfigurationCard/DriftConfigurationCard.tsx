import { useRecoilState } from 'recoil';
import { customMonitorAtom } from 'atoms/customMonitorAtom';
import { WhyLabsSelect, WhyLabsText } from 'components/design-system';
import useCustomMonitorManagerCSS from '../../../../useCustomMonitorManagerCSS';
import { driftAlgorithmOptions, getAlgorithmByString, thresholdAlgorithmMap } from '../../../../CustomMonitorTypes';
import { ColumnCardContentProps } from '../../../phaseCard';
import { ThresholdCard } from './ThresholdCard';

export default function DriftConfigurationCard({ editMode }: Pick<ColumnCardContentProps, 'editMode'>): JSX.Element {
  const { classes: styles, cx } = useCustomMonitorManagerCSS();
  const [{ driftAlgorithm }, setCustomMonitor] = useRecoilState(customMonitorAtom);

  return (
    <div className={cx(styles.columnCardFlex, styles.hellingerContainer)}>
      <div className={styles.columnCardContent} style={{ margin: '15px 0', width: '300px' }}>
        <WhyLabsText size={14} className={styles.columnCardText}>
          Do you want to use a different drift algorithm?
        </WhyLabsText>
        <div style={{ width: '280px' }}>
          <WhyLabsSelect
            disabled={editMode}
            withinPortal
            label="Algorithm"
            defaultValue={driftAlgorithm}
            data={driftAlgorithmOptions}
            onChange={(value: string) => {
              const algorithmType = getAlgorithmByString.get(value);
              const driftThreshold = thresholdAlgorithmMap.get(algorithmType)?.defaultValue ?? 0.7;
              setCustomMonitor((prevState) => ({
                ...prevState,
                driftAlgorithm: value,
                driftThreshold,
              }));
            }}
          />
        </div>
      </div>
      <ThresholdCard />
    </div>
  );
}
