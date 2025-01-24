import { createStyles } from '@mantine/core';
import { scaleLinear } from '@visx/scale';
import { useDisclosure } from '@mantine/hooks';
import { HistogramFieldsFragment } from 'generated/graphql';
import { useDeepCompareMemo } from 'use-deep-compare';
import { useMemo } from 'react';

import { Colors } from '@whylabs/observatory-lib';
import { Bar } from '@visx/shape';
import { useTooltip, defaultStyles, TooltipWithBounds } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { WhyLabsTypography } from 'components/design-system';
import { Group } from '@visx/group';
import { AxisBottom } from '@visx/axis';
import { friendlyFormat } from 'utils/numberUtils';
import { format } from 'd3-format';
import { BatchLeftAxis } from './BatchLeftAxis';
import { BatchLegend } from './BatchLegend';
import { LEGEND_HEIGHT, getD3FormattingString, dropShadowStyle } from './batchUtils';
import { HistogramDomain, generateCommonYAxis } from '../inline-histogram/histogramUtils';
import { UnifiedHistogramWithMetadata } from '../OverlaidHistograms/types';

interface BatchHistogramVisxGraphProps {
  histograms: UnifiedHistogramWithMetadata[];
  histogramDomain: HistogramDomain;
  noDataImageUrl: string;
  graphVerticalBuffer: number;
  graphHorizontalBuffer: number;
  graphHeight: number;
  graphWidth: number;
}

type StylesProps = Pick<
  BatchHistogramVisxGraphProps,
  'graphHeight' | 'graphWidth' | 'graphVerticalBuffer' | 'graphHorizontalBuffer'
>;

interface TooltipDatum {
  binStart: number;
  binEnd: number;
  batchCount: number;
  batchDisplayName: string;
  referenceCount: number | null;
  referenceDisplayName: string | null;
}

const PROFILE_HISTOGRAM_NUMBER = 1;
const REFERENCE_HISTOGRAM_NUMBER = 2;
const SIMPLIFIED_END_LENGTH = 5;

const useStyles = createStyles(
  (_, { graphHeight, graphWidth, graphVerticalBuffer, graphHorizontalBuffer }: StylesProps) => ({
    imageHolder: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: graphHeight,
      width: graphWidth,
      padding: `${graphVerticalBuffer}px ${graphHorizontalBuffer}px`,
    },
    graphHolder: {
      display: 'flex',
      flexDirection: 'column',
      height: graphHeight,
      padding: 0,
    },
    hoverBar: {
      fill: Colors.transparent,
      '&:hover': {
        fill: Colors.chartHoverBackground,
        opacity: 0.5,
      },
    },
    tooltipText: {
      fontSize: 12,
      fontFamily: 'Asap',
      color: Colors.brandSecondary900,
    },
    littleBox: {
      height: 10,
      width: 10,
      marginRight: 6,
      alignSelf: 'center',
    },
    tooltipHolder: {
      padding: '6px',
    },
    tooltipRow: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    tooltipStack: {
      display: 'flex',
      flexDirection: 'column',
    },
    tooltipHeadline: {
      fontWeight: 600,
      fontSize: 12,
      fontFamily: 'Asap',
      color: Colors.brandSecondary900,
    },
    textGroup: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'flex-start',
      marginRight: 6,
    },
  }),
);

export const BatchHistogramVisxGraph: React.FC<BatchHistogramVisxGraphProps> = ({
  histograms,
  histogramDomain,
  noDataImageUrl,
  graphVerticalBuffer,
  graphHorizontalBuffer,
  graphHeight,
  graphWidth,
}) => {
  const { classes } = useStyles({ graphHeight, graphWidth, graphVerticalBuffer, graphHorizontalBuffer });
  const [batchVisible, { toggle: toggleBatch }] = useDisclosure(true);
  const [referenceVisible, { toggle: toggleReference }] = useDisclosure(true);
  const { tooltipData, tooltipLeft, tooltipTop, tooltipOpen, showTooltip, hideTooltip } = useTooltip<TooltipDatum>();

  const commonYAxis = useDeepCompareMemo(() => {
    return generateCommonYAxis(
      histograms.reduce((acc, curr) => {
        if (curr.profileNum === 1 && !batchVisible) return acc;
        if (curr.profileNum === 2 && !referenceVisible) return acc;
        if (curr.data) return acc.concat(curr.data);
        return acc;
      }, [] as HistogramFieldsFragment[]),
    );
  }, [histograms, batchVisible, referenceVisible]);

  const yScale = useMemo(() => {
    return scaleLinear<number>({
      range: [graphHeight - graphVerticalBuffer * 1.5 - LEGEND_HEIGHT, graphVerticalBuffer * 2],
      round: true,
      domain: [commonYAxis.min, commonYAxis.max],
    });
  }, [commonYAxis.min, commonYAxis.max, graphHeight, graphVerticalBuffer]);

  const xScale = useMemo(() => {
    return scaleLinear<number>({
      range: [graphHorizontalBuffer, graphWidth - graphHorizontalBuffer * 2],
      round: true,
      domain: [histogramDomain.min, histogramDomain.max],
    });
  }, [histogramDomain.min, histogramDomain.max, graphWidth, graphHorizontalBuffer]);

  const yRangeMax = Math.max(...yScale.range());
  const yRangeMin = Math.min(...yScale.range());
  const hasReferenceData = histograms.some((histogram) => histogram.profileNum === REFERENCE_HISTOGRAM_NUMBER);
  const batchDisplayName =
    histograms.find((histogram) => histogram.profileNum === PROFILE_HISTOGRAM_NUMBER)?.profileName ?? 'Profile';
  const referenceDisplayName = hasReferenceData
    ? histograms.find((histogram) => histogram.profileNum === REFERENCE_HISTOGRAM_NUMBER)?.profileName ?? 'Baseline'
    : null;
  const formattingString = getD3FormattingString(xScale);
  /**
   * Removes last bin since the last bin is only used to determine where the last edge is.
   */
  function prepareBinsForRender(bins: number[]) {
    return [...bins].slice(0, bins.length - 1);
  }

  const commonBinEdges = histograms.find((histogram) => histogram.profileNum === PROFILE_HISTOGRAM_NUMBER)?.data?.bins;
  const commonBarBounds = useDeepCompareMemo(() => {
    if (!commonBinEdges || !commonBinEdges.length) return [];
    const renderBins = prepareBinsForRender(commonBinEdges);
    return renderBins.map((bin, index) => {
      const barX = xScale(renderBins[index]) ?? 0;
      const barXEnd = index < renderBins.length - 1 ? xScale(renderBins[index + 1]) : barX + SIMPLIFIED_END_LENGTH;
      return {
        start: barX,
        end: barXEnd,
      };
    });
  }, [commonBinEdges, xScale]);

  const renderHoverBars = () => {
    const profileData = histograms.find((histogram) => histogram.profileNum === PROFILE_HISTOGRAM_NUMBER);
    const referenceData = histograms.find((histogram) => histogram.profileNum === REFERENCE_HISTOGRAM_NUMBER);

    if (!commonBarBounds || !commonBarBounds.length || !commonBinEdges || !commonBinEdges.length) return null;
    if (!profileData?.data?.bins.length || !profileData.data.counts.length) return null;
    if (hasReferenceData && (!referenceData?.data?.bins.length || !referenceData.data.counts.length)) return null;

    const renderBins = prepareBinsForRender(commonBinEdges);
    return renderBins.map((bin, index) => {
      const barHeight = yRangeMax - yRangeMin;
      const barY = yRangeMin;
      const barBounds = commonBarBounds[index];
      return (
        <Bar
          key={`hover-bar-${bin}`}
          className={classes.hoverBar}
          x={barBounds.start}
          y={barY}
          width={barBounds.end - barBounds.start}
          height={barHeight}
          onMouseMove={(event) => {
            const { x, y } = localPoint(event) ?? { x: 0, y: 0 };
            showTooltip({
              tooltipData: {
                binStart: renderBins[index],
                binEnd:
                  index < renderBins.length - 1 ? renderBins[index + 1] : commonBinEdges[commonBinEdges.length - 1],
                batchCount: profileData?.data?.counts[index] ?? 0,
                batchDisplayName,
                referenceCount: hasReferenceData ? referenceData?.data?.counts[index] ?? 0 : null,
                referenceDisplayName,
              },
              tooltipLeft: x,
              tooltipTop: y,
            });
          }}
        />
      );
    });
  };

  const renderBarSet = (histogramIndex: number, hasOtherData: boolean) => {
    const profileData = histograms.find((histogram) => histogram.profileNum === histogramIndex);
    if (
      !profileData?.data ||
      !commonBinEdges ||
      commonBinEdges.length === 0 ||
      !commonBarBounds ||
      !commonBarBounds.length
    )
      return null;

    const renderBins = prepareBinsForRender(commonBinEdges);
    const { counts } = profileData.data;
    const opacity = hasOtherData ? 0.65 : 1;
    return renderBins.map((_, index) => {
      const binCount = counts[index] ?? 0;
      const barHeight = yRangeMax - yScale(binCount);
      const barY = yRangeMax - barHeight;
      const barBounds = commonBarBounds[index];
      return (
        <Bar
          key={`${profileData.profileName ?? `histogram-set-${profileData.profileNum}`}-bar-${renderBins[index]}`}
          x={barBounds.start}
          y={barY}
          width={barBounds.end - barBounds.start}
          height={barHeight}
          fill={profileData.color}
          fillOpacity={opacity}
          stroke={Colors.secondaryLight700}
          strokeOpacity={1.0}
        />
      );
    });
  };

  const renderProfileBars = () => {
    // The profile bars (rendered underneath) are always full opacity.
    return <>{renderBarSet(PROFILE_HISTOGRAM_NUMBER, false)}</>;
  };
  const renderReferenceBars = () => {
    const hasOtherData = batchVisible;
    return <>{renderBarSet(REFERENCE_HISTOGRAM_NUMBER, hasOtherData)}</>;
  };

  const renderLegend = () => {
    return (
      <BatchLegend
        batchFieldName={batchDisplayName}
        referenceFieldName={referenceDisplayName ?? ''}
        textStyle={classes.tooltipText}
        colorBoxStyle={classes.littleBox}
        toggleBatch={toggleBatch}
        toggleReference={toggleReference}
        hasReferenceData={hasReferenceData}
        batchVisible={batchVisible}
        referenceVisible={referenceVisible}
      />
    );
  };

  const renderTooltip = () => {
    if (!tooltipOpen || !tooltipData) {
      return null;
    }
    const { binStart, binEnd, batchCount, referenceCount } = tooltipData;

    return (
      <div className={classes.tooltipHolder}>
        <TooltipWithBounds top={tooltipTop} left={tooltipLeft} style={{ ...defaultStyles, ...dropShadowStyle }}>
          <div className={classes.tooltipStack}>
            <WhyLabsTypography className={classes.tooltipHeadline}>Bin edges</WhyLabsTypography>
            <div className={classes.tooltipRow}>
              <WhyLabsTypography className={classes.tooltipText}>Start:</WhyLabsTypography>
              <WhyLabsTypography className={classes.tooltipText}>{`${friendlyFormat(binStart, 2)}`}</WhyLabsTypography>
            </div>
            <div className={classes.tooltipRow}>
              <WhyLabsTypography className={classes.tooltipText}>End:</WhyLabsTypography>
              <WhyLabsTypography className={classes.tooltipText}>{`${friendlyFormat(binEnd, 2)}`}</WhyLabsTypography>
            </div>

            <WhyLabsTypography className={classes.tooltipHeadline}>Counts this bin</WhyLabsTypography>
            <div className={classes.tooltipRow}>
              <div className={classes.textGroup}>
                <div className={classes.littleBox} style={{ backgroundColor: Colors.chartAqua }} />
                <WhyLabsTypography className={classes.tooltipText}>{`${batchDisplayName}: `}</WhyLabsTypography>
              </div>
              <WhyLabsTypography className={classes.tooltipText}>{`${batchCount ?? 0}`}</WhyLabsTypography>
            </div>
            {hasReferenceData && (
              <div className={classes.tooltipRow}>
                <div className={classes.textGroup}>
                  <div className={classes.littleBox} style={{ backgroundColor: Colors.chartOrange }} />
                  <WhyLabsTypography className={classes.tooltipText}>{`${referenceDisplayName}: `}</WhyLabsTypography>
                </div>
                <WhyLabsTypography className={classes.tooltipText}>{`${referenceCount ?? 0}`}</WhyLabsTypography>
              </div>
            )}
          </div>
        </TooltipWithBounds>
      </div>
    );
  };

  const renderNoDataImage = () => {
    return (
      <div className={classes.imageHolder}>
        <img src={noDataImageUrl} alt="Frequent item data not available" />
      </div>
    );
  };

  const renderGraph = () => (
    <div>
      <div className={classes.graphHolder}>
        <svg width={graphWidth} height={graphHeight} onMouseLeave={hideTooltip}>
          <Group top={0} left={graphHorizontalBuffer}>
            <BatchLeftAxis yScale={yScale} numTicks={4} left={xScale.range()[0]} />
            <AxisBottom
              top={yScale.range()[0]}
              scale={xScale}
              tickFormat={format(formattingString)}
              numTicks={5}
              tickStroke={Colors.transparent}
              tickLength={2}
              tickLabelProps={() => ({
                textAnchor: 'middle',
                verticalAnchor: 'middle',
                lineHeight: '1em',
                dx: 0,
                dy: '-0.5em',
                fontSize: 10,
                fontFamily: 'Asap, sans-serif',
                color: Colors.brandSecondary900,
                fill: Colors.brandSecondary900,
              })}
              stroke={Colors.brandSecondary900}
            />
            {batchVisible && renderProfileBars()}
            {referenceVisible && renderReferenceBars()}
            {renderHoverBars()}
          </Group>
        </svg>
        {renderLegend()}
      </div>
      {renderTooltip()}
    </div>
  );

  return histograms.length === 0 || !histogramDomain.isValid ? renderNoDataImage() : renderGraph();
};
