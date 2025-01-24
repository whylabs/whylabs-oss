import { WhyLabsHeader } from 'components/panels/header/WhyLabsHeader';
import { SegmentSelect } from 'pages/segment-page/SegmentSelect';
import { useCallback, useContext } from 'react';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { ParsedSegment } from 'pages/page-types/pageUrlQuery';
import { DashboardTabsContext } from 'pages/llm-dashboards/DashboardTabsContext';
import { WhyLabsSuperDatePicker } from 'components/super-date-picker/WhyLabsSuperDatePicker';
import { useExtraRangePresets } from 'components/super-date-picker/hooks/useExtraRangePresets';
import { useGetModelBatchFrequencyQuery } from 'generated/graphql';
import {
  TEMP_COMPARED_END_DATE_RANGE,
  TEMP_COMPARED_RANGE_PRESET,
  TEMP_COMPARED_START_DATE_RANGE,
} from 'types/navTags';
import { DashboardKeyType, DEFAULT_SELECT_WIDTH } from '../utils';
import { useSelectCompareResource } from '../hooks/useSelectCompareResource';

export const DashboardHeader: React.FC = () => {
  const { compareWithResourceSelector } = useSelectCompareResource();
  const { modelId } = usePageTypeWithParams();
  const [{ compareWithResourceId, primarySelectedSegment, secondarySelectedSegment }, dispatchTabs] =
    useContext(DashboardTabsContext);

  const { data: secondaryModelInfo, loading: secondaryModelInfoLoading } = useGetModelBatchFrequencyQuery({
    variables: {
      model: compareWithResourceId!,
    },
    skip: !compareWithResourceId,
  });
  const mountSegmentSelector = useCallback(
    (
      label: string,
      resourceId: string,
      activeSegments: ParsedSegment | null,
      keyType: DashboardKeyType,
      disabled?: boolean,
    ) => {
      const selectedSegment = activeSegments ?? { tags: [] };
      return (
        <div style={{ width: DEFAULT_SELECT_WIDTH }}>
          <SegmentSelect
            darkBackground={false}
            overrideLabel={label}
            disabled={disabled}
            disabledTooltip="Select a resource to compare"
            selectedModelId={resourceId}
            selectedSegment={selectedSegment}
            onChange={(_, segment) => {
              const stateKey = keyType === 'primary' ? 'primarySelectedSegment' : 'secondarySelectedSegment';
              dispatchTabs({ [stateKey]: segment });
            }}
          />
        </div>
      );
    },
    [dispatchTabs],
  );

  const { presets: secondaryModelPresets } = useExtraRangePresets(compareWithResourceId ?? undefined);
  const secondaryPicker = (
    <WhyLabsSuperDatePicker
      timePeriod={secondaryModelInfo?.model?.batchFrequency ?? undefined}
      startDateSearchParamKey={TEMP_COMPARED_START_DATE_RANGE}
      endDateSearchParamKey={TEMP_COMPARED_END_DATE_RANGE}
      dynamicPresetSearchParamKey={TEMP_COMPARED_RANGE_PRESET}
      extraPresetList={[secondaryModelPresets.lineage]}
      loading={secondaryModelInfoLoading}
      label="Select comparison range"
      disabled={!compareWithResourceId}
      shouldTruncateRangeIfNeeded
    />
  );
  const segmentSections = [
    { label: 'id-select-resource-compare-second', inputs: [compareWithResourceSelector] },
    {
      label: 'id-select-comparison-segment',
      element: mountSegmentSelector(
        'Segment comparison',
        compareWithResourceId ?? '',
        secondarySelectedSegment,
        'secondary',
        !compareWithResourceId,
      ),
    },
    { label: 'id-select-secondary-range', element: secondaryPicker },
  ];

  return (
    <>
      <WhyLabsHeader
        sections={[
          {
            label: 'id-select-resource-compare',
            element: mountSegmentSelector('Segment', modelId, primarySelectedSegment, 'primary'),
            dividerAfter: false,
          },
          ...segmentSections,
        ]}
      />
    </>
  );
};
