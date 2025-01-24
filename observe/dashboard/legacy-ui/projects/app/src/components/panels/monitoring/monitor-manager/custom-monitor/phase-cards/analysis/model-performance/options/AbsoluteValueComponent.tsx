import { useEffect, useRef } from 'react';
import { useRecoilState } from 'recoil';
import { customMonitorAtom } from 'atoms/customMonitorAtom';
import NewCustomNumberInput from 'components/form-fields/NewCustomNumberInput';
import { WhyLabsText } from 'components/design-system';
import { ColumnCardContentProps } from '../../../phaseCard';
import useCustomMonitorManagerCSS from '../../../../useCustomMonitorManagerCSS';
import ReadModeMonitorManager from '../../../ReadModeMonitorManager';

const AbsoluteValueComponent = ({ setContentHeight, isPhaseActive }: ColumnCardContentProps): JSX.Element => {
  const { classes: styles } = useCustomMonitorManagerCSS();
  const [{ thresholdAbs }, setRecoilState] = useRecoilState(customMonitorAtom);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      setContentHeight(ref.current.clientHeight || 0);
    }
  }, [ref.current?.clientHeight, setContentHeight, isPhaseActive, isPhaseActive]);

  if (!isPhaseActive) return <ReadModeMonitorManager label="Threshold value" text={thresholdAbs?.toString() ?? ''} />;

  return (
    <div ref={ref} className={styles.columnCardContentWrap}>
      <WhyLabsText inherit className={styles.columnCardTitle}>
        Absolute value change
      </WhyLabsText>
      <NewCustomNumberInput
        id="absoluteValueInput"
        value={thresholdAbs ?? null}
        onChange={(newValue: number | null) =>
          setRecoilState((prevState) => ({
            ...prevState,
            thresholdAbs: newValue || undefined,
          }))
        }
        label="Difference"
        placeholder="Value"
        required
      />
      <WhyLabsText inherit className={styles.columnCardText}>
        This allows you to set the absolute change in value.
      </WhyLabsText>
    </div>
  );
};

export default AbsoluteValueComponent;
