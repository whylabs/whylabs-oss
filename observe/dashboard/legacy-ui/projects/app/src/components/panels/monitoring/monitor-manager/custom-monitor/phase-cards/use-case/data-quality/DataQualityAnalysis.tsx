import { useEffect } from 'react';
import { FormControlLabel, RadioGroup } from '@material-ui/core';
import WhyRadio from 'components/controls/widgets/WhyRadio';
import { customMonitorAtom } from 'atoms/customMonitorAtom';
import { useRecoilState } from 'recoil';
import { tooltips } from 'strings/tooltips';
import { WhyLabsText } from 'components/design-system';
import { ChangeTypeOption, dataQualityAnalysisType } from '../../../CustomMonitorTypes';
import RadioWrap from '../../../RadioWrap';
import useCustomMonitorManagerCSS from '../../../useCustomMonitorManagerCSS';
import StandardDeviationChangeComponent from '../../analysis/model-performance/options/StandardDeviationChangeComponent';
import { ColumnCardContentProps } from '../../phaseCard';
import StaticThresholdComponent from '../../analysis/model-performance/options/StaticThresholdComponent';

const DataQualityAnalysis = ({
  editMode,
  setContentHeight,
  isPhaseActive,
  setWidthSpan,
  setHasChanged,
}: ColumnCardContentProps): JSX.Element => {
  const { classes: styles, cx } = useCustomMonitorManagerCSS();
  const [{ dataQualityChange, modelPerformanceConfig, metric }, setRecoilState] = useRecoilState(customMonitorAtom);
  const getDataQualityOption = () => {
    switch (metric) {
      case 'count_null':
      case 'count_null_ratio':
        return 'missing values';
      case 'unique_est':
      case 'unique_est_ratio':
        return 'unique values';
      default:
        return '';
    }
  };
  useEffect(() => {
    if (modelPerformanceConfig === 'percentage change') {
      setRecoilState((prev) => ({
        ...prev,
        modelPerformanceConfig: 'standard deviation change',
      }));
    }
  }, [modelPerformanceConfig, setRecoilState]);

  if (metric === 'inferred_data_type') {
    return (
      <div className={cx(styles.columnCardFlex, styles.hellingerContainer)}>
        <WhyLabsText inherit className={styles.columnCardText} style={{ fontWeight: 500, margin: '15px 0' }}>
          This analyzer compares the inferred data type between the target and the baseline.
        </WhyLabsText>
      </div>
    );
  }
  return (
    <div className={cx(styles.columnCardFlex, styles.hellingerContainer)}>
      <div className={styles.columnCardContent} style={{ margin: '15px 0' }}>
        <WhyLabsText inherit className={styles.columnCardText}>
          What type of analysis should be run against the{' '}
          <span style={{ fontWeight: 600 }}>
            {dataQualityChange} of {getDataQualityOption()}
          </span>
          ?
        </WhyLabsText>
        <RadioGroup
          value={modelPerformanceConfig}
          onChange={(element) => {
            const { value } = element.target;
            setRecoilState((prevState) => ({
              ...prevState,
              modelPerformanceConfig: value as ChangeTypeOption,
            }));
          }}
        >
          {dataQualityAnalysisType.map(({ label: option }) => (
            <RadioWrap key={`${option}`} disabled={editMode} tooltip={tooltips.edit_mode_config_disabled}>
              <FormControlLabel
                disabled={editMode}
                value={option}
                label={`${option[0].toUpperCase()}${option.slice(1)}`}
                className={styles.cardRadioControl}
                control={<WhyRadio />}
              />
            </RadioWrap>
          ))}
        </RadioGroup>
      </div>
      {modelPerformanceConfig === 'static threshold' ? (
        <div style={{ position: 'relative', minHeight: '265px' }}>
          <StaticThresholdComponent
            setContentHeight={setContentHeight}
            isPhaseActive={isPhaseActive}
            editMode={editMode}
            setWidthSpan={setWidthSpan}
            setHasChanged={setHasChanged}
          />
        </div>
      ) : (
        <div style={{ position: 'relative', minHeight: '200px' }}>
          <StandardDeviationChangeComponent
            setContentHeight={setContentHeight}
            isPhaseActive={isPhaseActive}
            editMode={editMode}
            setWidthSpan={setWidthSpan}
            setHasChanged={setHasChanged}
          />
        </div>
      )}
    </div>
  );
};

export default DataQualityAnalysis;
