import { WhyLabsText } from '~/components/design-system';
import { useSegmentFilter } from '~/hooks/useSegmentFilter';
import { segmentStringToTags, segmentTagsToString } from '~/utils/segments';
import { JSX, useState } from 'react';

export const WhyLabsSegmentSelectorPlayground = (): JSX.Element => {
  const [selectedSegments, setSelectedSegments] = useState('');
  const [selectedSingleSegment, setSelectedSingleSegment] = useState('');
  const { renderFilter } = useSegmentFilter({
    onChange: (tags) => {
      setSelectedSegments(segmentTagsToString(tags));
    },
    resourceId: 'model-0',
    selectedSegment: segmentStringToTags(selectedSegments),
  });

  const { renderFilter: singleSelectFilter } = useSegmentFilter({
    onChange: (tags) => {
      setSelectedSingleSegment(segmentTagsToString(tags));
    },
    resourceId: 'model-0',
    selectedSegment: segmentStringToTags(selectedSingleSegment),
    singleSegmentSelector: true,
  });
  return (
    <>
      <div style={{ width: 360 }}>
        {renderFilter({
          disabled: false,
          hideIcon: true,
          hideLabel: false,
          label: (
            <WhyLabsText size={14}>
              Segment <span style={{ fontSize: 12, fontWeight: 400 }}>multiple values</span>:
            </WhyLabsText>
          ),
          placeholder: 'Select',
        })}
      </div>

      <div style={{ width: 360 }}>
        {singleSelectFilter({
          disabled: false,
          hideIcon: true,
          hideLabel: false,
          label: <WhyLabsText size={14}>Segment:</WhyLabsText>,
          placeholder: 'Select',
        })}
      </div>
    </>
  );
};
