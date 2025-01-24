import { useEffect, useRef } from 'react';
import { useRecoilState } from 'recoil';
import { customMonitorAtom } from 'atoms/customMonitorAtom';
import NewCustomNumberInput from 'components/form-fields/NewCustomNumberInput';
import { WhyLabsText } from 'components/design-system';
import { ColumnCardContentProps } from '../../../phaseCard';
import useCustomMonitorManagerCSS from '../../../../useCustomMonitorManagerCSS';
import ReadModeMonitorManager from '../../../ReadModeMonitorManager';

const StandardDeviationChangeComponent = ({ setContentHeight, isPhaseActive }: ColumnCardContentProps): JSX.Element => {
  const { classes: styles } = useCustomMonitorManagerCSS();
  const [{ factor }, setRecoilState] = useRecoilState(customMonitorAtom);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      setContentHeight(ref.current.clientHeight || 0);
    }
  }, [ref.current?.clientHeight, setContentHeight, isPhaseActive, isPhaseActive]);

  if (!isPhaseActive) return <ReadModeMonitorManager label="Threshold value" text={factor?.toString() ?? ''} />;

  return (
    <div ref={ref} className={styles.columnCardContentWrap}>
      <WhyLabsText inherit className={styles.columnCardTitle}>
        Standard Deviation
      </WhyLabsText>
      <NewCustomNumberInput
        id="stdDevInput"
        value={factor ?? null}
        onChange={(newValue: number | null) => {
          setRecoilState((prevState) => ({
            ...prevState,
            factor: newValue || undefined,
          }));
        }}
        label="StdDev"
        placeholder="Between 0-10"
        min={0}
        max={10}
        required
        step="0.01"
      />
      <WhyLabsText inherit className={styles.columnCardText}>
        This allows you to set how many standard deviations the value should be within.
      </WhyLabsText>
    </div>
  );
};

export default StandardDeviationChangeComponent;
