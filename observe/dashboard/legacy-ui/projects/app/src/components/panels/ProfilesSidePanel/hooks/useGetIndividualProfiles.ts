import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { useContext, useMemo } from 'react';
import { GetIndividualProfilesQueryResult, useGetIndividualProfilesQuery } from 'generated/graphql';
import { LabelWithLineBreakData } from 'components/design-system/select/custom-items/LabelWithLineBreak';
import { timeLong } from 'utils/dateUtils';
import { NumberOrString } from 'utils/queryUtils';
import { ProfilesPageContext } from 'pages/model-page/context/ProfilesPageContext';

interface GetIndividualProfilesReturnType {
  data: GetIndividualProfilesQueryResult['data'];
  selectMappedData: LabelWithLineBreakData[];
}
interface GetIndividualProfilesProps {
  from: number;
  to: number;
}
export const useGetIndividualProfiles = (
  selectionInputId: NumberOrString,
  selectedIndividualProfiles: string[],
  dateRange?: GetIndividualProfilesProps,
): GetIndividualProfilesReturnType => {
  const { modelId } = usePageTypeWithParams();
  const [{ selectionInputs }, dispatchSidePanel] = useContext(ProfilesPageContext);
  const { data, error } = useGetIndividualProfilesQuery({
    variables: {
      modelId,
      ...dateRange!,
    },
    skip: true,
  });
  const individualProfilesCount = data?.model?.individualProfileList?.length ?? 0;
  const selectionInputIndex = selectionInputs.findIndex((s) => s.id === selectionInputId);
  if (
    data?.model &&
    selectionInputIndex !== -1 &&
    individualProfilesCount !== selectionInputs[selectionInputIndex].individualProfilesCount
  ) {
    const tempInputs = [...selectionInputs];
    tempInputs[selectionInputIndex] = { id: selectionInputId, individualProfilesCount };
    dispatchSidePanel({ selectionInputs: tempInputs });
  }

  if (error) {
    console.log(error, `error to fetch individual profiles`);
  }

  const selectMappedData = useMemo(() => {
    const profilesWithTracingId = data?.model?.individualProfileList?.filter((p) => p.traceId) ?? [];
    if (!profilesWithTracingId?.length) return [];
    const mappedData: LabelWithLineBreakData[] = profilesWithTracingId.map((p) => ({
      label: p.traceId ?? p.datasetTimestamp?.toString() ?? '',
      value: p.retrievalToken,
      bottomText: p.datasetTimestamp ? timeLong(p.datasetTimestamp) : undefined,
      group: `Individual profiles with trace IDs (${profilesWithTracingId.length})`,
      disabled: selectedIndividualProfiles.includes(p.retrievalToken),
      disabledTooltip: 'Individual profile already selected',
    }));
    mappedData.unshift({
      label: timeLong(dateRange?.from ?? 0),
      value: dateRange?.from.toString() ?? '',
      group: 'Merged batch profile',
    });
    return mappedData;
  }, [data?.model?.individualProfileList, dateRange?.from, selectedIndividualProfiles]);

  return {
    data,
    selectMappedData,
  };
};
