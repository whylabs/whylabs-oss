import { ApolloError } from '@apollo/client';

import { FeatureWidget } from 'components/controls/widgets';
import SkeletonFeatureWidget from 'components/controls/widgets/SkeletonFeatureWidget';
import { InputsTableTexts } from 'pages/model-page/components/InputsTable/InputsTableTexts';
import { FeatureBasicData } from 'utils/createFeatureBasicData';
import { useResourceText } from 'pages/model-page/hooks/useResourceText';
import { HeaderEmptyFillWidget } from 'components/controls/widgets/HeaderEmptyFillWidget';
import BatchFrequencyWidget from 'components/controls/widgets/BatchFrequencyWidget';
import ProfileLineageWidget from 'components/controls/widgets/ProfileLineageWidget';
import FeatureControlWidget from 'components/controls/widgets/FeatureControlWidget';
import { useFeatureWidgetStyles } from 'hooks/useFeatureWidgetStyles';
import { WhyLabsText, WhyLabsTooltip } from 'components/design-system';
import { simpleStringifySegment } from 'pages/page-types/pageUrlQuery';
import { useSegmentFilter } from 'pages/model-page/model-segments/hooks/useSegmentFilter';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import useSelectedSegments from 'hooks/useSelectedSegments';
import { useFeatureHeaderPanelViewStyles } from './FeatureHeaderPanelViewCSS';

const COMMON_TEXTS = {
  featureDetailPageBatchesInRangeTooltipContent: 'The total number of batches within the selected date range.',
  segmentCompareSelect: 'The segment to compare against the overal population in this feature.',
};

const PAGE_TEXTS = {
  DATA: {
    ...COMMON_TEXTS,
    ...InputsTableTexts.DATA,
    errorMessage: 'Column error',
    inferredFeatureType: 'Inferred column type',
    outputTitle: 'Output',
    featureDetailTooltipContent: 'The current column being displayed',
    featureTitle: 'Column',
  },
  MODEL: {
    ...COMMON_TEXTS,
    ...InputsTableTexts.MODEL,
    errorMessage: 'Feature error',
    inferredFeatureType: 'Inferred feature type',
    outputTitle: 'Output',
    featureDetailTooltipContent: 'The current feature being displayed',
    featureTitle: 'Feature',
  },
  LLM: {
    ...COMMON_TEXTS,
    ...InputsTableTexts.MODEL,
    errorMessage: 'Metric error',
    inferredFeatureType: 'Inferred metric type',
    outputTitle: 'Metric',
    featureDetailTooltipContent: 'The current metric being displayed',
    featureTitle: 'Metric',
  },
};

interface FeatureComparisonHeaderPanelProps {
  readonly loading: boolean;
  readonly error: ApolloError | undefined;
  readonly featureBasicData: FeatureBasicData;
}

const SKELETON_WIDGET_COUNT = 6;
export const FeatureComparisonHeaderPanel: React.FC<FeatureComparisonHeaderPanelProps> = ({
  loading,
  error,
  featureBasicData,
}) => {
  const { resourceTexts } = useResourceText(PAGE_TEXTS);
  const { classes: styles, cx } = useFeatureHeaderPanelViewStyles();
  const { classes: stylesFeature } = useFeatureWidgetStyles();
  const { modelId } = usePageTypeWithParams();

  const { onChange: onChangeSegments, selectedSegment } = useSelectedSegments();
  const { renderFilter } = useSegmentFilter({ onChange: onChangeSegments, resourceId: modelId, selectedSegment });
  const showError = error || (!featureBasicData.isValid && !featureBasicData.loading);

  const renderActionFeatureBasicWidget = () => (
    <div className={styles.adHoc} id="segment-compare-widget">
      <FeatureControlWidget title="Segment comparison" tooltipContent={resourceTexts.featureDetailTooltipContent}>
        <div className={styles.flexRow}>
          <WhyLabsText
            inherit
            className={cx(stylesFeature.heroText, stylesFeature.lengthRestricted, styles.comboWidgetText)}
          >
            {simpleStringifySegment({ tags: selectedSegment })}
          </WhyLabsText>
        </div>
      </FeatureControlWidget>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <WhyLabsTooltip label={resourceTexts.segmentCompareSelect}>
          {renderFilter({
            label: resourceTexts.segmentCompareSelect,
          })}
        </WhyLabsTooltip>
      </div>
    </div>
  );
  const renderWidgets = () => {
    if (loading || featureBasicData.loading) {
      return (
        <>
          {Array(SKELETON_WIDGET_COUNT)
            .fill(0)
            .map((_val, index) => {
              const rowKey = `feature-comparison-skeleton-widget-${index}`;
              return <SkeletonFeatureWidget key={rowKey} index={index} />;
            })}
          <HeaderEmptyFillWidget />
        </>
      );
    }

    if (showError) {
      return <FeatureWidget hero="Invalid Data" title={resourceTexts.errorMessage} />;
    }

    return (
      <>
        <FeatureWidget
          title={resourceTexts.featureTitle}
          tooltipContent={resourceTexts.featureDetailTooltipContent}
          hero={featureBasicData.name}
        />
        {renderActionFeatureBasicWidget()}
        <FeatureWidget
          title="Inferred data type"
          tooltipContent={resourceTexts.infFeatureTypeTooltip}
          hero={featureBasicData.inferredDataType.toLowerCase()}
          capitalized
        />

        <BatchFrequencyWidget />

        <ProfileLineageWidget />

        <FeatureWidget
          title="Batches in range"
          tooltipContent={resourceTexts.featureDetailPageBatchesInRangeTooltipContent}
          hero={featureBasicData.pointsInSpan.toString()}
          stretchy
        />
      </>
    );
  };

  return (
    <div className={cx(styles.root, styles.bottomBorder)}>
      <div className={styles.widgetRow}>
        {renderWidgets()}
        {showError ? <HeaderEmptyFillWidget /> : null}
      </div>
    </div>
  );
};
