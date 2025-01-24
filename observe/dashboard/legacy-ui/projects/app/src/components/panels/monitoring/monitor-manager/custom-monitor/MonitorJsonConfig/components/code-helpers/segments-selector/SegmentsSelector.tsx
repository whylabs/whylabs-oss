import { WhyLabsButton, WhyLabsText } from 'components/design-system';
import { IconCopy } from '@tabler/icons';
import { useSegmentFilter } from 'pages/model-page/model-segments/hooks/useSegmentFilter';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { createStyles, Skeleton, CloseButton } from '@mantine/core';
import { SegmentTag, useSegmentsListingQuery } from 'generated/graphql';
import { useMemo, useState } from 'react';
import { Colors } from '@whylabs/observatory-lib';
import { getSegmentTags } from 'pages/page-types/pageUrlQuery';
import { arrayOfLength } from 'utils/arrayUtils';
import { Segment } from 'generated/monitor-schema';
import isEqual from 'lodash/isEqual';
import WhyLabsCodeBlock from 'components/whylabs-code-block/WhyLabsCodeBlock';
import { useWhyLabsSnackbar } from 'hooks/useWhyLabsSnackbar';
import useSelectedSegments from 'hooks/useSelectedSegments';

export const segmentIsEquals = (a: SegmentTag[], b: SegmentTag[]): boolean => {
  const mapSegment = (tags: SegmentTag[]) => tags.map(({ key, value }) => ({ key, value }));
  const segmentA = mapSegment(a);
  const segmentB = mapSegment(b);
  return isEqual(segmentA, segmentB);
};

const useStyles = createStyles(() => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    color: 'black',
    fontWeight: 600,
  },
  button: {
    marginTop: '10px',
  },
  segmentsList: {
    overflow: 'hidden auto',
    width: '100%',
    maxHeight: '150px',
    minHeight: '50px',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    margin: '10px 0',
    border: `1px solid ${Colors.brandSecondary300}`,
    borderRadius: '4px',
    display: 'flex',
    flexDirection: 'column',
  },
  segmentButton: {
    height: 'min-content',
    border: 'unset',
    padding: 0,
    textAlign: 'left',
    width: '100%',
    background: 'unset',
  },
  text: {
    width: '100%',
    placeSelf: 'start',
    overflow: 'hidden',
    color: Colors.brandPrimary700,
    textOverflow: 'ellipsis',
    lineHeight: 1.5,
    padding: '4px 12px',
    textDecoration: 'underline dashed',
    textUnderlineOffset: '4px',
  },
  skeletonContainer: {
    padding: '8px',
    width: 'auto',
  },
  selectedSegment: {
    display: 'grid',
    justifyContent: 'space-between',
    gridTemplateColumns: 'auto auto',
  },
  removeSegment: {
    padding: '4px 12px',
    paddingLeft: '0px',
  },
  codeBlock: {
    maxHeight: '200px',
  },
}));

export const SegmentsSelector: React.FC = () => {
  const { modelId } = usePageTypeWithParams();
  const { onChange: onChangeSegments, selectedSegment } = useSelectedSegments();
  const { renderFilter } = useSegmentFilter({
    allowWildcardSegment: true,
    onChange: onChangeSegments,
    resourceId: modelId,
    selectedSegment,
  });
  const { data, loading, error } = useSegmentsListingQuery({ variables: { modelId, tags: selectedSegment } });
  const { classes } = useStyles();
  const [targetedSegments, setTargetedSegments] = useState<Segment[]>([]);
  const { enqueueSnackbar } = useWhyLabsSnackbar();
  const mergedData = useMemo(() => {
    if (!data?.model || loading || error) return [];
    const segments = [...data.model.segments];
    const mergedSegment = data.model?.mergedSegment;
    if (mergedSegment?.tags.length) segments.unshift(mergedSegment);
    return segments;
  }, [data?.model, error, loading]);
  const code = targetedSegments.length ? JSON.stringify(targetedSegments, null, 4) : null;
  if (error) {
    console.error(`error to load segments list`, error);
  }

  const renderSkeleton = () => {
    return (
      <div className={classes.skeletonContainer}>
        {arrayOfLength(5).map((i) => (
          <Skeleton key={`segment-load-${i}`} height={20} mb={5} mt={5} />
        ))}
      </div>
    );
  };

  const handleSegmentSelected = (tags: SegmentTag[]) => {
    setTargetedSegments((selected) => [...selected, { tags }]);
  };

  const unselectSegment = (index: number) => {
    setTargetedSegments((selected) => {
      const segments = [...selected];
      segments.splice(index, index + 1);
      return segments;
    });
  };

  const copyToClipboard = () => {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() =>
      enqueueSnackbar({
        title: 'Code copied!',
      }),
    );
  };

  return (
    <div className={classes.root}>
      {renderFilter({
        label: 'Filter segments',
        labelTooltip: 'Click on segments to use for generate the segment targeting expression',
        maxDropdownHeight: 400,
      })}
      <div className={classes.segmentsList}>
        {targetedSegments.map((seg, index) => (
          <div className={classes.selectedSegment}>
            <WhyLabsText size={14} displayTooltip className={classes.text}>
              {getSegmentTags(seg).join(' | ')}
            </WhyLabsText>
            <div className={classes.removeSegment}>
              <CloseButton onClick={() => unselectSegment(index)} title="Unselect segment" size="md" iconSize={14} />
            </div>
          </div>
        ))}
        {loading && renderSkeleton()}
        {mergedData
          .filter(({ tags }) => !targetedSegments.find(({ tags: selectedTags }) => segmentIsEquals(tags, selectedTags)))
          .map((s) => (
            <button
              type="button"
              onClick={() => handleSegmentSelected(s.tags.map(({ key, value }) => ({ key, value })))}
              className={classes.segmentButton}
            >
              <WhyLabsText size={14} displayTooltip className={classes.text}>
                {getSegmentTags(s).join(' | ')}
              </WhyLabsText>
            </button>
          ))}
      </div>
      <WhyLabsCodeBlock
        className={classes.codeBlock}
        key="helpers.segment-targeting"
        disableCopy
        code={code ?? '// Select segments to generate code snippet'}
        language="json"
      />
      <div className={classes.button}>
        <WhyLabsButton
          width="fit-content"
          variant="outline"
          color="gray"
          disabled={!code}
          disabledTooltip="Select segments to copy the generated code snippet"
          onClick={copyToClipboard}
          leftIcon={<IconCopy stroke={1} size={18} />}
        >
          Copy to clipboard
        </WhyLabsButton>
      </div>
    </div>
  );
};
