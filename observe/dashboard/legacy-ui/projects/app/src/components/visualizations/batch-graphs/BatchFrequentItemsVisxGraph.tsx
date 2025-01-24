import { FrequentItemsFieldsFragment } from 'generated/graphql';
import { scaleBand, scaleLinear } from '@visx/scale';
import { useMemo } from 'react';
import { Group } from '@visx/group';
import { useDeepCompareMemo } from 'use-deep-compare';
import { useDisclosure } from '@mantine/hooks';
import { Bar } from '@visx/shape';
import { Colors, stringMax } from '@whylabs/observatory-lib';
import { AxisBottom } from '@visx/axis';
import { createStyles } from '@mantine/core';
import { useTooltip, defaultStyles, TooltipWithBounds } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { WhyLabsTypography } from 'components/design-system';
import {
  GraphDatum,
  LEGEND_HEIGHT,
  createGraphDataMap,
  dropShadowStyle,
  filterDatumToTopTenAndOther,
} from './batchUtils';
import { BatchLeftAxis } from './BatchLeftAxis';
import { BatchLegend } from './BatchLegend';

interface BatchFrequentItemsVisxGraphProps {
  batchFrequentItems?: FrequentItemsFieldsFragment;
  batchDisplayName?: string;
  referenceFrequentItems?: FrequentItemsFieldsFragment;
  referenceDisplayName?: string;
  graphHeight: number;
  graphWidth: number;
  graphVerticalBuffer: number;
  graphHorizontalBuffer: number;
  loading: boolean;
  noDataImageUrl?: string;
}

type StylesProps = Pick<
  BatchFrequentItemsVisxGraphProps,
  'graphHeight' | 'graphWidth' | 'graphVerticalBuffer' | 'graphHorizontalBuffer'
>;

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
    hiddenTextGroup: {
      opacity: 0.7,
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
    hoverBar: {
      fill: Colors.transparent,
      '&:hover': {
        fill: Colors.chartHoverBackground,
        opacity: 0.5,
      },
    },
    rightSpace: {
      marginRight: 6,
    },
    leftSpace: {
      marginLeft: 6,
    },
  }),
);

export const BatchFrequentItemsVisxGraph: React.FC<BatchFrequentItemsVisxGraphProps> = ({
  batchFrequentItems,
  batchDisplayName,
  referenceFrequentItems,
  referenceDisplayName,
  graphHeight,
  graphWidth,
  graphVerticalBuffer,
  graphHorizontalBuffer,
  loading,
  noDataImageUrl,
}) => {
  const { classes } = useStyles({ graphHeight, graphWidth, graphVerticalBuffer, graphHorizontalBuffer });
  const batchFieldName = batchDisplayName || 'Selected profile';
  const referenceFieldName = referenceDisplayName || 'Reference profile';
  const [batchVisible, { toggle: toggleBatch }] = useDisclosure(true);
  const [referenceVisible, { toggle: toggleReference }] = useDisclosure(true);

  const batchData = createGraphDataMap(batchFrequentItems);
  const { tooltipData, tooltipLeft, tooltipTop, tooltipOpen, showTooltip, hideTooltip } = useTooltip<GraphDatum>();

  const referenceData = createGraphDataMap(referenceFrequentItems);
  referenceData.forEach((item) => {
    const batchItem = batchData.find((i) => i.name === item.name);
    if (batchItem) {
      batchItem.referenceCount = item.batchCount;
    } else {
      batchData.push({ name: item.name, referenceCount: item.batchCount });
    }
  });
  const hasReferenceData = referenceData.length > 0;
  const filteredBatchData = filterDatumToTopTenAndOther(batchData);
  const nameData = filteredBatchData.map((item) => item.name);
  // const barSize = Math.min(filteredBatchData.length ? graphWidth / filteredBatchData.length : 0, DEFAULT_BAR_WIDTH);

  const graphYMax = useDeepCompareMemo(() => {
    return (
      Math.max(
        ...filteredBatchData.map((item) => (batchVisible ? item.batchCount ?? 0 : 0)),
        ...filteredBatchData.map((item) => (referenceVisible ? item.referenceCount ?? 0 : 0)),
      ) * 1.1
    );
  }, [filteredBatchData, batchVisible, referenceVisible]);

  // Using deep comparison because `nameData` is an array that will be recreated on every render
  const xScale = useDeepCompareMemo(() => {
    return scaleBand({
      domain: nameData,
      range: [graphHorizontalBuffer * 2, graphWidth - graphHorizontalBuffer * 2],
      paddingOuter: 0,
      paddingInner: 0.02,
    });
  }, [nameData, graphHorizontalBuffer, graphWidth]);

  const yScale = useMemo(
    () =>
      scaleLinear<number>({
        range: [graphHeight - graphVerticalBuffer * 1.5 - LEGEND_HEIGHT, graphVerticalBuffer * 2],
        round: true,
        domain: [0, graphYMax],
      }),
    [graphHeight, graphVerticalBuffer, graphYMax],
  );

  const yRangeMax = Math.max(...yScale.range());
  const yRangeMin = Math.min(...yScale.range());

  const renderHoverBars = () => {
    return filteredBatchData.map((datum) => {
      const barHeight = yRangeMax - yRangeMin;
      const barWidth = xScale.bandwidth();
      const barY = yRangeMin;
      const barX = xScale(datum.name) ?? 0;
      return (
        <Bar
          key={`hover-bar-${datum.name}`}
          className={classes.hoverBar}
          x={barX}
          y={barY}
          width={barWidth}
          height={barHeight}
          onMouseMove={(event) => {
            const { x, y } = localPoint(event) ?? { x: 0, y: 0 };
            showTooltip({
              tooltipData: datum,
              tooltipLeft: x,
              tooltipTop: y,
            });
          }}
        />
      );
    });
  };

  const renderProfileBars = () => {
    return filteredBatchData.map((datum) => {
      const barHeight = yRangeMax - yScale(datum.batchCount ?? 0);
      const barWidth = xScale.bandwidth();
      const barY = yRangeMax - barHeight;
      const barX = xScale(datum.name) ?? 0;
      const opacity = hasReferenceData ? 0.8 : 1;
      return (
        <Bar
          key={`batch-bar-${datum.name}`}
          x={barX}
          y={barY}
          width={barWidth}
          height={barHeight}
          fill={Colors.chartAqua}
          stroke={Colors.secondaryLight700}
          strokeOpacity={opacity}
          opacity={opacity}
        />
      );
    });
  };

  const renderReferenceBars = () => {
    if (!hasReferenceData) {
      return null;
    }
    return filteredBatchData.map((datum) => {
      const barHeight = yRangeMax - yScale(datum.referenceCount ?? 0);
      const barWidth = xScale.bandwidth();
      const barY = yRangeMax - barHeight;
      const barX = xScale(datum.name) ?? 0;
      const opacity = hasReferenceData ? 0.8 : 1;
      return (
        <Bar
          key={`reference-bar-${datum.name}`}
          x={barX}
          y={barY}
          width={barWidth}
          height={barHeight}
          fill={Colors.chartOrange}
          stroke={Colors.secondaryLight700}
          strokeOpacity={opacity}
          opacity={opacity}
        />
      );
    });
  };

  const renderTooltip = () => {
    if (!tooltipOpen || !tooltipData) {
      return null;
    }
    const { name, batchCount, referenceCount } = tooltipData;

    return (
      <div className={classes.tooltipHolder}>
        <TooltipWithBounds top={tooltipTop} left={tooltipLeft} style={{ ...defaultStyles, ...dropShadowStyle }}>
          <div className={classes.tooltipStack}>
            <WhyLabsTypography className={classes.tooltipHeadline}>{`${name}:`}</WhyLabsTypography>
            <div className={classes.tooltipRow}>
              <div className={classes.textGroup}>
                <div className={classes.littleBox} style={{ backgroundColor: Colors.chartAqua }} />
                <WhyLabsTypography className={classes.tooltipText}>{`${batchFieldName}: `}</WhyLabsTypography>
              </div>
              <WhyLabsTypography className={classes.tooltipText}>{`${batchCount ?? 0}`}</WhyLabsTypography>
            </div>
            {hasReferenceData && (
              <div className={classes.tooltipRow}>
                <div className={classes.textGroup}>
                  <div className={classes.littleBox} style={{ backgroundColor: Colors.chartOrange }} />
                  <WhyLabsTypography className={classes.tooltipText}>{`${referenceFieldName}: `}</WhyLabsTypography>
                </div>
                <WhyLabsTypography className={classes.tooltipText}>{`${referenceCount ?? 0}`}</WhyLabsTypography>
              </div>
            )}
          </div>
        </TooltipWithBounds>
      </div>
    );
  };

  const renderLegend = () => {
    return (
      <BatchLegend
        batchFieldName={batchFieldName}
        referenceFieldName={referenceFieldName}
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
              tickFormat={(value) => stringMax(value, 7)}
              tickStroke={Colors.transparent}
              tickLength={2}
              numTicks={4}
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

  return filteredBatchData.length === 0 || loading ? renderNoDataImage() : renderGraph();
};
