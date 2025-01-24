import { useRecoilState } from 'recoil';
import { customMonitorAtom } from 'atoms/customMonitorAtom';
import { mapAlgorithmsName } from 'components/visualizations/quantile-chart/helpers';
import { WhyLabsNumberInput, WhyLabsText } from 'components/design-system';
import useCustomMonitorManagerCSS from '../../../../useCustomMonitorManagerCSS';
import { getAlgorithmByString, thresholdAlgorithmMap } from '../../../../CustomMonitorTypes';

export const ThresholdCard: React.FC = () => {
  const { classes: styles, cx } = useCustomMonitorManagerCSS();
  const [{ driftThreshold, driftAlgorithm }, setCustomMonitor] = useRecoilState(customMonitorAtom);
  if (!driftAlgorithm) return null;
  const algorithmType = getAlgorithmByString.get(driftAlgorithm);
  const algorithm = thresholdAlgorithmMap.get(algorithmType);

  return (
    <div className={styles.columnCardContent} style={{ width: 'auto' }}>
      <WhyLabsText inherit className={cx(styles.hellingerTitle)}>
        Set drift threshold
      </WhyLabsText>
      <div style={{ width: '180px' }}>
        <WhyLabsNumberInput
          id="driftThresholdInput"
          onChange={(newValue) => {
            if (newValue)
              setCustomMonitor((prevState) => ({
                ...prevState,
                driftThreshold: newValue,
              }));
          }}
          value={driftThreshold}
          label={mapAlgorithmsName.get(algorithmType) ?? ''}
          min={algorithm?.min ?? 0}
          max={algorithm?.max}
          precision={4}
          step={0.01}
          placeholder={algorithm?.tooltip ?? ''}
          required
        />
      </div>
    </div>
  );
};
