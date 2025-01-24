import { useEffect, useRef, useCallback } from 'react';
import { useRecoilState } from 'recoil';
import { RadioGroup, FormControlLabel } from '@material-ui/core';
import { customMonitorAtom } from 'atoms/customMonitorAtom';
import WhyRadio from 'components/controls/widgets/WhyRadio';
import { tooltips } from 'strings/tooltips';
import useGetReferenceProfilesList from 'hooks/useGetReferenceProfilesList';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { WhyLabsText } from 'components/design-system';
import { MonitorBaselineOption, monitorBaselineOptions } from '../../CustomMonitorTypes';
import useCustomMonitorManagerCSS from '../../useCustomMonitorManagerCSS';
import { ColumnCardContentProps } from '../phaseCard';
import RadioWrap from '../../RadioWrap';
import ReadModeMonitorManager from '../ReadModeMonitorManager';

// phase III card I
const MonitorBaseline = ({ setContentHeight, isPhaseActive }: ColumnCardContentProps): JSX.Element => {
  const { classes: styles } = useCustomMonitorManagerCSS();
  const [{ usedBaseline }, setRecoilState] = useRecoilState(customMonitorAtom);
  const ref = useRef<HTMLDivElement>(null);
  const { modelId } = usePageTypeWithParams();
  const { referenceProfiles } = useGetReferenceProfilesList(modelId);
  const disableRefrence = referenceProfiles?.model?.referenceProfiles?.length === 0;

  const setUsedBaseline = useCallback(
    (newUsedBaseline: MonitorBaselineOption) => {
      setRecoilState((prevState) => ({
        ...prevState,
        usedBaseline: newUsedBaseline,
      }));
    },
    [setRecoilState],
  );

  useEffect(() => {
    if (ref.current) {
      setContentHeight(ref.current.clientHeight || 0);
    }
  }, [ref.current?.clientHeight, setContentHeight, usedBaseline, isPhaseActive]);

  if (!isPhaseActive) {
    const usedBaselineLabel = monitorBaselineOptions.find((o) => o.value === usedBaseline)?.label;
    return <ReadModeMonitorManager label="Baseline" text={usedBaselineLabel ?? ''} />;
  }

  return (
    <div ref={ref} className={styles.columnCardContentWrap}>
      <WhyLabsText inherit className={styles.columnCardTitle}>
        Baseline
      </WhyLabsText>
      <WhyLabsText inherit className={styles.columnCardText}>
        What type of baseline should be used as a reference?
      </WhyLabsText>

      <RadioGroup
        value={usedBaseline}
        onChange={(element) => {
          const { value } = element.target;
          setUsedBaseline(value as MonitorBaselineOption);
        }}
      >
        {monitorBaselineOptions.map((option) => (
          <RadioWrap
            disabled={disableRefrence && option.value === 'Reference'}
            tooltip={tooltips.refrence_profile_disabled}
            key={`${option.value}-key`}
          >
            <FormControlLabel
              key={`baseline-option${option.value}`}
              disabled={disableRefrence && option.value === 'Reference'}
              className={styles.cardRadioControl}
              value={option.value}
              label={option.label}
              control={<WhyRadio />}
            />
          </RadioWrap>
        ))}
      </RadioGroup>
    </div>
  );
};

export default MonitorBaseline;
