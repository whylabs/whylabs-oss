import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FormControlLabel, RadioGroup } from '@material-ui/core';
import WhyRadio from 'components/controls/widgets/WhyRadio';
import MultiSelectModal from 'components/multiselect-modal/MultiSelectModal';
import { useRecoilState } from 'recoil';
import { customMonitorAtom } from 'atoms/customMonitorAtom';
import { useCustomMonitor } from 'hooks/useCustomMonitor';
import { tooltips } from 'strings/tooltips';
import { upperCaseFirstLetterOnly } from 'utils/stringUtils';
import { HtmlTooltip } from '@whylabs/observatory-lib';
import { WhyLabsNumberInput, WhyLabsText } from 'components/design-system';
import RightPanel from '../RightPanel';
import useCustomMonitorManagerCSS from '../../../../useCustomMonitorManagerCSS';
import { ColumnCardContentProps } from '../../../phaseCard';
import { DiscreteTypeOption, discreteTypeOptions } from '../../../../CustomMonitorTypes';
import RadioWrap from '../../../../RadioWrap';
import useSelectCardData, { FeatureItem } from '../SelectCard/useSelectCardData';
import DriftConfigurationCard from '../DriftConfigurationCard/DriftConfigurationCard';
import DataQualityAnalysis from '../../../use-case/data-quality/DataQualityAnalysis';
import { getDataQualityValue } from '../../../use-case/data-quality/DataQualityOptions';
import ReadModeMonitorManager from '../../../ReadModeMonitorManager';
import { FeatureSelection, featureSelectionOptions } from './featureOptions';

export default function FeatureTypeSelectCard({
  setContentHeight,
  isPhaseActive,
  editMode,
  setWidthSpan,
  setHasChanged,
}: ColumnCardContentProps): JSX.Element {
  const { classes: styles } = useCustomMonitorManagerCSS();
  const ref = useRef<HTMLDivElement>(null);
  const [
    {
      useCase,
      discreteType,
      featureSelection,
      driftOption,
      modelPerformanceConfig,
      lower,
      upper,
      factor,
      metric,
      featuresQueryData,
      includedFeatures,
    },
    setCustomMonitor,
  ] = useRecoilState(customMonitorAtom);
  const [openModal, setOpenModal] = useState(false);
  const [selectedFeatures, setSelectedFeatures] = useState<FeatureItem[]>([]);
  const { inputs, outputs, discreteCount, nonDiscreteCount } = useSelectCardData({
    setSelectedFeatures,
  });

  const usedFeatures: FeatureItem[] = useMemo(() => {
    if (driftOption === 'input') return inputs;
    if (driftOption === 'output') return outputs;
    return [...inputs, ...outputs];
  }, [driftOption, inputs, outputs]);

  const usedDiscreteType = useMemo(() => {
    if (discreteType) return discreteType;
    if (includedFeatures[0] === 'group:discrete') {
      return 'discrete';
    }
    if (includedFeatures[0] === 'group:continuous') {
      return 'non-discrete';
    }
    if (includedFeatures[0] === '*') {
      return 'both';
    }
    return 'both';
  }, [discreteType, includedFeatures]);

  const { clearSelectedFeatures } = useCustomMonitor();
  const isDataQuality = ['unique_est', 'unique_est_ratio', 'count_null', 'count_null_ratio'].includes(metric);
  const isInferred = metric === 'inferred_data_type';
  const disableDiscrete = discreteCount === 0;
  const disableNonDiscrete = nonDiscreteCount === 0;

  const setNewIncludedFeatures = useCallback(
    (newIncludedFeatures: string[]) =>
      setCustomMonitor((prevState) => ({ ...prevState, includedFeatures: newIncludedFeatures })),
    [setCustomMonitor],
  );

  const setFeatureSelection = useCallback(
    (newFeatureSeleciton: FeatureSelection) =>
      setCustomMonitor((prevState) => ({ ...prevState, featureSelection: newFeatureSeleciton })),
    [setCustomMonitor],
  );

  const setNewDiscreteType = useCallback(
    (newDiscrete: DiscreteTypeOption) => {
      const isDrift = useCase === 'Drift';
      const updatedDriftMetric = newDiscrete === 'discrete' ? 'frequent_items' : 'histogram';
      setCustomMonitor((prevState) => ({
        ...prevState,
        discreteType: newDiscrete,
        ...(isDrift ? { metric: updatedDriftMetric } : {}),
      }));
    },
    [setCustomMonitor, useCase],
  );

  const getCurrentDiscreteType = useCallback((): DiscreteTypeOption => {
    if (disableDiscrete && !disableNonDiscrete) {
      return 'non-discrete';
    }
    if (!disableDiscrete && disableNonDiscrete) {
      return 'discrete';
    }
    return 'both';
  }, [disableDiscrete, disableNonDiscrete]);

  useEffect(() => {
    if (editMode || !isPhaseActive) {
      return;
    }
    if (useCase === 'Drift' && usedDiscreteType === 'both') {
      setNewDiscreteType(disableDiscrete ? 'non-discrete' : 'discrete');
    }
  }, [
    usedDiscreteType,
    setNewDiscreteType,
    metric,
    editMode,
    isPhaseActive,
    disableDiscrete,
    disableNonDiscrete,
    useCase,
  ]);

  useEffect(() => {
    if (!editMode) {
      setNewIncludedFeatures([]);
      setSelectedFeatures([]);
    }
  }, [driftOption, setNewIncludedFeatures, editMode]);

  useEffect(() => {
    if (editMode) return;
    setNewDiscreteType(getCurrentDiscreteType());
  }, [editMode, getCurrentDiscreteType, setNewDiscreteType]);

  const [featuresByWeight, setFeaturesByWeight] = useState<{ [key in DiscreteTypeOption]?: FeatureItem[] }>({});
  const isTopK = featureSelection === 'top_k';

  const usedFeaturesByWeight = useMemo(() => {
    const cachedValue = usedDiscreteType && featuresByWeight[usedDiscreteType];
    if (cachedValue) {
      return cachedValue;
    }
    const filteredFeatures = [...usedFeatures]
      .filter((feature) => typeof feature.weight === 'number')
      .sort((a, b) => {
        const aWeight = Math.abs(a.weight ?? 0);
        const bWeight = Math.abs(b.weight ?? 0);
        return bWeight - aWeight;
      });
    setFeaturesByWeight((cache) => {
      return {
        ...cache,
        [usedDiscreteType]: filteredFeatures,
      };
    });
    return filteredFeatures;
  }, [usedDiscreteType, featuresByWeight, usedFeatures]);

  const featureImportanceCount = useMemo(
    () =>
      usedFeatures.reduce((count, feature) => {
        return count + (typeof feature?.weight === 'number' ? 1 : 0);
      }, 0),
    [usedFeatures],
  );
  const minTopK = Math.min(featureImportanceCount, 10);
  const [topKSelected, setTopKSelected] = useState<number>(0);
  const topKNumber = topKSelected || minTopK;

  const featuresCountMap = new Map<FeatureSelection, number>([
    ['all', usedFeatures.length],
    ['selected', selectedFeatures.length],
    ['top_k', topKNumber],
  ]);

  const featureCount = featuresCountMap.get(featureSelection ?? 'all') ?? 0;

  const validateTopK = useCallback(
    (value?: number) => {
      setTopKSelected((currentTopK) => {
        const topK = value || currentTopK;
        if (topK > featureImportanceCount) {
          return featureImportanceCount;
        }
        return topK;
      });
    },
    [featureImportanceCount],
  );

  useEffect(() => {
    if (isTopK && usedFeaturesByWeight.length) {
      const topKFeatures = usedFeaturesByWeight.slice(0, topKNumber);
      setSelectedFeatures(topKFeatures);
      setNewIncludedFeatures(topKFeatures.map((f) => f.label));
    }
  }, [featureSelection, isTopK, setNewIncludedFeatures, topKNumber, usedFeaturesByWeight]);

  const changeTopK = (value: number) => {
    if (editMode) return;
    validateTopK(value);
  };

  useEffect(() => {
    validateTopK();
  }, [validateTopK]);

  useEffect(() => {
    if (ref.current) {
      setContentHeight(ref.current.clientHeight);
    }
  }, [ref.current?.clientHeight, setContentHeight]);

  if (isPhaseActive) {
    setWidthSpan(2);
  }
  const showTypeTooltip = (type: string) => {
    if (type === 'discrete' && disableDiscrete) return true;
    if (type === 'non-discrete' && disableNonDiscrete) return true;
    if (type === 'both' && (metric === 'frequent_items' || metric === 'histogram')) return true;
    return false;
  };

  const getDisabledTooltipForType = (type: typeof discreteTypeOptions[number]['value']): string => {
    if (type === 'discrete' || type === 'non-discrete') {
      return tooltips.config_feature_type_disabled;
    }
    return tooltips.config_feature_both_type_disabled;
  };
  const getDescriptorFromType = (type: typeof discreteTypeOptions[number]['value']): string => {
    switch (type) {
      case 'both':
        return '';
      default:
        return type;
    }
  };
  const shouldBeDisabledByDiscreteType = (type: typeof discreteTypeOptions[number]['value']): boolean => {
    if (type === 'both' && useCase === 'Drift') {
      return true;
    }
    return type === 'non-discrete' ? disableNonDiscrete : disableDiscrete;
  };
  const generateClosedCardTitle = useCallback(() => {
    return featureCount === 1
      ? `${featureCount} ${getDescriptorFromType(usedDiscreteType)} column selected`
      : `${featureCount} ${getDescriptorFromType(usedDiscreteType)} columns selected`;
  }, [usedDiscreteType, featureCount]);

  if (!isPhaseActive) {
    setWidthSpan(isDataQuality && !isInferred ? 3 : 1);
    return !isDataQuality || isInferred ? (
      <ReadModeMonitorManager label="Columns" text={generateClosedCardTitle()} />
    ) : (
      <div style={{ display: 'flex' }}>
        <WhyLabsText inherit className={styles.columnCompleteStateComponent} style={{ width: '250px' }}>
          <ReadModeMonitorManager label="Columns" text={generateClosedCardTitle()} />
          <div className={styles.customBorder} />
        </WhyLabsText>
        <WhyLabsText inherit className={styles.columnCompleteStateComponent} style={{ width: '250px' }}>
          <ReadModeMonitorManager label="Threshold type" text={upperCaseFirstLetterOnly(modelPerformanceConfig)} />
          <div className={styles.customBorder} />
        </WhyLabsText>
        <ReadModeMonitorManager
          label="Threshold values"
          text={
            modelPerformanceConfig === 'static threshold'
              ? `${lower} <= x <= ${upper}`
              : `${factor} standard deviations`
          }
        />
      </div>
    );
  }

  return (
    <div ref={ref} className={styles.columnCardContentWrap}>
      <div className={styles.columnCardFlex}>
        <div className={styles.columnCardContent} style={{ marginLeft: '0px', minWidth: '225px' }}>
          <WhyLabsText inherit className={styles.columnCardText}>
            What type of column should be analyzed for{'  '}
            {isDataQuality || isInferred ? (
              <span style={{ fontWeight: 600 }}>{getDataQualityValue(metric)}?</span>
            ) : (
              'distribution drift?'
            )}
          </WhyLabsText>
          <RadioGroup
            value={usedDiscreteType}
            style={{ width: '90%' }}
            onChange={(element) => {
              const { value } = element.target;
              setCustomMonitor((prevState) => ({
                ...prevState,
                discreteType: value as DiscreteTypeOption,
                metric:
                  !isDataQuality && !isInferred
                    ? discreteTypeOptions.find((o) => o.value === value)!.correlatedMetric
                    : prevState.metric,
              }));
              if (value !== 'both') {
                setSelectedFeatures([]);
              }
            }}
          >
            {discreteTypeOptions.map((option) => (
              <RadioWrap key={`${option.value}`} disabled={editMode} tooltip={tooltips.edit_mode_config_disabled}>
                <div style={{ marginBottom: '10px' }}>
                  <FormControlLabel
                    style={{ marginRight: '0px' }}
                    disabled={editMode || shouldBeDisabledByDiscreteType(option.value)}
                    value={option.value}
                    label={
                      <span>
                        <b>{option.label}</b> columns
                        <HtmlTooltip
                          tooltipContent={
                            showTypeTooltip(option.value) ? getDisabledTooltipForType(option.value) : option.tooltip
                          }
                        />
                      </span>
                    }
                    className={styles.cardRadioControl}
                    control={<WhyRadio />}
                  />
                </div>
              </RadioWrap>
            ))}
          </RadioGroup>
          <WhyLabsText inherit className={styles.columnCardText}>
            Which columns do you want to target?
          </WhyLabsText>
          <RadioGroup
            value={featureSelection}
            onChange={(element) => {
              const { value } = element.target;
              if (value === 'all') clearSelectedFeatures();
              setFeatureSelection(value as FeatureSelection);
            }}
          >
            {featureSelectionOptions.map((option) => {
              const topK = option.value === 'top_k';
              if (topK && !featuresQueryData?.model?.weightMetadata?.hasWeights) {
                return null;
              }
              return (
                <RadioWrap key={`${option.value}`} disabled={editMode} tooltip={tooltips.edit_mode_config_disabled}>
                  <>
                    <div>
                      <FormControlLabel
                        style={{ marginRight: '0px' }}
                        disabled={editMode}
                        value={option.value}
                        label={<span>{option.label}</span>}
                        className={styles.cardRadioControl}
                        control={<WhyRadio />}
                      />
                      <HtmlTooltip tooltipContent={option.tooltip} />
                    </div>
                    {topK && (
                      <div style={{ marginLeft: '28px' }}>
                        <span className={styles.maxTopKLabel}>
                          Max {featureImportanceCount} (columns with importance scores)
                        </span>
                        <WhyLabsNumberInput
                          disabled={featureSelection !== 'top_k' || editMode}
                          label="How many columns?"
                          hideLabel
                          placeholder="How many ?"
                          min={1}
                          max={featureImportanceCount}
                          value={topKNumber}
                          onChange={changeTopK}
                        />
                      </div>
                    )}
                  </>
                </RadioWrap>
              );
            })}
          </RadioGroup>
        </div>

        <RightPanel
          number={featureCount}
          title={featureCount > 0 ? 'Total columns selected' : 'No columns selected'}
          hideButton={featureSelection === 'all'}
          buttonText={editMode || isTopK ? 'Show selected' : 'Select columns'}
          onClick={() => {
            setOpenModal(true);
          }}
        />
      </div>
      {isDataQuality || isInferred ? (
        <DataQualityAnalysis
          editMode={editMode}
          setContentHeight={setContentHeight}
          isPhaseActive={isPhaseActive}
          setHasChanged={setHasChanged}
          setWidthSpan={setWidthSpan}
        />
      ) : (
        <DriftConfigurationCard editMode={editMode} />
      )}

      <MultiSelectModal
        isModalOpen={openModal}
        enableWeightSorting={!!featuresQueryData?.model?.weightMetadata?.hasWeights}
        onClose={() => setOpenModal(false)}
        items={usedFeatures}
        isTopK={isTopK}
        selectedItems={selectedFeatures}
        onCancel={() => {
          setOpenModal(false);
        }}
        onSave={() => {
          setOpenModal(false);
          if (editMode) return;
          setNewIncludedFeatures(selectedFeatures.map((f) => f.label));
        }}
        onChange={(value) => {
          if (editMode) return;
          setSelectedFeatures(value);
          setFeatureSelection('selected');
        }}
        title={`${editMode || isTopK ? 'Selected' : 'Select'} from ${usedFeatures?.length} ${getDescriptorFromType(
          usedDiscreteType,
        )} columns`}
        readonly={editMode}
      />
    </div>
  );
}
