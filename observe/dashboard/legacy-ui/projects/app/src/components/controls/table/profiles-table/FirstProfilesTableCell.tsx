import { createStyles } from '@mantine/core';
import { BarChart, Bar } from 'recharts';
import { InlineHistogram } from 'components/visualizations/inline-histogram';
import { HistogramFieldsFragment } from 'generated/graphql';
import {
  generateCommonXAxis,
  generateCommonYAxis,
  HistogramDomain,
} from 'components/visualizations/inline-histogram/histogramUtils';
import { Colors, stringMax } from '@whylabs/observatory-lib';
import { WhyLabsButton, WhyLabsText, WhyLabsTooltip } from 'components/design-system';
import useProfilesTableCSS from './useProfilesTableCSS';
import { TableFeatureData, TableFeatureDataType } from './types';

interface FirstProfilesTableCellProps {
  featureNameKey: string;
  featureValuesForEachProfile: TableFeatureDataType[];
  onClickHandler: () => void;
  chartWidth: number;
  rowPerProfileHeight: number;
  showUnifiedBins: boolean;
  unifiedBinsLoading: boolean;
}

interface CellViewStylesObject {
  cellFeatureRow: string;
  cellFeatureRowLeft: string;
  cellFeatureLabel: string;
  notShownText: string;
}
interface CellViewProps {
  height: number;
  profileColor: string;
  profileIndex: number;
  noData?: boolean;
  cellContent?: JSX.Element;
  styles: CellViewStylesObject;
}

function CellView({ noData, height, profileColor, profileIndex, cellContent, styles }: CellViewProps) {
  if (noData)
    return (
      <div style={{ height }} className={styles.cellFeatureRow}>
        <WhyLabsText inherit className={styles.cellFeatureRowLeft}>
          <span className={styles.cellFeatureLabel} style={{ backgroundColor: profileColor }} />P{profileIndex}
        </WhyLabsText>
        <span style={{ margin: 'auto auto' }} className={styles.notShownText}>
          Data not found
        </span>
      </div>
    );

  return (
    <div className={styles.cellFeatureRow}>
      <WhyLabsText inherit className={styles.cellFeatureRowLeft}>
        <span className={styles.cellFeatureLabel} style={{ backgroundColor: profileColor }} />P{profileIndex}
      </WhyLabsText>
      {cellContent}
    </div>
  );
}

type NameTextProps = {
  featureName: string;
  styleClass: string;
};
function NameText({ featureName, styleClass }: NameTextProps): JSX.Element {
  const displayedName = stringMax(featureName, 30);
  if (displayedName === featureName) {
    return (
      <WhyLabsText inherit className={styleClass}>
        {displayedName}
      </WhyLabsText>
    );
  }
  return (
    <WhyLabsTooltip label={featureName}>
      <WhyLabsText inherit className={styleClass}>
        {displayedName}
      </WhyLabsText>
    </WhyLabsTooltip>
  );
}

const useStyles = createStyles({
  dataUnavailable: {
    margin: 'auto',
    display: 'flex',
    alignItems: 'end',
  },
  dataNotShownText: {
    fontSize: '12px',
    fontFamily: 'Inconsolata',
    color: Colors.grey,
    fontStyle: 'italic',
  },
});

export default function FirstProfilesTableCell({
  featureNameKey,
  onClickHandler,
  featureValuesForEachProfile,
  chartWidth,
  rowPerProfileHeight,
  showUnifiedBins,
  unifiedBinsLoading,
}: FirstProfilesTableCellProps): JSX.Element {
  const { classes: styles, cx } = useProfilesTableCSS();
  const { classes: cellStyles } = useStyles();

  function getInlineHistogram(
    featuresProfile: TableFeatureData,
    name: string,
    commonXDomain: HistogramDomain,
    commonYRange: HistogramDomain,
  ) {
    const histogram = featuresProfile.numberSummary && featuresProfile.numberSummary.histogram;
    const unifiedHistogram =
      featuresProfile.featurePanelData.unifiedHistograms?.histograms &&
      featuresProfile.featurePanelData.unifiedHistograms.histograms.get(featureNameKey);

    if (unifiedBinsLoading) return <p className={styles.loadingText}>Loading...</p>;

    return (
      <InlineHistogram
        graphWidth={chartWidth}
        graphHeight={rowPerProfileHeight}
        histogram={showUnifiedBins ? unifiedHistogram : histogram}
        name={name}
        color={featuresProfile.profileColor}
        graphVerticalBuffer={0}
        histogramDomain={commonXDomain}
        histogramRange={commonYRange}
      />
    );
  }

  // TODO: Rename according to chart name
  function getFrequentItemsChart(featuresProfile: TableFeatureData) {
    if (!featuresProfile || !featuresProfile.chartData?.length) {
      return (
        <p className={cx(cellStyles.dataUnavailable, cellStyles.dataNotShownText)}>Frequent items data unavailable</p>
      );
    }
    return (
      <BarChart
        width={chartWidth}
        height={rowPerProfileHeight}
        data={featuresProfile.chartData}
        barCategoryGap={0.5}
        barGap={0.5}
      >
        <Bar dataKey="axisY" fill={featuresProfile.profileColor} isAnimationActive={false} />
      </BarChart>
    );
  }

  function getCommonXDomain(): HistogramDomain {
    return generateCommonXAxis(
      featureValuesForEachProfile.reduce((acc, curr) => {
        if (curr && curr.numberSummary?.histogram) acc.push(curr.numberSummary.histogram);

        return acc;
      }, [] as HistogramFieldsFragment[]),
    );
  }

  function getCommonYRange(allUnifiedHistograms: (HistogramFieldsFragment | undefined)[]): HistogramDomain {
    if (showUnifiedBins)
      return generateCommonYAxis(
        allUnifiedHistograms.filter((histogram): histogram is HistogramFieldsFragment => !!histogram),
      );

    return generateCommonYAxis(
      featureValuesForEachProfile.reduce((acc, curr) => {
        if (curr && curr.numberSummary?.histogram) acc.push(curr.numberSummary.histogram);

        return acc;
      }, [] as HistogramFieldsFragment[]),
    );
  }

  return (
    <>
      <div className={styles.cellHeader}>
        <NameText featureName={featureNameKey} styleClass={styles.cellFeatureName} />
        <WhyLabsTooltip label="Click to open detailed view">
          <WhyLabsButton
            className={cx(styles.button, styles.featurePanelButton)}
            variant="outline"
            onClick={onClickHandler}
            id="view-details-button"
            color="gray"
            type="button"
          >
            <WhyLabsText inherit className={styles.buttonText}>
              View details
            </WhyLabsText>
          </WhyLabsButton>
        </WhyLabsTooltip>
      </div>
      <div className={styles.cellFeatureContent}>
        {featureValuesForEachProfile.map((featuresProfile: TableFeatureDataType, profileItemIndex: number) => {
          if (!featuresProfile)
            return (
              <CellView
                // eslint-disable-next-line
                key={`${profileItemIndex}`}
                height={rowPerProfileHeight}
                profileColor={Colors.profilesColorPool[profileItemIndex]}
                profileIndex={profileItemIndex + 1}
                noData
                styles={styles}
              />
            );

          const allUnifiedHistogramsForSpecificFeature = featureValuesForEachProfile.map((profile) => {
            if (!profile) return undefined;

            return profile.featurePanelData.unifiedHistograms?.histograms.get(featureNameKey);
          });
          const isDiscrete = featuresProfile['inferred-discretion'].toLowerCase() === 'discrete';
          const commonXDomain = getCommonXDomain();
          const commonYRange = getCommonYRange(allUnifiedHistogramsForSpecificFeature);

          return (
            <CellView
              // eslint-disable-next-line
              key={`chart-key-${profileItemIndex}-${featuresProfile['feature-name']}`}
              height={rowPerProfileHeight}
              profileColor={featuresProfile.profileColor}
              profileIndex={profileItemIndex + 1}
              cellContent={
                isDiscrete
                  ? getFrequentItemsChart(featuresProfile)
                  : getInlineHistogram(
                      featuresProfile,
                      `${featuresProfile['feature-name']}-${profileItemIndex}`,
                      commonXDomain,
                      commonYRange,
                    )
              }
              styles={styles}
            />
          );
        })}
      </div>
    </>
  );
}
