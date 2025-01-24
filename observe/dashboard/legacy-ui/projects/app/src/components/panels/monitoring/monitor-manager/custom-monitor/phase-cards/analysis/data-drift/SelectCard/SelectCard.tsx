import '@kenshooui/react-multi-select/dist/style.css';
import { getSegmentTags } from 'pages/page-types/pageUrlQuery';
import { useGetSemengtsListQuery } from 'generated/graphql';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { SegmentItem } from 'hooks/useCustomMonitor/monitorUtils';
import SelectCardView from './SelectCardView';
import { ColumnCardContentProps } from '../../../phaseCard';

// phase II card II
const SelectSegmentCard = ({
  setContentHeight,
  setWidthSpan,
  isPhaseActive,
  editMode,
  setHasChanged,
}: ColumnCardContentProps): JSX.Element => {
  const { modelId } = usePageTypeWithParams();
  const {
    data: segmentList,
    error,
    loading,
  } = useGetSemengtsListQuery({
    variables: {
      modelId,
    },
  });

  if (loading) {
    return <>Loading...</>;
  }

  if (error || !segmentList?.model?.segments) {
    return <>Error reaching server. Please reload the page to try again.</>;
  }

  const segmentsStringList: SegmentItem[] = segmentList.model.segments.map((s) => {
    const segmentAsString = getSegmentTags(s).join(' ');

    return {
      id: segmentAsString,
      label: segmentAsString,
      tags: s.tags,
    };
  });

  return (
    <SelectCardView
      editMode={editMode}
      setContentHeight={setContentHeight}
      setWidthSpan={setWidthSpan}
      isPhaseActive={isPhaseActive}
      segmentList={segmentsStringList}
      setHasChanged={setHasChanged}
    />
  );
};
export default SelectSegmentCard;
