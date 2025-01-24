import { useEffect, useMemo, useRef, useState } from 'react';
import { createStyles, makeStyles } from '@material-ui/core';
import { Colors } from '@whylabs/observatory-lib';
import { MouseBounds } from 'types/genericTypes';

interface TooltipProps {
  element: Element | null;
  hover?: MouseBounds;
  minWidth?: number | null;
}

export const useStyles = makeStyles(() =>
  createStyles({
    tooltip: {
      zIndex: 1,
      position: 'absolute',
      backgroundColor: 'white',
      border: '1px solid',
      borderColor: Colors.secondaryLight1000,
      borderRadius: '3px',
      fontFamily: 'Asap',
      padding: '12px 10px 10px 10px',
      color: Colors.brandSecondary900,
      fontSize: 12,
    },
  }),
);

export const useHoverBounds = (
  element: Element | null,
  hover?: MouseBounds,
): [DOMRect | undefined, DOMRect | undefined] => {
  const [elementBounds, setElementBounds] = useState<DOMRect | undefined>(element?.getBoundingClientRect());
  const [bodyBounds, setBodyBounds] = useState<DOMRect | undefined>(document.body.getBoundingClientRect());
  const hovering = hover !== undefined;
  useEffect(() => {
    // These are expensive calls. Lets make sure we run it as infrequently as possible
    // These only need to update if the chart changes its position relative to the top-left of the page
    setElementBounds(element?.getBoundingClientRect());
    setBodyBounds(document.body.getBoundingClientRect());
  }, [element, hovering]);
  return [elementBounds, bodyBounds];
};

export const GenericTooltip: React.FC<TooltipProps> = (props) => {
  // Place this component as a child of the same enclosing <div style={{position: relative}}> as the chart element
  // mouseX and mouseY are expected to be provided relative to the SVG element
  const styles = useStyles();
  const { element, hover, minWidth, children } = props;
  const tooltip = useRef<HTMLDivElement | null>(null);
  const [tooltipBiggestWidth, setTooltipBiggestWidth] = useState<number>(250);
  const [tooltipBiggestHeight, setTooltipBiggestHeight] = useState<number>(0);
  const [elementBounds, bodyBounds] = useHoverBounds(element, hover);

  useMemo(() => {
    if (hover) {
      const bounds = tooltip?.current?.getBoundingClientRect(); // This is an expensive call
      if (bounds && bounds.width > tooltipBiggestWidth) {
        setTooltipBiggestWidth(Math.ceil(bounds.width));
      }
      if (bounds && bounds.height > tooltipBiggestHeight) {
        setTooltipBiggestHeight(Math.ceil(bounds.height));
      }
    }
    return undefined;
  }, [tooltipBiggestWidth, tooltipBiggestHeight, hover]);

  const flipPadding = 0;

  const tooltipPosition = useMemo(() => {
    if (hover) {
      const biggestWidth = Math.max(tooltipBiggestWidth ?? 0, minWidth ?? 0);
      const x = hover.mouseX;
      const y = hover.mouseY;
      const horizontalFlip =
        hover &&
        x !== undefined &&
        elementBounds &&
        bodyBounds &&
        x + 12 + flipPadding + biggestWidth + elementBounds.left > bodyBounds?.width;
      const verticalFlip =
        hover &&
        y !== undefined &&
        elementBounds &&
        bodyBounds &&
        y + 12 + flipPadding + tooltipBiggestHeight + elementBounds.top > bodyBounds.height;

      return {
        left: horizontalFlip ? 'initial' : x + 12,
        right: horizontalFlip && elementBounds ? elementBounds.width - x + 12 : 'initial',
        top: verticalFlip && elementBounds ? 'initial' : y + 12,
        bottom: verticalFlip && elementBounds ? elementBounds.height - y + 12 : 'initial',
      };
    }
    return {};
  }, [hover, tooltipBiggestWidth, tooltipBiggestHeight, bodyBounds, elementBounds, minWidth]);

  return (
    <div className={styles.tooltip} style={tooltipPosition} ref={tooltip}>
      {children}
    </div>
  );
};
