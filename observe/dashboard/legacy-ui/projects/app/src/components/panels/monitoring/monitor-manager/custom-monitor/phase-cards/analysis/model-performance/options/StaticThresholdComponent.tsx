import { useEffect, useRef } from 'react';
import { useRecoilState } from 'recoil';
import { customMonitorAtom } from 'atoms/customMonitorAtom';
import NewCustomNumberInput from 'components/form-fields/NewCustomNumberInput';
import { WhyLabsText } from 'components/design-system';
import { ColumnCardContentProps } from '../../../phaseCard';
import useCustomMonitorManagerCSS from '../../../../useCustomMonitorManagerCSS';
import ReadModeMonitorManager from '../../../ReadModeMonitorManager';

const StaticThresholdComponent = ({ setContentHeight, isPhaseActive }: ColumnCardContentProps): JSX.Element => {
  const { classes: styles } = useCustomMonitorManagerCSS();
  const [{ lower, upper }, setRecoilState] = useRecoilState(customMonitorAtom);
  const ref = useRef<HTMLDivElement>(null);
  const displayValue = `${lower} <= x <= ${upper}`;

  useEffect(() => {
    if (ref.current) {
      setContentHeight(ref.current.clientHeight || 0);
    }
  }, [ref.current?.clientHeight, setContentHeight, isPhaseActive, isPhaseActive]);

  if (!isPhaseActive) return <ReadModeMonitorManager label="Threshold value" text={displayValue} />;

  return (
    <div ref={ref} className={styles.columnCardContentWrap}>
      <WhyLabsText inherit className={styles.columnCardTitle}>
        Static threshold
      </WhyLabsText>
      <NewCustomNumberInput
        id="staticThresholdInput2"
        value={lower ?? null}
        onChange={(newValue: number | null) => {
          setRecoilState((prevState) => ({
            ...prevState,
            lower: newValue ?? undefined,
          }));
        }}
        label="Lower threshold"
        placeholder="Value"
        max={upper}
        required
        step="any"
      />
      <NewCustomNumberInput
        id="staticThresholdInput1"
        value={upper ?? null}
        onChange={(newValue: number | null) => {
          setRecoilState((prevState) => ({
            ...prevState,
            upper: newValue ?? undefined,
          }));
        }}
        label="Upper threshold"
        placeholder="Value"
        min={lower}
        required
        step="any"
      />
      <WhyLabsText inherit className={styles.columnCardText}>
        Alert will trigger if below the lower threshold or above the upper threshold
      </WhyLabsText>
    </div>
  );
};

// potentialy usefull: setCustomValidity ==> https://stackoverflow.com/questions/43785821/html5-validation-check-input-bigger-than-0

export default StaticThresholdComponent;
