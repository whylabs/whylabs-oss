import { useEffect, useRef } from 'react';
import { FormControlLabel, RadioGroup } from '@material-ui/core';
import WhyRadio from 'components/controls/widgets/WhyRadio';
import { useRecoilState } from 'recoil';
import { customMonitorAtom } from 'atoms/customMonitorAtom';
import { tooltips } from 'strings/tooltips';
import useCustomMonitorManagerCSS from '../../../useCustomMonitorManagerCSS';
import { ColumnCardContentProps } from '../../phaseCard';
import {
  DataQualityOption,
  dataQualityOptions,
  DataQualityTypeOfChange,
  dataQualityTypeOfChange,
  MetricTypeInUse,
} from '../../../CustomMonitorTypes';
import RadioWrap from '../../../RadioWrap';
import ReadModeMonitorManager from '../../ReadModeMonitorManager';

export const getDataQualityValue = (value: MetricTypeInUse): DataQualityOption => {
  switch (value) {
    case 'unique_est':
    case 'unique_est_ratio':
      return 'unique value changes';
    case 'inferred_data_type':
      return 'inferred data type changes';
    default:
      return 'missing value changes';
  }
};

const DataQualityOptions = ({ setContentHeight, isPhaseActive, editMode }: ColumnCardContentProps): JSX.Element => {
  const { classes: styles } = useCustomMonitorManagerCSS();
  const [{ dataQualityOption, dataQualityChange, metric }, setCustomMonitor] = useRecoilState(customMonitorAtom);
  const ref = useRef<HTMLDivElement>(null);
  const isInferred = metric === 'inferred_data_type';
  useEffect(() => {
    if (ref.current) {
      setContentHeight(ref.current.clientHeight || 0);
    }
  }, [ref.current?.clientHeight, setContentHeight, isPhaseActive, isInferred]);
  const getDataQualityMetric = (value: DataQualityOption, change: DataQualityTypeOfChange) => {
    switch (value) {
      case 'missing value changes':
        return change === 'ratio' ? 'count_null_ratio' : 'count_null';
      case 'unique value changes':
        return change === 'ratio' ? 'unique_est_ratio' : 'unique_est';
      default:
        return 'inferred_data_type';
    }
  };
  const getDataQualityChangeValue = (value: MetricTypeInUse) => {
    if (value === 'unique_est' || value === 'count_null') {
      return 'estimated count';
    }
    return 'ratio';
  };
  if (!isPhaseActive) {
    const label = dataQualityOptions.find((o) => o.value === getDataQualityValue(metric))?.label;
    let finalLabel = '';
    switch (metric) {
      case 'count_null':
        finalLabel = 'Missing value count change';
        break;
      case 'count_null_ratio':
        finalLabel = 'Missing value ratio change';
        break;
      case 'unique_est':
        finalLabel = 'Unique value count change';
        break;
      case 'unique_est_ratio':
        finalLabel = 'Unique value ratio change';
        break;
      case 'inferred_data_type':
        finalLabel = 'Inferred data type changes';
        break;
      default:
        finalLabel = label?.slice(0, -1) ?? '';
    }
    return <ReadModeMonitorManager label="Metric" text={finalLabel} />;
  }
  return (
    <div ref={ref} className={styles.columnCardContentWrap}>
      <p className={styles.listTitle}>Category:</p>
      <RadioGroup
        value={getDataQualityValue(metric)}
        onChange={(element) => {
          const { value } = element.target;
          setCustomMonitor((prevState) => ({
            ...prevState,
            dataQualityOption: value as DataQualityOption,
            metric: getDataQualityMetric(value as DataQualityOption, dataQualityChange),
          }));
        }}
      >
        {dataQualityOptions.map((option) => (
          <RadioWrap disabled={editMode} key={`${option.value}`} tooltip={tooltips.edit_mode_config_disabled}>
            <FormControlLabel
              value={option.value}
              label={option.label}
              disabled={editMode}
              className={styles.cardRadioControl}
              classes={{
                root: styles.cardRadioRoot,
                label: styles.cardRadioLabel,
              }}
              control={<WhyRadio size="medium" />}
            />
          </RadioWrap>
        ))}
      </RadioGroup>
      {!isInferred && <p className={styles.listTitle}>Type of change:</p>}
      {!isInferred && (
        <RadioGroup
          value={editMode ? getDataQualityChangeValue(metric) : dataQualityChange}
          onChange={(element) => {
            const { value } = element.target;
            setCustomMonitor((prevState) => ({
              ...prevState,
              dataQualityChange: value as DataQualityTypeOfChange,
              metric: getDataQualityMetric(dataQualityOption, value as DataQualityTypeOfChange),
            }));
          }}
        >
          {dataQualityTypeOfChange.map((option) => (
            <RadioWrap disabled={editMode} key={`${option.value}`} tooltip={tooltips.edit_mode_config_disabled}>
              <FormControlLabel
                value={option.value}
                label={option.label}
                disabled={editMode}
                className={styles.cardRadioControl}
                classes={{
                  root: styles.cardRadioRoot,
                  label: styles.cardRadioLabel,
                }}
                control={<WhyRadio size="medium" />}
              />
            </RadioWrap>
          ))}
        </RadioGroup>
      )}
    </div>
  );
};

export default DataQualityOptions;
