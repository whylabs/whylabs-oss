import { GetAllSegmentsQuery, useGetAllSegmentsQuery, useGetAnomalyCountsForWidgetQuery } from 'generated/graphql';
import {
  displaySegment,
  simpleStringifySegment,
  ParsedSegment,
  parsedSegmentEquals,
  parseSimpleDisplaySegment,
} from 'pages/page-types/pageUrlQuery';
import { SelectItem } from '@mantine/core';
import { useMemo } from 'react';
import { SelectCustomItems, WhyLabsSelect } from 'components/design-system';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';

export interface SegmentSelectProps {
  onChange(modelId: string, segment: ParsedSegment): void;
  readonly selectedSegment: ParsedSegment;
  readonly selectedModelId: string;
  darkBackground?: boolean;
  overrideLabel?: string;
  disabled?: boolean;
  disabledTooltip?: string;
}

type QueryReturnType = Exclude<GetAllSegmentsQuery['model'], undefined | null>['segments'][number];

/**
 * Shows a select/dropdown of all the segments in the current resource.
 */
export function SegmentSelect({
  onChange,
  selectedSegment,
  selectedModelId,
  darkBackground = true,
  overrideLabel,
  disabled,
  disabledTooltip,
}: SegmentSelectProps): JSX.Element | null {
  const { dateRange, loading: loadingDateRange } = useSuperGlobalDateRange();
  const { data, error, loading } = useGetAllSegmentsQuery({
    variables: {
      dataset: selectedModelId,
      ...dateRange,
    },
    skip: !selectedModelId || loadingDateRange,
  });
  const {
    data: overallData,
    error: overallError,
    loading: overallLoading,
  } = useGetAnomalyCountsForWidgetQuery({
    variables: {
      datasetId: selectedModelId,
      tags: [],
      ...dateRange,
    },
    skip: !selectedModelId || loadingDateRange,
  });

  const overallAnomalyCount = overallData?.anomalyCounts?.totals.reduce((acc, curr) => acc + curr.count, 0) ?? 0;
  const [encodeSegment, parseSegmentString] = [simpleStringifySegment, parseSimpleDisplaySegment];

  if (error) {
    console.error("Couldn't load segments for the segment select");
  }
  if (overallError) {
    console.error("Couldn't load overall anomaly counts for the segment select");
  }

  const allSegmentsList = getAllSegmentsList();

  if (selectedSegment.tags.length > 0) {
    allSegmentsList.unshift({ tags: [], anomalyCounts: { totals: [] } });
  }

  const selectItems: SelectItem[] = useMemo(
    () =>
      allSegmentsList.map((segment) => {
        const totalAnomalies = countSegmentAnomalies(segment);
        if (segment.tags.length === 0) {
          return {
            value: '',
            label: 'All data',
            totalAnomalies: overallAnomalyCount,
            group: 'Overall',
          };
        }
        return {
          value: encodeSegment(segment),
          label: displaySegment(segment),
          totalAnomalies,
          group: totalAnomalies ? 'Segments with anomalies' : 'Segments with no anomalies',
        };
      }),
    [allSegmentsList, encodeSegment, overallAnomalyCount],
  );

  if (allSegmentsList?.length === 0 || error) return <></>;

  return (
    <WhyLabsSelect
      id="segment-model-selector"
      darkBackground={darkBackground}
      data={selectItems}
      disabled={disabled}
      disabledTooltip={disabledTooltip}
      label={overrideLabel || 'Select segment'}
      placeholder="Select segment"
      itemComponent={SelectCustomItems.LabelWithLineBreakAndAnomalyCount}
      clearable={false}
      value={selectedSegment ? encodeSegment(selectedSegment) : ''}
      loading={loading || overallLoading}
      onChange={(event) => {
        onChange(selectedModelId, parseSegmentString(event ?? ''));
      }}
    />
  );

  function countSegmentAnomalies(segment: QueryReturnType): number {
    return segment?.anomalyCounts?.totals.reduce((acc, curr) => acc + curr.count, 0) ?? 0;
  }

  function getAllSegmentsList(): QueryReturnType[] {
    const list = data?.model?.segments ?? [];

    const selectedSegmentExists = list?.find((segment) => parsedSegmentEquals(segment, selectedSegment));
    const finalList = selectedSegmentExists ? list : [selectedSegment, ...list];
    finalList.sort((a, b) => {
      if (a.tags.length === 0) return -1;
      if (b.tags.length === 0) return 1;
      return countSegmentAnomalies(b) - countSegmentAnomalies(a);
    });
    return finalList;
  }
}
