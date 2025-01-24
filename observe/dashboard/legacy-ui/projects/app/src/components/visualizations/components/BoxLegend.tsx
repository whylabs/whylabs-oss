import { useMemo } from 'react';
import { LegendOrdinal, LegendItem, LegendLabel } from '@visx/legend';
import { scaleOrdinal } from '@visx/scale';
import { ScaleOrdinal } from 'd3-scale';
import { HoverAction, HoverState } from 'hooks/useHover';
import { createStyles } from '@mantine/core';
import { LEGEND_HEIGHT } from 'ui/constants';
import { LabelItem } from 'types/graphTypes';
import { useCommonStyles } from 'hooks/useCommonStyles';
import { stringMax, HtmlTooltip, Colors } from '@whylabs/observatory-lib';
import { WhyLabsText } from 'components/design-system';
import { upperCaseFirstLetterOnly } from 'utils/stringUtils';
import { LegendShape, renderLegendItem } from '../vizutils/shapeUtils';

const useStyles = createStyles((theme) => ({
  square: {
    height: '12px',
    width: '12px',
    margin: theme.spacing.sm,
  },
  legend: {
    backgroundColor: Colors.white,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xs,
    marginLeft: theme.spacing.xs,
    marginBottom: 0,
    height: LEGEND_HEIGHT,
  },
  legendItemContainer: {
    border: `1px solid ${Colors.white}`,
    transition: 'all .2s ease-in-out',
  },
  hover: {
    borderColor: `${Colors.grey}33`,
    transform: 'scale(1.05)',
  },
  text: {
    color: Colors.brandSecondary900,
    fontSize: '12px',
    fontFamily: 'Asap, sans-serif',
  },
  hidden: {
    opacity: 0.54,
  },
}));

interface BoxLegendProps {
  name: string;
  colorScale: ScaleOrdinal<string, string>;
  hoverState?: HoverState;
  hoverDispatch?: React.Dispatch<HoverAction>;
  onClick?: (label: LabelItem) => void;
  shape?: LegendShape;
  shapeScale?: ScaleOrdinal<string, LegendShape>;
  omittedLegendItems?: string[];
  hiddenLegendItems?: string[];
  capitalize?: boolean;
}

const BoxLegend: React.FC<BoxLegendProps> = ({
  name,
  colorScale,
  hoverState,
  hoverDispatch,
  onClick,
  shape,
  shapeScale,
  omittedLegendItems,
  hiddenLegendItems,
  capitalize = true,
}) => {
  const { classes: styles, cx } = useStyles();
  const { classes: commonStyles } = useCommonStyles();
  const usedShapeScale = useMemo(() => {
    if (shapeScale) {
      return shapeScale;
    }
    const domain = [...colorScale.domain()];
    const range: LegendShape[] = shape ? [shape] : ['box'];
    return scaleOrdinal<string, LegendShape>({ domain, range });
  }, [colorScale, shapeScale, shape]);

  return (
    <LegendOrdinal scale={colorScale} direction="row">
      {(labels) => (
        <div className={styles.legend}>
          {labels.map((label, i) => {
            if (omittedLegendItems?.includes(label.datum)) return null;
            const boxKey = `box-${name}-${label.datum}-${i}`;
            const truncatedLabel = stringMax(label.text, 32);
            return (
              <div
                key={boxKey}
                className={cx(
                  styles.legendItemContainer,
                  hoverState && hoverState[boxKey] ? styles.hover : '',
                  hoverDispatch ? commonStyles.clickity : '',
                )}
                onMouseEnter={() => {
                  if (hoverDispatch) {
                    hoverDispatch({ type: 'add', value: boxKey });
                  }
                }}
                onMouseLeave={() => {
                  if (hoverDispatch) {
                    hoverDispatch({ type: 'remove', value: boxKey });
                  }
                }}
              >
                <LegendItem
                  key={`legend-${name}-${label}`}
                  margin="0 5px"
                  className={`${hiddenLegendItems?.includes(label.datum) ? styles.hidden : ''}`}
                  onClick={() => {
                    if (onClick) {
                      onClick(label);
                    }
                  }}
                >
                  {renderLegendItem(label.value as string, label.text, usedShapeScale, shape)}
                  <LegendLabel align="left" margin="0 0 0 4px">
                    <WhyLabsText inherit className={styles.text}>
                      {capitalize ? upperCaseFirstLetterOnly(truncatedLabel) : truncatedLabel}
                    </WhyLabsText>
                  </LegendLabel>
                </LegendItem>
              </div>
            );
          })}
          {hoverDispatch && <HtmlTooltip topOffset="-10px" tooltipContent="Click legend to toggle chart visibility" />}
        </div>
      )}
    </LegendOrdinal>
  );
};

export default BoxLegend;
